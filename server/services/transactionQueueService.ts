import { EventEmitter } from 'events';

interface QueuedTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'settlement';
  userId: string;
  amount: number;
  data: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: number;
  processedAt?: number;
  result?: any;
  error?: string;
}

export class TransactionQueueService extends EventEmitter {
  private queue: QueuedTransaction[] = [];
  private processing = false;
  private maxConcurrent = 5;
  private activeTransactions = 0;
  private successCount = 0;
  private failCount = 0;

  constructor() {
    super();
  }

  // Add transaction to queue
  enqueue(
    type: QueuedTransaction['type'],
    userId: string,
    amount: number,
    data: Record<string, any>,
    priority = 0
  ): string {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction: QueuedTransaction = {
      id,
      type,
      userId,
      amount,
      data,
      status: 'pending',
      priority,
      createdAt: Date.now()
    };

    this.queue.push(transaction);
    this.queue.sort((a, b) => b.priority - a.priority);

    this.emit('transaction:enqueued', { id, type, userId });
    console.log(`📋 Transaction queued: ${id} (${type}) - Priority: ${priority}`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return id;
  }

  // Get transaction status
  getStatus(transactionId: string): QueuedTransaction | undefined {
    return this.queue.find(t => t.id === transactionId);
  }

  // Process queue
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeTransactions < this.maxConcurrent) {
      const transaction = this.queue.shift();
      if (!transaction) break;

      this.activeTransactions++;
      this.processTransaction(transaction).finally(() => {
        this.activeTransactions--;
      });
    }

    this.processing = false;
  }

  // Process individual transaction
  private async processTransaction(transaction: QueuedTransaction) {
    try {
      transaction.status = 'processing';
      this.emit('transaction:started', { id: transaction.id, type: transaction.type });

      // Simulate processing time based on type
      const processingTime = {
        'deposit': 100,
        'withdrawal': 200,
        'bet': 150,
        'settlement': 250
      }[transaction.type];

      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Mark as completed
      transaction.status = 'completed';
      transaction.processedAt = Date.now();
      transaction.result = {
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        timestamp: Date.now()
      };

      this.successCount++;
      this.emit('transaction:completed', {
        id: transaction.id,
        type: transaction.type,
        userId: transaction.userId,
        result: transaction.result
      });

      console.log(`✅ Transaction completed: ${transaction.id} (${transaction.type})`);
    } catch (error: any) {
      transaction.status = 'failed';
      transaction.error = error.message;
      this.failCount++;

      this.emit('transaction:failed', {
        id: transaction.id,
        type: transaction.type,
        error: error.message
      });

      console.error(`❌ Transaction failed: ${transaction.id} - ${error.message}`);
    }

    // Continue processing queue
    if (this.queue.length > 0 && this.activeTransactions < this.maxConcurrent) {
      await this.processQueue();
    }
  }

  // Get queue stats
  getStats() {
    return {
      pending: this.queue.filter(t => t.status === 'pending').length,
      processing: this.queue.filter(t => t.status === 'processing').length,
      completed: this.successCount,
      failed: this.failCount,
      activeTransactions: this.activeTransactions,
      totalInQueue: this.queue.length
    };
  }

  // Clear failed transactions
  clearFailed() {
    this.queue = this.queue.filter(t => t.status !== 'failed');
  }

  // Get all transactions
  getAllTransactions(): QueuedTransaction[] {
    return [...this.queue];
  }

  // Reset service
  reset() {
    this.queue = [];
    this.successCount = 0;
    this.failCount = 0;
    this.activeTransactions = 0;
  }
}

export const transactionQueue = new TransactionQueueService();
