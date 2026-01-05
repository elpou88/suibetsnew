import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, File, Lock, Unlock, Key, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Define types for the vault and file objects
interface VaultFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploaded: string;
  encrypted: boolean;
}

interface Vault {
  id: string;
  name: string;
  created: string;
  files: VaultFile[];
  size: number;
}

/**
 * TuskyVaultManager - Component for managing decentralized storage vaults
 * Uses Tusky.io protocol for Sui blockchain storage
 */
const TuskyVaultManager: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount?.address;
  const address = currentAccount?.address;
  const { toast } = useToast();
  
  // Component state
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [isCreatingVault, setIsCreatingVault] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [encryptUpload, setEncryptUpload] = useState(true);
  
  // Mock data for demo
  useEffect(() => {
    if (isConnected) {
      // In a real implementation, this would fetch from the TuskyService
      setIsLoading(true);
      
      // Simulated loading delay
      setTimeout(() => {
        const demoVaults: Vault[] = [
          {
            id: '0x1a2b3c4d5e6f',
            name: 'My Documents',
            created: new Date().toISOString(),
            size: 1024 * 1024 * 15, // 15 MB
            files: [
              {
                id: '0xfile1',
                name: 'contract.pdf',
                size: 1024 * 1024 * 5, // 5 MB
                type: 'application/pdf',
                uploaded: new Date().toISOString(),
                encrypted: true
              },
              {
                id: '0xfile2',
                name: 'profile.jpg',
                size: 1024 * 1024 * 2, // 2 MB
                type: 'image/jpeg',
                uploaded: new Date(Date.now() - 7*24*60*60*1000).toISOString(), // 7 days ago
                encrypted: false
              }
            ]
          },
          {
            id: '0xabcdef123456',
            name: 'Backup Vault',
            created: new Date(Date.now() - 30*24*60*60*1000).toISOString(), // 30 days ago
            size: 1024 * 1024 * 50, // 50 MB
            files: [
              {
                id: '0xfile3',
                name: 'backup.zip',
                size: 1024 * 1024 * 45, // 45 MB
                type: 'application/zip',
                uploaded: new Date(Date.now() - 14*24*60*60*1000).toISOString(), // 14 days ago
                encrypted: true
              }
            ]
          }
        ];
        
        setVaults(demoVaults);
        if (demoVaults.length > 0) {
          setSelectedVault(demoVaults[0]);
        }
        setIsLoading(false);
      }, 1000);
    }
  }, [isConnected]);
  
  // Format file size for display
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return sizeInBytes + ' B';
    } else if (sizeInBytes < 1024 * 1024) {
      return (sizeInBytes / 1024).toFixed(1) + ' KB';
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
      return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Handle creating a new vault
  const handleCreateVault = () => {
    if (!newVaultName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for your vault',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call to create vault
    setTimeout(() => {
      const newVault: Vault = {
        id: '0x' + Math.random().toString(16).substring(2, 14),
        name: newVaultName,
        created: new Date().toISOString(),
        files: [],
        size: 0
      };
      
      setVaults([...vaults, newVault]);
      setSelectedVault(newVault);
      setNewVaultName('');
      setIsCreatingVault(false);
      setIsLoading(false);
      
      toast({
        title: 'Vault Created',
        description: `Your "${newVault.name}" vault has been created successfully`,
      });
    }, 1500);
  };
  
  // Handle file upload
  const handleFileUpload = () => {
    if (!fileToUpload || !selectedVault) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call to upload file
    setTimeout(() => {
      const newFile: VaultFile = {
        id: '0x' + Math.random().toString(16).substring(2, 14),
        name: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
        uploaded: new Date().toISOString(),
        encrypted: encryptUpload
      };
      
      const updatedVault = {
        ...selectedVault,
        files: [...selectedVault.files, newFile],
        size: selectedVault.size + fileToUpload.size
      };
      
      setVaults(vaults.map(v => v.id === selectedVault.id ? updatedVault : v));
      setSelectedVault(updatedVault);
      setFileToUpload(null);
      setUploadDialogOpen(false);
      setIsLoading(false);
      
      toast({
        title: 'File Uploaded',
        description: `${fileToUpload.name} has been uploaded${encryptUpload ? ' and encrypted' : ''}`,
      });
    }, 2000);
  };
  
  // Handle file download
  const handleFileDownload = (file: VaultFile) => {
    setIsLoading(true);
    
    // Simulate API call to download file
    setTimeout(() => {
      setIsLoading(false);
      
      toast({
        title: 'File Downloaded',
        description: `${file.name} has been downloaded${file.encrypted ? ' and decrypted' : ''}`,
      });
    }, 1500);
  };
  
  // Handle file deletion
  const handleFileDelete = (file: VaultFile) => {
    if (!selectedVault) return;
    
    setIsLoading(true);
    
    // Simulate API call to delete file
    setTimeout(() => {
      const updatedFiles = selectedVault.files.filter(f => f.id !== file.id);
      const updatedVault = {
        ...selectedVault,
        files: updatedFiles,
        size: selectedVault.size - file.size
      };
      
      setVaults(vaults.map(v => v.id === selectedVault.id ? updatedVault : v));
      setSelectedVault(updatedVault);
      setIsLoading(false);
      
      toast({
        title: 'File Deleted',
        description: `${file.name} has been deleted from the blockchain`,
      });
    }, 1000);
  };
  
  // Render empty state when not connected
  if (!isConnected) {
    return (
      <Card className="border-[#1e3a3f] bg-[#0b1618] text-white">
        <CardHeader>
          <CardTitle>Storage Vaults</CardTitle>
          <CardDescription className="text-gray-400">
            Connect your wallet to access your blockchain storage vaults
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-center py-12">
          <div className="space-y-4">
            <Lock className="mx-auto h-12 w-12 text-[#00FFFF]/50" />
            <p className="text-lg font-medium">Wallet Connection Required</p>
            <p className="text-gray-400 max-w-md">
              Connect your Sui wallet to create and manage secure storage vaults on the blockchain.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className="border-[#1e3a3f] bg-[#0b1618] text-white">
        <CardHeader>
          <CardTitle>Storage Vaults</CardTitle>
          <CardDescription className="text-gray-400">
            Loading your blockchain storage vaults...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-center py-12">
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#00FFFF] border-t-transparent" />
            <p className="text-lg font-medium">Loading Storage Data</p>
            <p className="text-gray-400 max-w-md">
              Fetching your storage vaults from the Sui blockchain...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render creating vault form
  if (isCreatingVault) {
    return (
      <Card className="border-[#1e3a3f] bg-[#0b1618] text-white">
        <CardHeader>
          <CardTitle>Create Storage Vault</CardTitle>
          <CardDescription className="text-gray-400">
            Create a new secure storage vault on the Sui blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vault-name">Vault Name</Label>
              <Input
                id="vault-name"
                placeholder="Enter vault name"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
                className="bg-[#112225] border-[#1e3a3f] text-white"
              />
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Key className="h-4 w-4" />
              <span>
                Your vault will be secured by your wallet's cryptographic keys
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            className="border-[#1e3a3f] text-gray-400 hover:text-white"
            onClick={() => setIsCreatingVault(false)}
          >
            Cancel
          </Button>
          <Button 
            className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
            onClick={handleCreateVault}
          >
            Create Vault
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Render main vault manager UI
  return (
    <Card className="border-[#1e3a3f] bg-[#0b1618] text-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Storage Vaults</CardTitle>
          <CardDescription className="text-gray-400">
            Manage your secure storage on the Sui blockchain
          </CardDescription>
        </div>
        <Button 
          onClick={() => setIsCreatingVault(true)}
          className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Vault
        </Button>
      </CardHeader>
      <CardContent>
        {vaults.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#112225] flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-[#00FFFF]/70" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Vaults Found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              You don't have any storage vaults yet. Create a vault to start storing files on the blockchain.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue={vaults[0].id} className="w-full">
              <TabsList className="grid grid-cols-2 mb-4 bg-[#112225]">
                <TabsTrigger 
                  value="vaults"
                  className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00FFFF]"
                >
                  My Vaults
                </TabsTrigger>
                <TabsTrigger 
                  value="files"
                  className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00FFFF]"
                >
                  Files
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="vaults" className="space-y-4">
                {vaults.map(vault => (
                  <div 
                    key={vault.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedVault?.id === vault.id ? 'bg-[#1e3a3f]' : 'bg-[#112225] hover:bg-[#1e3a3f]/70'
                    }`}
                    onClick={() => setSelectedVault(vault)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="mr-3 p-2 rounded-full bg-[#00FFFF]/10">
                          <Lock className="h-5 w-5 text-[#00FFFF]" />
                        </div>
                        <div>
                          <h3 className="font-medium">{vault.name}</h3>
                          <p className="text-sm text-gray-400">
                            {vault.files.length} files · {formatFileSize(vault.size)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">
                        Created {new Date(vault.created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="files" className="space-y-4">
                {selectedVault ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{selectedVault.name} Files</h3>
                      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0b1618] border-[#1e3a3f] text-white">
                          <DialogHeader>
                            <DialogTitle>Upload File</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Upload a file to your "{selectedVault.name}" vault
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="file">Select File</Label>
                              <Input
                                id="file"
                                type="file"
                                onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                                className="bg-[#112225] border-[#1e3a3f] text-white"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="encrypt"
                                checked={encryptUpload}
                                onChange={(e) => setEncryptUpload(e.target.checked)}
                                className="rounded border-[#1e3a3f] bg-[#112225]"
                              />
                              <Label htmlFor="encrypt">Encrypt file with wallet keys</Label>
                            </div>
                            {fileToUpload && (
                              <div className="text-sm text-gray-400">
                                <p>File: {fileToUpload.name}</p>
                                <p>Size: {formatFileSize(fileToUpload.size)}</p>
                                <p>Type: {fileToUpload.type || 'Unknown'}</p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setUploadDialogOpen(false)}
                              className="border-[#1e3a3f] text-gray-400 hover:text-white"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleFileUpload}
                              className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
                              disabled={!fileToUpload}
                            >
                              Upload
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {selectedVault.files.length === 0 ? (
                      <div className="text-center py-8 bg-[#112225] rounded-lg">
                        <File className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium mb-2">No Files</h3>
                        <p className="text-gray-400 max-w-md mx-auto mb-4">
                          This vault is empty. Upload files to store them securely on the blockchain.
                        </p>
                        <Button 
                          onClick={() => setUploadDialogOpen(true)}
                          className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload First File
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-auto rounded-lg border border-[#1e3a3f]">
                        <table className="min-w-full divide-y divide-[#1e3a3f]">
                          <thead className="bg-[#112225]">
                            <tr>
                              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">
                                File
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                Size
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                Uploaded
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                Status
                              </th>
                              <th scope="col" className="relative py-3.5 pl-3 pr-4">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1e3a3f] bg-[#0b1618]">
                            {selectedVault.files.map(file => (
                              <tr 
                                key={file.id} 
                                className="hover:bg-[#112225] cursor-pointer"
                                onClick={() => setSelectedFile(file)}
                              >
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                  <div className="flex items-center">
                                    <div className="mr-3 p-2 rounded-full bg-[#112225]">
                                      <File className="h-4 w-4 text-[#00FFFF]" />
                                    </div>
                                    <span className="font-medium">{file.name}</span>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                                  {formatFileSize(file.size)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                                  {formatDate(file.uploaded)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                  {file.encrypted ? (
                                    <span className="inline-flex items-center rounded-full bg-[#00FFFF]/10 px-2 py-1 text-xs font-medium text-[#00FFFF]">
                                      <Lock className="h-3 w-3 mr-1" /> Encrypted
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400">
                                      <Unlock className="h-3 w-3 mr-1" /> Unencrypted
                                    </span>
                                  )}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-[#1e3a3f] text-[#00FFFF] hover:text-[#00FFFF] hover:bg-[#00FFFF]/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFileDownload(file);
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-[#1e3a3f] text-red-400 hover:text-red-400 hover:bg-red-400/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFileDelete(file);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      Select a vault to view its files
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TuskyVaultManager;