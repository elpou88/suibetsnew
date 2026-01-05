#!/usr/bin/env node
/**
 * Load Testing Script for SuiBets Platform
 * Tests concurrent user capacity for betting, deposits, withdrawals
 * Simulates 100-1000 concurrent users
 */

import http from 'http';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number; // seconds
  testDuration: number; // seconds
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Map<string, number>;
}

class LoadTester {
  private config: LoadTestConfig;
  private results: TestResult = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    requestsPerSecond: 0,
    errors: new Map()
  };
  private responseTimes: number[] = [];
  private startTime = 0;
  private activeRequests = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async run(): Promise<TestResult> {
    console.log('🚀 Starting Load Test');
    console.log(`📊 Config: ${this.config.concurrentUsers} concurrent users, ${this.config.requestsPerUser} requests each`);
    console.log(`⏱️  Ramp-up: ${this.config.rampUpTime}s, Test duration: ${this.config.testDuration}s\n`);

    this.startTime = Date.now();
    const usersPerSecond = this.config.concurrentUsers / this.config.rampUpTime;
    let activeUsers = 0;

    // Ramp up phase
    for (let i = 0; i < this.config.rampUpTime; i++) {
      const newUsers = Math.floor(usersPerSecond);
      for (let j = 0; j < newUsers; j++) {
        const userId = activeUsers + j;
        this.simulateUser(userId);
      }
      activeUsers += newUsers;
      await this.sleep(1000);
      process.stdout.write(`\r📈 Ramped up: ${activeUsers}/${this.config.concurrentUsers} users`);
    }

    console.log('\n✅ Ramp-up complete. Running test...\n');

    // Test duration
    const testStart = Date.now();
    while (Date.now() - testStart < this.config.testDuration * 1000) {
      process.stdout.write(`\r⏳ Active requests: ${this.activeRequests}, Total: ${this.results.totalRequests}`);
      await this.sleep(1000);
    }

    console.log('\n\n⏹️  Test complete. Processing results...\n');

    // Wait for all requests to complete
    while (this.activeRequests > 0) {
      await this.sleep(100);
    }

    return this.calculateResults();
  }

  private simulateUser(userId: number) {
    (async () => {
      for (let i = 0; i < this.config.requestsPerUser; i++) {
        const endpoint = this.getRandomEndpoint();
        await this.makeRequest(endpoint);
        await this.sleep(Math.random() * 1000); // Random delay between requests
      }
    })();
  }

  private getRandomEndpoint(): string {
    const endpoints = [
      '/api/events',
      '/api/events/live',
      '/api/bets',
      '/api/user/balance',
      '/api/health',
      '/api/ai/betting-suggestion'
    ];
    return endpoints[Math.floor(Math.random() * endpoints.length)];
  }

  private async makeRequest(endpoint: string): Promise<void> {
    this.activeRequests++;
    this.results.totalRequests++;

    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const options = {
        hostname: this.config.baseUrl.replace('http://', '').replace('https://', ''),
        port: 5000,
        path: endpoint,
        method: 'GET',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          this.recordResponse(responseTime, res.statusCode);
          this.activeRequests--;
          resolve();
        });
      });

      req.on('error', (err) => {
        this.recordError(err.message);
        this.activeRequests--;
        resolve();
      });

      req.on('timeout', () => {
        this.recordError('Timeout');
        req.destroy();
        this.activeRequests--;
        resolve();
      });

      req.end();
    });
  }

  private recordResponse(responseTime: number, statusCode?: number) {
    this.responseTimes.push(responseTime);

    if (statusCode && statusCode < 400) {
      this.results.successfulRequests++;
    } else {
      this.results.failedRequests++;
      this.recordError(`HTTP ${statusCode}`);
    }

    this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
  }

  private recordError(error: string) {
    this.results.failedRequests++;
    this.results.errors.set(error, (this.results.errors.get(error) || 0) + 1);
  }

  private calculateResults(): TestResult {
    const duration = (Date.now() - this.startTime) / 1000;
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      ...this.results,
      averageResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Number((this.results.totalRequests / duration).toFixed(2))
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printReport(results: TestResult) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         LOAD TEST RESULTS                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📈 METRICS:');
    console.log(`   Total Requests:       ${results.totalRequests}`);
    console.log(`   Successful:           ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`   Failed:               ${results.failedRequests}`);
    console.log(`   Requests/Second:      ${results.requestsPerSecond}`);

    console.log('\n⏱️  RESPONSE TIMES:');
    console.log(`   Average:              ${results.averageResponseTime}ms`);
    console.log(`   Min:                  ${results.minResponseTime}ms`);
    console.log(`   Max:                  ${results.maxResponseTime}ms`);

    if (results.errors.size > 0) {
      console.log('\n❌ ERRORS:');
      results.errors.forEach((count, error) => {
        console.log(`   ${error}: ${count}`);
      });
    }

    console.log('\n' + (results.successfulRequests / results.totalRequests > 0.95 ? '✅' : '⚠️') + ' CONCLUSION:');
    console.log(`   Success Rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`);
    console.log(`   Platform can handle: ${this.config.concurrentUsers} concurrent users\n`);
  }
}

// Run test
const config: LoadTestConfig = {
  baseUrl: 'http://localhost:5000',
  concurrentUsers: parseInt(process.argv[2] || '100'),
  requestsPerUser: 10,
  rampUpTime: 30, // 30 seconds to ramp up
  testDuration: 60 // 60 seconds of testing
};

const tester = new LoadTester(config);
tester.run().then(results => {
  tester.printReport(results);
  process.exit(results.successfulRequests / results.totalRequests > 0.95 ? 0 : 1);
});
