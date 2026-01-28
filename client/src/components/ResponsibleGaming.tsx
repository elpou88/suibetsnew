import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface UserLimits {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  sessionReminderMinutes: number;
  selfExclusionUntil: string | null;
}

export function SessionTimer() {
  const { walletAddress } = useAuth();
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderInterval, setReminderInterval] = useState(60);
  const [lastReminderAt, setLastReminderAt] = useState(0);

  // Load user's reminder interval from backend
  useEffect(() => {
    if (walletAddress) {
      fetch(`/api/user/limits?wallet=${walletAddress}`)
        .then(res => res.json())
        .then(data => {
          if (data.limits?.sessionReminderMinutes) {
            setReminderInterval(data.limits.sessionReminderMinutes);
          }
        })
        .catch(() => {});
    }
  }, [walletAddress]);

  useEffect(() => {
    const startTime = sessionStorage.getItem('sessionStart');
    if (!startTime) {
      sessionStorage.setItem('sessionStart', Date.now().toString());
    }

    const interval = setInterval(() => {
      const start = parseInt(sessionStorage.getItem('sessionStart') || Date.now().toString());
      const minutes = Math.floor((Date.now() - start) / 60000);
      setSessionMinutes(minutes);

      // Show reminder every interval minutes (but not if already shown at this interval)
      if (minutes > 0 && minutes >= reminderInterval && minutes - lastReminderAt >= reminderInterval && !showReminder) {
        setShowReminder(true);
        setLastReminderAt(minutes);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [reminderInterval, showReminder, lastReminderAt]);

  if (!showReminder) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="session-reminder">
      <Card className="bg-[#111111] border-yellow-500/50 max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white">
            You've been playing for <span className="font-bold text-yellow-400">{sessionMinutes} minutes</span>.
          </p>
          <p className="text-gray-400 text-sm">
            Remember to take regular breaks and gamble responsibly.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReminder(false)}
              className="flex-1"
              data-testid="btn-continue-session"
            >
              Continue
            </Button>
            <Button
              variant="default"
              onClick={() => {
                sessionStorage.removeItem('sessionStart');
                window.location.href = '/';
              }}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              data-testid="btn-take-break"
            >
              Take a Break
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function BettingLimitsPanel() {
  const { walletAddress } = useAuth();
  const { toast } = useToast();
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [sessionReminder, setSessionReminder] = useState('60');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetch(`/api/user/limits?wallet=${walletAddress}`)
        .then(res => res.json())
        .then(data => {
          if (data.limits) {
            setLimits(data.limits);
            setDailyLimit(data.limits.dailyLimit?.toString() || '');
            setWeeklyLimit(data.limits.weeklyLimit?.toString() || '');
            setMonthlyLimit(data.limits.monthlyLimit?.toString() || '');
            setSessionReminder(data.limits.sessionReminderMinutes?.toString() || '60');
          }
        })
        .catch(console.error);
    }
  }, [walletAddress]);

  const handleSave = async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    try {
      await fetch('/api/user/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          dailyLimit: dailyLimit ? parseFloat(dailyLimit) : null,
          weeklyLimit: weeklyLimit ? parseFloat(weeklyLimit) : null,
          monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : null,
          sessionReminderMinutes: parseInt(sessionReminder) || 60
        })
      });
      toast({ title: 'Limits saved successfully' });
    } catch (error) {
      toast({ title: 'Failed to save limits', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <Card className="bg-[#111111] border-cyan-900/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          Betting Limits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-400 text-sm">
          Set limits to help manage your betting activity. Values are in USD equivalent.
        </p>

        {limits && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-[#0a0a0a] rounded-lg">
            <div className="text-center">
              <p className="text-gray-400 text-xs">Daily Spent</p>
              <p className="text-white font-bold">${limits.dailySpent.toFixed(2)}</p>
              {limits.dailyLimit && (
                <p className="text-cyan-400 text-xs">/ ${limits.dailyLimit}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs">Weekly Spent</p>
              <p className="text-white font-bold">${limits.weeklySpent.toFixed(2)}</p>
              {limits.weeklyLimit && (
                <p className="text-cyan-400 text-xs">/ ${limits.weeklyLimit}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs">Monthly Spent</p>
              <p className="text-white font-bold">${limits.monthlySpent.toFixed(2)}</p>
              {limits.monthlyLimit && (
                <p className="text-cyan-400 text-xs">/ ${limits.monthlyLimit}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-400">Daily Limit ($)</Label>
            <Input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder="No limit"
              className="bg-[#0a0a0a] border-gray-700"
              data-testid="input-daily-limit"
            />
          </div>
          <div>
            <Label className="text-gray-400">Weekly Limit ($)</Label>
            <Input
              type="number"
              value={weeklyLimit}
              onChange={(e) => setWeeklyLimit(e.target.value)}
              placeholder="No limit"
              className="bg-[#0a0a0a] border-gray-700"
              data-testid="input-weekly-limit"
            />
          </div>
          <div>
            <Label className="text-gray-400">Monthly Limit ($)</Label>
            <Input
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="No limit"
              className="bg-[#0a0a0a] border-gray-700"
              data-testid="input-monthly-limit"
            />
          </div>
          <div>
            <Label className="text-gray-400">Session Reminder (min)</Label>
            <Input
              type="number"
              value={sessionReminder}
              onChange={(e) => setSessionReminder(e.target.value)}
              placeholder="60"
              className="bg-[#0a0a0a] border-gray-700"
              data-testid="input-session-reminder"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading || !walletAddress}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black"
          data-testid="btn-save-limits"
        >
          {isLoading ? 'Saving...' : 'Save Limits'}
        </Button>

        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
          <p className="text-yellow-400 text-xs">
            If you feel you may have a gambling problem, please seek help at BeGambleAware.org
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
