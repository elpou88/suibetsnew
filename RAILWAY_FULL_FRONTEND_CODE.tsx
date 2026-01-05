/**
 * ============================================
 * SUIBETS COMPLETE FRONTEND - COPY THIS TO client/src/App.tsx
 * ============================================
 */

import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

// Import pages
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

// Import providers
import { AuthProvider } from "@/context/AuthContext";
import { BlockchainAuthProvider } from "@/hooks/useBlockchainAuth";
import { BettingProvider } from "@/context/BettingContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { WalProvider } from "@/components/ui/wal-components";
import { WalrusProtocolProvider } from "@/context/WalrusProtocolContext";
import { SpecialLinks } from "@/components/ui/SpecialLinks";
import { UniversalClickHandler } from "@/components/betting/UniversalClickHandler";
import { SportBettingWrapper } from "@/components/betting/SportBettingWrapper";
import { SuietWalletProvider } from "@/components/wallet/SuietWalletProvider";
import { SuiDappKitProvider } from "@/components/wallet/SuiDappKitProvider";
import { WalletKitProvider } from "@mysten/wallet-kit";

// Import new pages
import HomeReal from "@/pages/home-real";
import LiveReal from "@/pages/live-real";
import SportsLive from "@/pages/sports-live";
import PromotionsReal from "@/pages/promotions-real";
import BetHistoryReal from "@/pages/bet-history-real";
import BetHistoryPage from "@/pages/bet-history";
import DividendsReal from "@/pages/dividends-real";
import SportPage from "@/pages/sports-live/[sport]";
import GenericSportPage from "@/pages/sport-page";
import StoragePage from "@/pages/storage";
import LiveScoresPage from "@/pages/live-scores";
import { ParlayPage } from "@/components/parlay/ParlayPage";
import Layout from "@/components/layout/Layout";

// Import new pages
import JoinPage from "@/pages/join";
import LiveEventsPage from "@/pages/live-events";
import UpcomingEventsPage from "@/pages/upcoming-events";
import ResultsPage from "@/pages/results";

function App() {
  console.log("🚀 SuiBets Application Starting");

  useEffect(() => {
    console.log("🔍 Wallet Detection...");
    // @ts-ignore
    const wallets = {
      walletStandard: typeof window.walletStandard !== 'undefined',
      suiWallet: typeof window.suiWallet !== 'undefined',
      ethosWallet: typeof window.ethos !== 'undefined',
      suietWallet: typeof window.suiet !== 'undefined',
      martianWallet: typeof window.martian !== 'undefined',
    };
    console.log("💳 Available Wallets:", wallets);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <WalletKitProvider>
          <SuiDappKitProvider>
            <SuietWalletProvider>
              <WalProvider>
                <WalrusProtocolProvider>
                  <BlockchainAuthProvider>
                    <AuthProvider>
                      <SettingsProvider>
                        <BettingProvider>
                          <div className="root-container">
                            <UniversalClickHandler />
                            <Switch>
                              {/* Main Routes */}
                              <Route path="/" component={HomeReal} />
                              <Route path="/sports" component={HomeReal} />
                              <Route path="/sport/:slug*" component={SportsLive} />
                              <Route path="/match/:id" component={Match} />
                              <Route path="/match-detail/:id" component={MatchDetail} />
                              <Route path="/live" component={LiveReal} />
                              <Route path="/live/:id" component={LiveEventPage} />

                              {/* Pages */}
                              <Route path="/promotions" component={ResultsPage} />
                              <Route path="/results" component={ResultsPage} />
                              <Route path="/promotions/referral" component={ReferralPage} />
                              <Route path="/notifications" component={Notifications} />
                              <Route path="/settings" component={Settings} />
                              <Route path="/bet-history" component={BetHistoryPage} />
                              <Route path="/dividends" component={DividendsReal} />
                              <Route path="/storage" component={StoragePage} />

                              {/* Wallet Routes */}
                              <Route path="/connect-wallet">
                                {() => {
                                  const ConnectWalletRedirect = () => {
                                    useEffect(() => {
                                      const event = new CustomEvent('suibets:connect-wallet-required');
                                      window.dispatchEvent(event);
                                      window.history.replaceState(null, '', '/');
                                    }, []);
                                    return <HomeReal />;
                                  };
                                  return <ConnectWalletRedirect />;
                                }}
                              </Route>
                              <Route path="/wallet-dashboard" component={WalletDashboard} />

                              {/* Additional Pages */}
                              <Route path="/join" component={JoinPage} />
                              <Route path="/live-events" component={LiveEventsPage} />
                              <Route path="/upcoming-events" component={UpcomingEventsPage} />
                              <Route path="/live-scores" component={LiveScoresPage} />

                              {/* Info Pages */}
                              <Route path="/info" component={Info} />
                              <Route path="/community" component={Community} />
                              <Route path="/contact" component={Contact} />

                              {/* Legacy Routes */}
                              <Route path="/goto-sports" component={HomeReal} />
                              <Route path="/goto-promotions" component={RedirectToPromotions} />
                              <Route path="/goto-live" component={LiveReal} />
                              <Route path="/sports-exact" component={HomeReal} />
                              <Route path="/live-exact" component={LiveReal} />
                              <Route path="/bet-slip" component={BetSlip} />
                              <Route path="/bet-slip-2" component={BetSlip2} />

                              {/* Compatibility Routes */}
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

                              {/* 404 */}
                              <Route component={NotFound} />
                            </Switch>

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
        </WalletKitProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
