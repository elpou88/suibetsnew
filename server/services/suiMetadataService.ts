/**
 * Sui Metadata Service
 * Integration with Sui blockchain metadata and utility functions
 * 
 * Based on documentation from:
 * - https://docs.blockberry.one/reference/sui-metadata-api
 * - https://github.com/MystenLabs/walrus
 * - https://walruscan.com/testnet/home
 */

import axios from 'axios';
import { SuiClient } from '@mysten/sui.js/client';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';
import { bcs, fromB64 } from '@mysten/bcs';
import config from '../config';

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  iconUrl?: string;
  decimals: number;
  totalSupply?: string;
  website?: string;
  verified: boolean;
}

export interface NFTMetadata {
  name: string;
  description?: string;
  imageUrl?: string;
  attributes?: {
    trait_type: string;
    value: string | number;
  }[];
  collection?: {
    name: string;
    description?: string;
    imageUrl?: string;
  };
  creator?: string;
  rarity?: {
    rank?: number;
    score?: number;
  };
}

export interface SuiObjectData {
  objectId: string;
  type: string;
  owner: {
    AddressOwner?: string;
    ObjectOwner?: string;
    Shared?: { initial_shared_version: string };
    Immutable?: boolean;
  };
  previousTransaction: string;
  storageRebate: string;
  content: {
    dataType: 'moveObject';
    type: string;
    fields: Record<string, any>;
    hasPublicTransfer?: boolean;
  };
}

class SuiMetadataService {
  private provider: SuiClient;
  private apiClient: axios.AxiosInstance;
  private readonly BLOCKBERRY_API_URL: string = 'https://api.blockberry.one/v1';
  
  constructor() {
    // Initialize the SuiClient with the network from config
    const network = config.blockchain.defaultNetwork || 'mainnet';
    const networkUrl = this.getNetworkUrl(network);
    this.provider = new SuiClient({ url: networkUrl });
    
    // Create an axios client for BlockBerry API interactions
    this.apiClient = axios.create({
      baseURL: this.BLOCKBERRY_API_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }
  
  /**
   * Get the appropriate RPC URL for the selected Sui network
   * @param network The network to connect to (mainnet, testnet, devnet, localnet)
   */
  private getNetworkUrl(network: string): string {
    switch (network) {
      case 'mainnet':
        return 'https://fullnode.mainnet.sui.io:443';
      case 'testnet':
        return 'https://fullnode.testnet.sui.io:443';
      case 'devnet':
        return 'https://fullnode.devnet.sui.io:443';
      case 'localnet':
        return 'http://127.0.0.1:9000';
      default:
        return 'https://fullnode.mainnet.sui.io:443';
    }
  }
  
  /**
   * Get token metadata for a specific token type
   * @param tokenType The token type identifier (e.g., 0x2::sui::SUI)
   * @returns Token metadata
   */
  public async getTokenMetadata(tokenType: string): Promise<TokenMetadata | null> {
    try {
      // First try to get from official API
      const response = await this.apiClient.get(`/tokens/${tokenType}`);
      
      if (response.status === 200 && response.data) {
        return response.data;
      }
      
      // If no official data, try to extract from chain
      if (tokenType === SUI_TYPE_ARG) {
        // Handle SUI token natively
        return {
          name: 'Sui',
          symbol: 'SUI',
          description: 'The native token of the Sui blockchain',
          iconUrl: 'https://assets.coingecko.com/coins/images/26375/standard/sui_asset.jpeg',
          decimals: 9,
          verified: true,
          website: 'https://sui.io'
        };
      } else if (tokenType.endsWith('::SBETS') || tokenType.includes('::sbets::')) {
        // Handle SBETS token
        return {
          name: 'SuiBets',
          symbol: 'SBETS',
          description: 'The utility token for SuiBets betting platform',
          iconUrl: 'https://cryptologos.cc/logos/sui-sui-logo.png',
          decimals: 9,
          verified: true
        };
      }
      
      // For other tokens, try to infer from structure
      // This is a fallback and not as reliable
      const parts = tokenType.split('::');
      if (parts.length === 3) {
        const packageId = parts[0];
        const moduleName = parts[1];
        const structName = parts[2];
        
        try {
          // Try to fetch module info to get metadata
          const moduleInfo = await this.provider.getNormalizedMoveModule({
            package: packageId,
            module: moduleName
          });
          
          if (moduleInfo && moduleInfo.structs[structName]) {
            return {
              name: structName,
              symbol: structName.slice(0, 6),
              decimals: 9, // Assume 9 decimals as default
              verified: false
            };
          }
        } catch (error) {
          console.error(`Error fetching module info for ${tokenType}:`, error);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching token metadata for ${tokenType}:`, error);
      return null;
    }
  }
  
  /**
   * Get token balance for a specific wallet address
   * @param walletAddress The wallet address to check
   * @param tokenType The token type (e.g., 0x2::sui::SUI)
   * @returns The token balance
   */
  public async getTokenBalance(walletAddress: string, tokenType: string): Promise<{
    balance: string;
    decimals: number;
  } | null> {
    try {
      if (tokenType === SUI_TYPE_ARG || tokenType === '0x2::sui::SUI') {
        // For native SUI token
        const balance = await this.provider.getBalance({
          owner: walletAddress,
          coinType: SUI_TYPE_ARG
        });
        
        return {
          balance: balance.totalBalance,
          decimals: 9
        };
      } else {
        // For other tokens
        const coins = await this.provider.getCoins({
          owner: walletAddress,
          coinType: tokenType
        });
        
        if (coins && coins.data && coins.data.length > 0) {
          const totalBalance = coins.data.reduce(
            (acc, coin) => acc + BigInt(coin.balance),
            BigInt(0)
          );
          
          // Get metadata to get the correct decimals
          const metadata = await this.getTokenMetadata(tokenType);
          
          return {
            balance: totalBalance.toString(),
            decimals: metadata?.decimals || 9
          };
        }
        
        return {
          balance: '0',
          decimals: 9
        };
      }
    } catch (error) {
      console.error(`Error fetching balance for ${walletAddress} and ${tokenType}:`, error);
      return null;
    }
  }
  
  /**
   * Get NFT metadata for a specific NFT object
   * @param objectId The NFT object ID
   * @returns NFT metadata
   */
  public async getNFTMetadata(objectId: string): Promise<NFTMetadata | null> {
    try {
      // First try official API
      const response = await this.apiClient.get(`/nfts/${objectId}`);
      
      if (response.status === 200 && response.data) {
        return response.data;
      }
      
      // If no official data, try to extract from object directly
      const object = await this.provider.getObject({
        id: objectId,
        options: { showContent: true, showDisplay: true }
      });
      
      if (!object || !object.data) {
        return null;
      }
      
      // Try to extract display data if available
      if (object.data.display && object.data.display.data) {
        const display = object.data.display.data;
        
        return {
          name: display.name || 'Unknown NFT',
          description: display.description,
          imageUrl: display.image_url || display.img_url || display.url,
          attributes: display.attributes?.map((attr: any) => ({
            trait_type: attr.trait_type || attr.key,
            value: attr.value
          }))
        };
      }
      
      // If display is not available, try to infer from object content
      if (object.data.content && 'fields' in object.data.content) {
        const fields = object.data.content.fields;
        
        return {
          name: fields.name || fields.Name || 'Unknown NFT',
          description: fields.description || fields.Description,
          imageUrl: fields.url || fields.image_url || fields.img_url || fields.image,
          attributes: []
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching NFT metadata for ${objectId}:`, error);
      return null;
    }
  }
  
  /**
   * Get transaction details in a simplified format
   * @param txHash The transaction hash
   * @returns Transaction details
   */
  public async getTransactionDetails(txHash: string): Promise<{
    status: 'success' | 'failure' | 'pending';
    timestamp?: number;
    sender?: string;
    gas?: string;
    events?: any[];
    transfers?: Array<{
      from: string;
      to: string;
      amount: string;
      tokenType: string;
    }>;
  }> {
    try {
      const txData = await this.provider.getTransactionBlock({
        digest: txHash,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          showObjectChanges: true
        }
      });
      
      if (!txData) {
        return { status: 'pending' };
      }
      
      // Extract the basic transaction details
      const status = txData.effects?.status?.status === 'success' ? 'success' : 'failure';
      const sender = txData.transaction?.data.sender;
      const gas = txData.effects?.gasUsed
        ? (BigInt(txData.effects.gasUsed.computationCost) +
           BigInt(txData.effects.gasUsed.storageCost) -
           BigInt(txData.effects.gasUsed.storageRebate)).toString()
        : undefined;
      
      // Extract timestamp if available
      let timestamp = undefined;
      if (txData.timestampMs) {
        timestamp = Math.floor(parseInt(txData.timestampMs) / 1000);
      }
      
      // Extract events
      const events = txData.events || [];
      
      // Extract transfers (this is simplified and might need enhancement)
      const transfers: Array<{
        from: string;
        to: string;
        amount: string;
        tokenType: string;
      }> = [];
      
      // Look for coin transfer events
      if (events) {
        for (const event of events) {
          if (event.type.includes('::coin::transfer') || event.type.includes('::coin::transfer_with_sender')) {
            try {
              // Parse event fields based on Sui event structure
              const parsedEvent = this.parseEventFields(event);
              
              if (parsedEvent.sender && parsedEvent.recipient && parsedEvent.amount) {
                transfers.push({
                  from: parsedEvent.sender,
                  to: parsedEvent.recipient,
                  amount: parsedEvent.amount,
                  tokenType: event.type.split('<')[1]?.split('>')[0] || 'unknown'
                });
              }
            } catch (err) {
              console.error('Error parsing transfer event:', err);
            }
          }
        }
      }
      
      return {
        status,
        timestamp,
        sender,
        gas,
        events,
        transfers
      };
    } catch (error) {
      console.error(`Error fetching transaction details for ${txHash}:`, error);
      return { status: 'pending' };
    }
  }
  
  /**
   * Parse event fields from a Sui event
   * @param event The event object
   * @returns Parsed fields
   */
  private parseEventFields(event: any): Record<string, any> {
    if (!event || !event.parsedJson) {
      return {};
    }
    
    return event.parsedJson;
  }
  
  /**
   * Get object data from the blockchain
   * @param objectId The object ID
   * @returns The object data
   */
  public async getObject(objectId: string): Promise<SuiObjectData | null> {
    try {
      const response = await this.provider.getObject({
        id: objectId,
        options: { showContent: true }
      });
      
      if (!response || !response.data) {
        return null;
      }
      
      return response.data as any as SuiObjectData;
    } catch (error) {
      console.error(`Error fetching object ${objectId}:`, error);
      return null;
    }
  }
  
  /**
   * Find objects by type owned by an address
   * @param address The owner address
   * @param type The object type
   * @param limit Maximum number of objects to fetch
   * @returns Array of objects
   */
  public async getObjectsByType(
    address: string,
    type: string,
    limit: number = 50
  ): Promise<SuiObjectData[]> {
    try {
      const response = await this.provider.getOwnedObjects({
        owner: address,
        filter: { StructType: type },
        options: { showContent: true },
        limit
      });
      
      if (!response || !response.data || response.data.length === 0) {
        return [];
      }
      
      return response.data.map(item => item.data as any as SuiObjectData);
    } catch (error) {
      console.error(`Error fetching objects of type ${type} for ${address}:`, error);
      return [];
    }
  }
  
  /**
   * Decode a Move value from BCS
   * @param bcsData Base64 encoded BCS data
   * @param type Move type
   * @returns Decoded value
   */
  public decodeMoveValue(bcsData: string, type: string): any {
    try {
      // Create BCS instance
      const bcsSerialization = bcs.getSerializer();
      
      // Register common types
      this.registerBcsTypes(bcsSerialization);
      
      // Convert base64 to bytes
      const bytes = fromB64(bcsData);
      
      // Decode based on type
      if (type === 'u8') {
        return bcs.de('u8', bytes);
      } else if (type === 'u16') {
        return bcs.de('u16', bytes);
      } else if (type === 'u32') {
        return bcs.de('u32', bytes);
      } else if (type === 'u64') {
        return bcs.de('u64', bytes).toString();
      } else if (type === 'u128') {
        return bcs.de('u128', bytes).toString();
      } else if (type === 'u256') {
        return bcs.de('u256', bytes).toString();
      } else if (type === 'bool') {
        return bcs.de('bool', bytes);
      } else if (type === 'address') {
        return bcs.de('address', bytes);
      } else if (type.startsWith('vector<')) {
        const innerType = type.slice(7, -1);
        return bcs.de(`vector<${innerType}>`, bytes);
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error decoding Move value: ${error}`);
      return null;
    }
  }
  
  /**
   * Register common BCS types
   * @param bcs BCS instance
   */
  private registerBcsTypes(bcs: any): void {
    // Basic types
    bcs.registerType('address', 'vector<u8>');
    bcs.registerType('bool', 'u8');
    bcs.registerType('u8', 'u8');
    bcs.registerType('u16', 'u16');
    bcs.registerType('u32', 'u32');
    bcs.registerType('u64', 'u64');
    bcs.registerType('u128', 'u128');
    bcs.registerType('u256', 'u256');
    
    // Vector types
    bcs.registerType('vector<u8>', 'vector<u8>');
    bcs.registerType('vector<address>', 'vector<address>');
    
    // String as vector<u8>
    bcs.registerType('string', 'vector<u8>');
  }
  
  /**
   * Check if an address owns a specific NFT
   * @param address The address to check
   * @param nftType The NFT type
   * @returns True if the address owns the NFT, false otherwise
   */
  public async ownsNFT(address: string, nftType: string): Promise<boolean> {
    try {
      const objects = await this.getObjectsByType(address, nftType, 1);
      return objects.length > 0;
    } catch (error) {
      console.error(`Error checking NFT ownership for ${address} and ${nftType}:`, error);
      return false;
    }
  }
  
  /**
   * Get all tokens owned by an address
   * @param address The address to check
   * @returns Array of token balances
   */
  public async getAllTokenBalances(address: string): Promise<Array<{
    tokenType: string;
    balance: string;
    metadata: TokenMetadata | null;
  }>> {
    try {
      // Get all coins
      const coins = await this.provider.getAllCoins({
        owner: address
      });
      
      if (!coins || !coins.data || coins.data.length === 0) {
        // If no other coins, at least include SUI
        const suiBalance = await this.getTokenBalance(address, SUI_TYPE_ARG);
        const suiMetadata = await this.getTokenMetadata(SUI_TYPE_ARG);
        
        return [{
          tokenType: SUI_TYPE_ARG,
          balance: suiBalance?.balance || '0',
          metadata: suiMetadata
        }];
      }
      
      // Group by token type and sum balances
      const tokenBalances: Record<string, bigint> = {};
      
      for (const coin of coins.data) {
        const tokenType = coin.coinType;
        const balance = BigInt(coin.balance);
        
        if (!tokenBalances[tokenType]) {
          tokenBalances[tokenType] = BigInt(0);
        }
        
        tokenBalances[tokenType] += balance;
      }
      
      // Fetch metadata for each token type
      const result: Array<{
        tokenType: string;
        balance: string;
        metadata: TokenMetadata | null;
      }> = [];
      
      for (const [tokenType, balance] of Object.entries(tokenBalances)) {
        const metadata = await this.getTokenMetadata(tokenType);
        
        result.push({
          tokenType,
          balance: balance.toString(),
          metadata
        });
      }
      
      // Add SUI if not already included
      if (!result.some(item => item.tokenType === SUI_TYPE_ARG)) {
        const suiBalance = await this.getTokenBalance(address, SUI_TYPE_ARG);
        const suiMetadata = await this.getTokenMetadata(SUI_TYPE_ARG);
        
        result.push({
          tokenType: SUI_TYPE_ARG,
          balance: suiBalance?.balance || '0',
          metadata: suiMetadata
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching all token balances for ${address}:`, error);
      
      // Return at least SUI balance as fallback
      const suiBalance = await this.getTokenBalance(address, SUI_TYPE_ARG);
      const suiMetadata = await this.getTokenMetadata(SUI_TYPE_ARG);
      
      return [{
        tokenType: SUI_TYPE_ARG,
        balance: suiBalance?.balance || '0',
        metadata: suiMetadata
      }];
    }
  }
  
  /**
   * Check if a wallet is part of a Merkle proof
   * This is for implementing allowlists or airdrop claims
   * @param walletAddress The wallet address to check
   * @param merkleRoot The Merkle root
   * @param proof The Merkle proof
   * @returns Whether the wallet is part of the proof
   */
  public verifyMerkleProof(
    walletAddress: string,
    merkleRoot: string,
    proof: string[]
  ): boolean {
    try {
      // For now, this is a stub implementation
      // In a real implementation, this would verify a Merkle proof
      
      if (!walletAddress || !merkleRoot || !proof || proof.length === 0) {
        return false;
      }
      
      // Mocked verification based on proof length
      // In reality, this would do proper cryptographic verification
      return proof.length > 0;
    } catch (error) {
      console.error('Error verifying Merkle proof:', error);
      return false;
    }
  }
  
  /**
   * Get all NFTs owned by an address
   * @param address The address to check
   * @param limit Maximum number of NFTs to fetch
   * @returns Array of NFTs
   */
  public async getNFTsOwnedByAddress(
    address: string,
    limit: number = 50
  ): Promise<Array<{
    objectId: string;
    type: string;
    metadata: NFTMetadata | null;
  }>> {
    try {
      // This is a simplified approach to find NFTs
      // In production, would need proper filtering of objects
      
      // Get objects owned by address
      const response = await this.provider.getOwnedObjects({
        owner: address,
        options: { showContent: true, showDisplay: true },
        limit
      });
      
      if (!response || !response.data || response.data.length === 0) {
        return [];
      }
      
      const nfts: Array<{
        objectId: string;
        type: string;
        metadata: NFTMetadata | null;
      }> = [];
      
      // Filter for objects that look like NFTs
      for (const object of response.data) {
        if (!object.data || !object.data.content) continue;
        
        const objectId = object.data.objectId;
        const type = object.data.type;
        
        // Skip SUI and known coin types
        if (type.includes('::coin::') || type.includes('::Coin::')) {
          continue;
        }
        
        // Check if it has display data - a good indicator of NFT
        const hasDisplayData = object.data.display && object.data.display.data;
        
        // Or check for common NFT fields in the content
        let hasNftFields = false;
        if ('fields' in object.data.content) {
          const fields = object.data.content.fields;
          hasNftFields = Boolean(
            fields.name || fields.Name || fields.image || fields.url || fields.image_url
          );
        }
        
        if (hasDisplayData || hasNftFields) {
          // Fetch full metadata
          const metadata = await this.getNFTMetadata(objectId);
          
          nfts.push({
            objectId,
            type,
            metadata
          });
        }
      }
      
      return nfts;
    } catch (error) {
      console.error(`Error fetching NFTs for ${address}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const suiMetadataService = new SuiMetadataService();