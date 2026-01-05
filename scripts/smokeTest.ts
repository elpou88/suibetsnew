#!/usr/bin/env node
/**
 * Smoke Testing Script for SuiBets dApp
 * Validates all critical user flows:
 * - Wallet connection
 * - Bet placement
 * - Deposits & Withdrawals
 * - AI Analysis
 * - Settlement
 */

import fetch from 'node-fetch';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class SmokeTest {
  private baseUrl = 'http://localhost:5000';
  private results: TestResult[] = [];
  private userId = `test_user_${Date.now()}`;

  async runAllTests(): Promise<void> {
    console.log('🧪 SMOKE TEST SUITE - SuiBets Platform\n');

    await this.testHealthCheck();
    await this.testBetPlacement();
    await this.testWalletOperations();
    await this.testAIAdvisor();
    await this.testSettlement();
    await this.testTransactionQueue();
    await this.testRateLimiting();

    this.printReport();
  }

  private async testHealthCheck(): Promise<void> {
    const test = async () => {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      const data = await response.json();
      if (!data.status) throw new Error('Invalid health status');
    };

    await this.runTest('Health Check', test);
  }

  private async testBetPlacement(): Promise<void> {
    const test = async () => {
      const response = await fetch(`${this.baseUrl}/api/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          eventId: 'test_event',
          amount: 100,
          odds: 1.5,
          market: 'winner'
        })
      });

      if (!response.ok) throw new Error(`Bet placement failed: ${response.status}`);
      const data = await response.json();
      if (!data.betId) throw new Error('No bet ID returned');
    };

    await this.runTest('Bet Placement', test);
  }

  private async testWalletOperations(): Promise<void> {
    const test = async () => {
      // Test balance check
      const balanceResponse = await fetch(`${this.baseUrl}/api/user/balance?userId=${this.userId}`);
      if (!balanceResponse.ok) throw new Error('Balance check failed');
      const balance = await balanceResponse.json();
      if (!balance.sui) throw new Error('No SUI balance');

      // Test deposit (will be queued)
      const depositResponse = await fetch(`${this.baseUrl}/api/user/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          amount: 50,
          currency: 'SUI'
        })
      });
      if (!depositResponse.ok) throw new Error('Deposit failed');

      // Test withdrawal (will be queued)
      const withdrawResponse = await fetch(`${this.baseUrl}/api/user/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          amount: 10,
          currency: 'SUI'
        })
      });
      if (!withdrawResponse.ok) throw new Error('Withdrawal failed');
    };

    await this.runTest('Wallet Operations', test);
  }

  private async testAIAdvisor(): Promise<void> {
    const test = async () => {
      const response = await fetch(`${this.baseUrl}/api/ai/betting-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'Test Match',
          sport: 'Football',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          provider: 'openai'
        })
      });

      if (!response.ok) throw new Error(`AI advisor failed: ${response.status}`);
      const data = await response.json();
      if (!data.suggestions) throw new Error('No suggestions returned');
    };

    await this.runTest('AI Betting Advisor', test);
  }

  private async testSettlement(): Promise<void> {
    const test = async () => {
      // First place a bet to get its ID
      const betResponse = await fetch(`${this.baseUrl}/api/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          eventId: 'settlement_test',
          amount: 50,
          odds: 2.0,
          market: 'winner'
        })
      });

      const bet = await betResponse.json();
      const betId = bet.betId;

      // Then settle it
      const settlementResponse = await fetch(`${this.baseUrl}/api/bets/${betId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: 'won',
          payout: 100
        })
      });

      if (!settlementResponse.ok) throw new Error('Settlement failed');
      const settlement = await settlementResponse.json();
      if (!settlement.settlement) throw new Error('No settlement data');
    };

    await this.runTest('Bet Settlement', test);
  }

  private async testTransactionQueue(): Promise<void> {
    const test = async () => {
      // Make multiple rapid requests to queue
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          fetch(`${this.baseUrl}/api/user/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: this.userId,
              amount: 10 + i,
              currency: 'SUI'
            })
          })
        );
      }

      const responses = await Promise.all(requests);
      const allSuccessful = responses.every(r => r.ok);
      if (!allSuccessful) throw new Error('Some queue requests failed');
    };

    await this.runTest('Transaction Queue', test);
  }

  private async testRateLimiting(): Promise<void> {
    const test = async () => {
      // Make rapid requests to test rate limiter
      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(
          fetch(`${this.baseUrl}/api/health`)
        );
      }

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);

      // Should get mix of 200s and potentially 429s (rate limited)
      const hasValidCodes = statusCodes.some(code => code === 200);
      if (!hasValidCodes) throw new Error('All requests were blocked');
    };

    await this.runTest('Rate Limiting', test);
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, duration });
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        passed: false,
        duration,
        error: error.message
      });
      console.log(`❌ ${name} - ${error.message}`);
    }
  }

  private printReport(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         SMOKE TEST REPORT                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = ((passed / total) * 100).toFixed(2);

    console.log(`📊 Results: ${passed}/${total} tests passed (${successRate}%)\n`);

    console.log('SUMMARY:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\n⏱️  Total Duration: ${totalDuration}ms`);

    const status = passed === total ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED';
    console.log(`\n${status}\n`);

    process.exit(passed === total ? 0 : 1);
  }
}

// Run tests
const tester = new SmokeTest();
tester.runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
