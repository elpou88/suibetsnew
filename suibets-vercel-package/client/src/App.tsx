import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

// Legacy image-based pages
import Home from "@/pages/home";
import Match from "@/pages/match";
import Sport from "@/pages/sport";
import MatchDetail from "@/pages/match-detail";
import Promotions from "@/pages/promotions";
import ReferralPage from "@/pages/promotions/referral";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import BetSlip from "@/pages/bet-slip";
import BetSlip2 from "@/pages/bet-slip-2";
import ConnectWallet from "@/pages/connect-wallet";
import WalletDashboard from "@/pages/wallet-dashboard";
import NotFound from "@/pages/not-found";
import RedirectToPromotions from "@/pages/redirect-to-promotions";
import RedirectToLive from "@/pages/redirect-to-live";
import Info from "@/pages/info";
import Community from "@/pages/community";
import Contact from "@/pages/contact";
import LiveEventPage from "@/pages/live/[id]";
import Live from "@/pages/live";
import LiveExact from "@/pages/live-exact";
import SportsExact from "@/pages/sports-exact";
import GotoSports from "@/pages/goto-sports";

// Context providers and shared components
import { AuthProvider } from "@/context/AuthContext";
import { BlockchainAuthProvider } from "@/hooks/useBlockchainAuth"; // Add blockchain authentication provider
import { BettingProvider } from "@/context/BettingContext";
import { SettingsProvider } from "@/context/SettingsContext"; // Add settings provider
import { WalProvider } from "@/components/ui/wal-components";
import { WalrusProtocolProvider } from "@/context/WalrusProtocolContext";
import { SpecialLinks } from "@/components/ui/SpecialLinks";
import { DepositWithdrawFAB } from "@/components/modals/DepositWithdrawFAB";
import { UniversalClickHandler } from "@/components/betting/UniversalClickHandler";
import { SportBettingWrapper } from "@/components/betting/SportBettingWrapper";
import { SuietWalletProvider } from "@/components/wallet/SuietWalletProvider";
import { SuiDappKitProvider } from "@/components/wallet/SuiDappKitProvider";

// New real-time data pages
import HomeReal from "@/pages/home-real";
import LiveReal from "@/pages/live-real";
import SportsLive from "@/pages/sports-live";
import PromotionsReal from "@/pages/promotions-real";
import BetHistoryReal from "@/pages/bet-history-real";
import BetHistoryPage from "@/pages/bet-history"; // Our new bet history page
import DividendsReal from "@/pages/dividends-real";
import SportPage from "@/pages/sports-live/[sport]";
import GenericSportPage from "@/pages/sport-page"; // New generic sports page that supports all sports
import StoragePage from "@/pages/storage";
import LiveScoresPage from "@/pages/live-scores";
// Import components directly instead of pages
import { ParlayPage } from "@/components/parlay/ParlayPage";
import { StakingSection } from "@/components/defi/StakingSection";
import Layout from "@/components/layout/Layout";

function App() {
  console.log("Starting React application");
  
  // Log wallet detection on app start
  useEffect(() => {
    console.log("Checking for installed wallets...");
    
    // Check for wallet-standard support
    // @ts-ignore - Checking global object
    const hasWalletStandard = typeof window.walletStandard !== 'undefined';
    // @ts-ignore - Checking global object
    const hasSuiWallet = typeof window.suiWallet !== 'undefined';
    // @ts-ignore - Checking global object
    const hasEthosWallet = typeof window.ethos !== 'undefined';
    // @ts-ignore - Checking global object
    const hasSuietWallet = typeof window.suiet !== 'undefined';
    // @ts-ignore - Checking global object
    const hasMartianWallet = typeof window.martian !== 'undefined';
    
    console.log("Wallet detection:", {
      walletStandard: hasWalletStandard,
      suiWallet: hasSuiWallet,
      ethosWallet: hasEthosWallet,
      suietWallet: hasSuietWallet,
      martianWallet: hasMartianWallet
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {/* Order matters - SuiDappKitProvider must be the outermost wallet provider */}
        <SuiDappKitProvider>
          {/* SuietWalletProvider as a fallback for Suiet wallet compatibility */}
          <SuietWalletProvider>
            {/* Other application providers */}
            <WalProvider>
              <WalrusProtocolProvider>
                <BlockchainAuthProvider>
                  <AuthProvider>
                    <SettingsProvider>
                      <BettingProvider>
                        <div className="root-container">
                          <Switch>
                          {/* Main Routes - Use real data pages as the default */}
                          <Route path="/" component={HomeReal} />
                          <Route path="/sports" component={HomeReal} />
                          <Route path="/sport/:slug*" component={SportsLive} />
                          <Route path="/match/:id" component={Match} />
                          <Route path="/match-detail/:id" component={MatchDetail} />
                          <Route path="/live" component={LiveReal} />
                          <Route path="/live/:id" component={LiveEventPage} />
                          
                          {/* Additional Pages - Using real-time data pages */}
                          <Route path="/promotions" component={PromotionsReal} />
                          <Route path="/promotions/referral" component={ReferralPage} />
                          <Route path="/notifications" component={Notifications} />
                          <Route path="/settings" component={Settings} />
                          <Route path="/bet-history" component={BetHistoryPage} />
                          <Route path="/dividends" component={DividendsReal} />
                          <Route path="/defi-staking">
                            {() => (
                              <Layout>
                                <StakingSection />
                              </Layout>
                            )}
                          </Route>
                          <Route path="/storage" component={StoragePage} />
                          
                          {/* Redirect connect-wallet route to HomePage with modal approach */}
                          <Route path="/connect-wallet">
                            {() => {
                              // Create a component that handles the redirect and modal opening
                              const ConnectWalletRedirect = () => {
                                useEffect(() => {
                                  console.log('Connect-wallet route detected, triggering modal...');
                                  
                                  // Dispatch an event to trigger the wallet modal
                                  const event = new CustomEvent('suibets:connect-wallet-required');
                                  window.dispatchEvent(event);
                                  
                                  // Use history API to replace current URL without refreshing
                                  window.history.replaceState(null, '', '/');
                                }, []);
                                
                                // Return the home page
                                return <HomeReal />;
                              };
                              
                              return <ConnectWalletRedirect />;
                            }}
                          </Route>
                          <Route path="/wallet-dashboard" component={WalletDashboard} />
                          <Route path="/join" component={HomeReal} />
                          <Route path="/live-scores" component={LiveScoresPage} />
                          
                          {/* Info Pages */}
                          <Route path="/info" component={Info} />
                          <Route path="/community" component={Community} />
                          <Route path="/contact" component={Contact} />
                          
                          {/* Legacy Routes - Redirects */}
                          <Route path="/goto-sports" component={HomeReal} />
                          <Route path="/goto-promotions" component={RedirectToPromotions} />
                          <Route path="/goto-live" component={LiveReal} />
                          <Route path="/sports-exact" component={HomeReal} />
                          <Route path="/live-exact" component={LiveReal} />
                          <Route path="/bet-slip" component={BetSlip} />
                          <Route path="/bet-slip-2" component={BetSlip2} />
                          
                          {/* Legacy Routes with new names for backward compatibility */}
                          <Route path="/home-real" component={HomeReal} />
                          <Route path="/live-real" component={LiveReal} />
                          <Route path="/sports-live" component={SportsLive} />
                          <Route path="/sports-live/:sport" component={SportPage} />
                          <Route path="/parlay">
                            {() => (
                              <Layout>
                                <ParlayPage />
                              </Layout>
                            )}
                          </Route>
                          
                          <Route component={NotFound} />
                        </Switch>
                        
                        {/* Floating deposit/withdraw buttons that appear on all pages */}
                        <DepositWithdrawFAB />
                        
                        {/* Universal betting handlers to enable betting across all pages */}
                        <UniversalClickHandler />
                        <SportBettingWrapper />
                      </div>
                      <SpecialLinks />
                      <Toaster />
                    </BettingProvider>
                    </SettingsProvider>
                  </AuthProvider>
                </BlockchainAuthProvider>
              </WalrusProtocolProvider>
            </WalProvider>
          </SuietWalletProvider>
        </SuiDappKitProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;