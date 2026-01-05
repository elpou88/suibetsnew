import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import Layout from "@/components/layout/Layout";

interface Notification {
  id: string;
  userId: string;
  type: 'bet_placed' | 'bet_settled' | 'settlement_won' | 'settlement_lost' | 'withdrawal' | 'deposit';
  title: string;
  message: string;
  data: any;
  read: boolean;
  timestamp: number;
}

export default function Notifications() {
  const [tab, setTab] = useState<'unread' | 'inbox'>('unread');
  const userId = 'user1';

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications', tab],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${userId}&unreadOnly=${tab === 'unread'}`);
      return response.json();
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Get icon based on notification type
  const getIcon = (type: string) => {
    switch (type) {
      case 'settlement_won':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'settlement_lost':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'bet_placed':
        return <TrendingUp className="h-5 w-5 text-blue-400" />;
      case 'deposit':
      case 'withdrawal':
        return <Bell className="h-5 w-5 text-yellow-400" />;
      default:
        return <Bell className="h-5 w-5 text-cyan-400" />;
    }
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Layout showBackButton={false} title="Notifications">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
          <Bell className="h-8 w-8 text-cyan-400" />
          Notifications
        </h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[#1e3a3f]">
          <button
            onClick={() => setTab('unread')}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === 'unread'
                ? 'text-cyan-400 border-b-2 border-b-cyan-400'
                : 'text-gray-400 hover:text-cyan-300'
            }`}
            data-testid="tab-unread"
          >
            💬 Unread
          </button>
          <button
            onClick={() => setTab('inbox')}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === 'inbox'
                ? 'text-cyan-400 border-b-2 border-b-cyan-400'
                : 'text-gray-400 hover:text-cyan-300'
            }`}
            data-testid="tab-inbox"
          >
            📥 Inbox
          </button>
        </div>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif: Notification) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notif.read
                    ? 'bg-[#0b1618] border-[#1e3a3f]'
                    : 'bg-[#1a3a3f] border-cyan-500/30'
                }`}
                data-testid={`notification-${notif.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{notif.title}</h3>
                    <p className="text-gray-300 text-sm mt-1">{notif.message}</p>
                    <span className="text-xs text-gray-500 mt-2 inline-block">
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#0b1618] rounded-lg border border-[#1e3a3f]" data-testid="empty-notifications">
            <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">
              {tab === 'unread' ? 'No new notifications' : 'No notifications yet'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {tab === 'unread'
                ? 'Place bets to receive notifications'
                : 'Your notifications will appear here'}
            </p>
          </div>
        )}

        {/* Demo Notice */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm text-blue-300">
          💡 Notifications are generated when you:
          <ul className="mt-2 ml-4 space-y-1 text-blue-200">
            <li>✓ Place a bet</li>
            <li>✓ Win or lose a settlement</li>
            <li>✓ Make a deposit or withdrawal</li>
            <li>✓ Receive special promotions</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
