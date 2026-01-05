import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, UserPlus, Coins, Trophy, Mail, Lock, User } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { WalletConnector } from '@/components/wallet/WalletConnector';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function JoinPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleWalletConnect = (address: string) => {
    console.log('Wallet connected:', address);
    toast({
      title: "Welcome to SuiBets!",
      description: "Your wallet has been connected successfully. Start betting now!",
    });
    setLocation('/home-real');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Form validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Simulate account creation
    setTimeout(() => {
      toast({
        title: "Account Created!",
        description: "Please connect your wallet to complete setup.",
      });
      setIsLoading(false);
    }, 2000);
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  // If user is already connected, redirect
  if (user) {
    setLocation('/home-real');
    return null;
  }

  return (
    <Layout title="Join SuiBets">
      <div className="min-h-screen bg-gradient-to-br from-[#0b1618] via-[#112225] to-[#1a3138] py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-cyan-400 mb-4">
              Welcome to SuiBets
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Join the future of sports betting on the Sui blockchain
            </p>
            <div className="flex justify-center space-x-8 text-sm text-cyan-300">
              <div className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                0% Platform Fees
              </div>
              <div className="flex items-center">
                <Coins className="h-5 w-5 mr-2" />
                Instant Payouts
              </div>
              <div className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Blockchain Security
              </div>
            </div>
          </div>

          <Tabs defaultValue="wallet" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#1e3a3f] border-[#2a4a4f]">
              <TabsTrigger 
                value="wallet" 
                className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet (Recommended)
              </TabsTrigger>
              <TabsTrigger 
                value="traditional" 
                className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Traditional Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallet" className="mt-6">
              <Card className="bg-[#0b1618] border-[#1e3a3f] text-white">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-cyan-400">Connect Your Sui Wallet</CardTitle>
                  <CardDescription className="text-gray-400">
                    The fastest way to start betting. Your wallet is your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <WalletConnector onConnect={handleWalletConnect} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="text-center p-4 bg-[#112225] rounded-lg border border-[#1e3a3f]">
                      <Wallet className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-cyan-300">No Deposits</h3>
                      <p className="text-sm text-gray-400">Bet directly from your wallet</p>
                    </div>
                    <div className="text-center p-4 bg-[#112225] rounded-lg border border-[#1e3a3f]">
                      <Trophy className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-cyan-300">Instant Wins</h3>
                      <p className="text-sm text-gray-400">Automatic payouts to wallet</p>
                    </div>
                    <div className="text-center p-4 bg-[#112225] rounded-lg border border-[#1e3a3f]">
                      <Coins className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-cyan-300">Earn Dividends</h3>
                      <p className="text-sm text-gray-400">Stake SBETS for rewards</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="traditional" className="mt-6">
              <Card className="bg-[#0b1618] border-[#1e3a3f] text-white">
                <CardHeader>
                  <CardTitle className="text-2xl text-cyan-400">Create Your Account</CardTitle>
                  <CardDescription className="text-gray-400">
                    Sign up with email and connect your wallet later
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-cyan-300">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={handleInputChange('email')}
                            className="pl-10 bg-[#112225] border-[#1e3a3f] text-white"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-cyan-300">Username</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="username"
                            type="text"
                            placeholder="Choose username"
                            value={formData.username}
                            onChange={handleInputChange('username')}
                            className="pl-10 bg-[#112225] border-[#1e3a3f] text-white"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-cyan-300">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="Create password"
                            value={formData.password}
                            onChange={handleInputChange('password')}
                            className="pl-10 bg-[#112225] border-[#1e3a3f] text-white"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-cyan-300">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange('confirmPassword')}
                            className="pl-10 bg-[#112225] border-[#1e3a3f] text-white"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-700 hover:to-cyan-500 text-black font-bold py-3"
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>

                  <div className="mt-6 p-4 bg-[#112225] rounded-lg border border-[#1e3a3f]">
                    <p className="text-sm text-gray-400 text-center">
                      After creating your account, you'll need to connect a Sui wallet to place bets and receive payouts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-8">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Button 
                variant="link" 
                className="text-cyan-400 hover:text-cyan-300 p-0"
                onClick={() => setLocation('/connect-wallet')}
              >
                Connect your wallet
              </Button>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}