import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY!;
const NEW_PACKAGE_ID = '0x0fdaea1942d3e3feb686635751276c331a66582ee07b81d400e22df179d79e57';
const BETTING_PLATFORM_ID = '0x5fc1073c9533c6737fa3a0882055d1778602681df70bdabde96b0127b588f082';
const ADMIN_CAP_ID = '0xf51a04becf8c215dee71c9b92a063e4c5ef1ebc2fc3fad0797196895f8589296';
const SBETS_TYPE = '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS';

async function main() {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const keypair = Ed25519Keypair.fromSecretKey(ADMIN_KEY);
  
  console.log('Admin address:', keypair.toSuiAddress());
  
  const coins = await client.getCoins({
    owner: BETTING_PLATFORM_ID,
    coinType: SBETS_TYPE,
  });
  
  console.log(`Found ${coins.data.length} stuck SBETS coin objects`);
  let totalBalance = BigInt(0);
  for (const c of coins.data) {
    totalBalance += BigInt(c.balance);
    console.log(`  ${c.coinObjectId} = ${(Number(BigInt(c.balance)) / 1e9).toLocaleString()} SBETS`);
  }
  console.log(`Total stuck: ${(Number(totalBalance) / 1e9).toLocaleString()} SBETS\n`);
  
  let totalExtracted = BigInt(0);
  let successCount = 0;
  
  // Process one coin at a time to be safe
  for (let i = 0; i < coins.data.length; i++) {
    const coin = coins.data[i];
    const sbets = Number(BigInt(coin.balance)) / 1e9;
    console.log(`[${i+1}/${coins.data.length}] Extracting ${sbets.toLocaleString()} SBETS (${coin.coinObjectId.slice(0,16)}...)`);
    
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${NEW_PACKAGE_ID}::betting::receive_sbets_coins`,
      arguments: [
        tx.object(ADMIN_CAP_ID),
        tx.object(BETTING_PLATFORM_ID),
        tx.receivingRef({
          objectId: coin.coinObjectId,
          version: coin.version,
          digest: coin.digest,
        }),
      ],
    });
    
    tx.setGasBudget(50_000_000);
    
    try {
      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });
      
      if (result.effects?.status?.status === 'success') {
        totalExtracted += BigInt(coin.balance);
        successCount++;
        console.log(`  ✅ TX: ${result.digest}`);
      } else {
        console.log(`  ❌ Failed: ${result.effects?.status?.error}`);
        console.log(`  TX: ${result.digest}`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message?.slice(0, 200)}`);
    }
    
    // Wait between transactions
    if (i < coins.data.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log(`\n=== EXTRACTION COMPLETE ===`);
  console.log(`Coins extracted: ${successCount}/${coins.data.length}`);
  console.log(`Total SBETS extracted: ${(Number(totalExtracted) / 1e9).toLocaleString()} SBETS`);
}

main().catch(console.error);
