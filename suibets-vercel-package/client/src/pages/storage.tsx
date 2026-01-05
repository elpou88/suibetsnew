import React from 'react';
import { Helmet } from 'react-helmet';
import MainLayout from '@/components/layout/MainLayout';
import { default as TuskyVaultManager } from '@/components/storage/TuskyVaultManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWalletAdapter } from '@/components/wallet/WalletAdapter';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

/**
 * Storage page for managing decentralized storage on the SUI blockchain
 */
const StoragePage: React.FC = () => {
  const { isConnected } = useWalletAdapter();
  
  return (
    <MainLayout>
      <Helmet>
        <title>Decentralized Storage | Suibets</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Decentralized Storage</h1>
            <p className="text-gray-400 mt-1">
              Securely store your files on the SUI blockchain with Tusky.io
            </p>
          </div>
          
          {!isConnected && (
            <Button 
              asChild
              className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
            >
              <Link to="/connect-wallet">Connect Wallet</Link>
            </Button>
          )}
        </div>
        
        <Card className="border-[#1e3a3f] bg-[#0b1618] text-white">
          <CardHeader>
            <CardTitle>Blockchain Storage</CardTitle>
            <CardDescription className="text-gray-400">
              Your files are stored securely on the Sui blockchain using Tusky.io decentralized storage protocol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                Tusky.io provides secure, decentralized storage for your files on the Sui blockchain.
                Your files are encrypted and distributed across the network, ensuring they cannot be
                tampered with or removed by any central authority.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card className="border-[#1e3a3f] bg-[#112225] text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#00FFFF]">Secure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      All files are encrypted and securely stored on the blockchain,
                      accessible only with your wallet's private key.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-[#1e3a3f] bg-[#112225] text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#00FFFF]">Decentralized</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      No central server or authority controls your data.
                      Files are distributed across the Sui network.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-[#1e3a3f] bg-[#112225] text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#00FFFF]">Permanent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      Files stored on the blockchain are immutable and
                      will remain accessible as long as the network exists.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <TuskyVaultManager />
      </div>
    </MainLayout>
  );
};

export default StoragePage;