/**
 * Notification Service - Tracks all platform events (bets, settlements, payouts)
 */

export interface Notification {
  id: string;
  userId: string;
  type: 'bet_placed' | 'bet_settled' | 'settlement_won' | 'settlement_lost' | 'withdrawal' | 'deposit';
  title: string;
  message: string;
  data: any;
  read: boolean;
  timestamp: number;
}

export class NotificationService {
  private notifications: Map<string, Notification[]> = new Map();

  /**
   * Create a new notification
   */
  createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data: any = {}
  ): Notification {
    const notification: Notification = {
      id: `notif-${userId}-${Date.now()}`,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      timestamp: Date.now()
    };

    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.unshift(notification);

    // Keep last 100 notifications per user
    const userNotifs = this.notifications.get(userId)!;
    if (userNotifs.length > 100) {
      userNotifs.pop();
    }

    console.log(`📢 NOTIFICATION: ${userId} - ${type}: ${title}`);
    return notification;
  }

  /**
   * Get notifications for a user
   */
  getUserNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false): Notification[] {
    const userNotifs = this.notifications.get(userId) || [];
    let filtered = userNotifs;

    if (unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): Notification | null {
    const userNotifs = this.notifications.get(userId);
    if (!userNotifs) return null;

    const notif = userNotifs.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      console.log(`✓ Notification marked as read: ${notificationId}`);
    }
    return notif || null;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    const userNotifs = this.notifications.get(userId) || [];
    const unreadCount = userNotifs.filter(n => !n.read).length;
    
    userNotifs.forEach(n => {
      n.read = true;
    });

    console.log(`✓ Marked ${unreadCount} notifications as read for ${userId}`);
    return unreadCount;
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    const userNotifs = this.notifications.get(userId) || [];
    return userNotifs.filter(n => !n.read).length;
  }

  /**
   * Notify bet placed
   */
  notifyBetPlaced(userId: string, bet: any): void {
    this.createNotification(
      userId,
      'bet_placed',
      `Bet Placed: ${bet.homeTeam} vs ${bet.awayTeam}`,
      `You placed a ${bet.betAmount} SUI bet @ ${bet.odds.toFixed(2)} odds. Potential payout: ${(bet.betAmount * bet.odds).toFixed(2)} SUI`,
      bet
    );
  }

  /**
   * Notify bet settled
   */
  notifyBetSettled(userId: string, bet: any, outcome: 'won' | 'lost' | 'void'): void {
    const titles = {
      'won': `🎉 Bet Won!`,
      'lost': `Bet Lost`,
      'void': `Bet Voided`
    };

    const messages = {
      'won': `Your bet on ${bet.homeTeam} vs ${bet.awayTeam} won! Payout: ${bet.payout} SUI`,
      'lost': `Your bet on ${bet.homeTeam} vs ${bet.awayTeam} lost`,
      'void': `Your bet on ${bet.homeTeam} vs ${bet.awayTeam} was voided. Refund: ${bet.betAmount} SUI`
    };

    this.createNotification(
      userId,
      outcome === 'won' ? 'settlement_won' : outcome === 'lost' ? 'settlement_lost' : 'bet_settled',
      titles[outcome],
      messages[outcome],
      bet
    );
  }

  /**
   * Notify withdrawal
   */
  notifyWithdrawal(userId: string, amount: number, status: 'pending' | 'completed'): void {
    this.createNotification(
      userId,
      'withdrawal',
      `Withdrawal ${status === 'completed' ? 'Completed' : 'Pending'}`,
      `${amount} SUI withdrawal ${status === 'completed' ? 'has been sent to your wallet' : 'is being processed'}`,
      { amount, status }
    );
  }

  /**
   * Notify deposit
   */
  notifyDeposit(userId: string, amount: number): void {
    this.createNotification(
      userId,
      'deposit',
      `Deposit Received`,
      `${amount} SUI has been added to your account`,
      { amount }
    );
  }
}

export default new NotificationService();
