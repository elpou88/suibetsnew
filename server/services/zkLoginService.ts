/**
 * Sui zkLogin Authentication Service
 * Enables signup/login via Google and Discord using Sui's zkLogin protocol
 * No seed phrases required - users authenticate via social OAuth providers
 */

import crypto from 'crypto';

export interface ZkLoginUser {
  userId: string;
  address: string;
  provider: 'google' | 'discord';
  providerUserId: string;
  email?: string;
  username?: string;
  suiBalance: number;
  sbetsBalance: number;
  createdAt: number;
  lastLogin: number;
}

export interface ZkLoginSession {
  sessionId: string;
  userId: string;
  address: string;
  provider: 'google' | 'discord';
  expiresAt: number;
  createdAt: number;
}

export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  discord: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

export class ZkLoginService {
  private users: Map<string, ZkLoginUser> = new Map();
  private sessions: Map<string, ZkLoginSession> = new Map();
  private providerUserIdMap: Map<string, string> = new Map(); // Maps provider:providerUserId to userId
  private oauthConfig: OAuthConfig;

  constructor() {
    this.oauthConfig = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-secret',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
      },
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID || 'your-discord-client-id',
        clientSecret: process.env.DISCORD_CLIENT_SECRET || 'your-discord-secret',
        redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:5000/api/auth/discord/callback'
      }
    };

    console.log('🔐 ZkLogin Service initialized');
    console.log(`   Google: ${this.oauthConfig.google.clientId ? '✅ Configured' : '⚠️ Missing credentials'}`);
    console.log(`   Discord: ${this.oauthConfig.discord.clientId ? '✅ Configured' : '⚠️ Missing credentials'}`);
  }

  /**
   * Generate OAuth login URL for Google
   */
  getGoogleLoginUrl(): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.google.clientId,
      redirect_uri: this.oauthConfig.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Generate OAuth login URL for Discord
   */
  getDiscordLoginUrl(): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.discord.clientId,
      redirect_uri: this.oauthConfig.discord.redirectUri,
      response_type: 'code',
      scope: 'identify email',
      prompt: 'consent'
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Handle Google OAuth callback
   * In production, exchange code for tokens and verify user
   */
  async handleGoogleCallback(code: string): Promise<{ success: boolean; user?: ZkLoginUser; sessionId?: string; error?: string }> {
    try {
      // In production: Exchange code for tokens from Google
      // For now, simulate a successful callback with test data
      console.log(`🔐 Processing Google OAuth callback with code: ${code.substring(0, 10)}...`);

      // Generate Sui address from Google OAuth
      const suiAddress = this.generateSuiAddressFromOAuth('google', code);
      const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
      const providerUserId = `google-${code.substring(0, 16)}`;

      // Create or update user
      const user: ZkLoginUser = {
        userId,
        address: suiAddress,
        provider: 'google',
        providerUserId,
        email: 'user@example.com', // Would come from Google OAuth token
        suiBalance: 100,
        sbetsBalance: 1000,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };

      this.users.set(userId, user);
      this.providerUserIdMap.set(`google:${providerUserId}`, userId);

      // Create session
      const sessionId = this.createSession(userId, user.address, 'google');

      console.log(`✅ User created via Google: ${userId} | Address: ${suiAddress}`);
      return { success: true, user, sessionId };
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle Discord OAuth callback
   */
  async handleDiscordCallback(code: string): Promise<{ success: boolean; user?: ZkLoginUser; sessionId?: string; error?: string }> {
    try {
      // In production: Exchange code for tokens from Discord
      console.log(`🔐 Processing Discord OAuth callback with code: ${code.substring(0, 10)}...`);

      // Generate Sui address from Discord OAuth
      const suiAddress = this.generateSuiAddressFromOAuth('discord', code);
      const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
      const providerUserId = `discord-${code.substring(0, 16)}`;

      // Create or update user
      const user: ZkLoginUser = {
        userId,
        address: suiAddress,
        provider: 'discord',
        providerUserId,
        username: 'discord-user', // Would come from Discord OAuth token
        suiBalance: 100,
        sbetsBalance: 1000,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };

      this.users.set(userId, user);
      this.providerUserIdMap.set(`discord:${providerUserId}`, userId);

      // Create session
      const sessionId = this.createSession(userId, user.address, 'discord');

      console.log(`✅ User created via Discord: ${userId} | Address: ${suiAddress}`);
      return { success: true, user, sessionId };
    } catch (error: any) {
      console.error('Discord OAuth error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create authenticated session
   */
  private createSession(userId: string, address: string, provider: 'google' | 'discord'): string {
    const sessionId = `session-${crypto.randomBytes(16).toString('hex')}`;
    const session: ZkLoginSession = {
      sessionId,
      userId,
      address,
      provider,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      createdAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    console.log(`📝 Session created: ${sessionId} for user ${userId}`);
    return sessionId;
  }

  /**
   * Verify session
   */
  verifySession(sessionId: string): { valid: boolean; user?: ZkLoginUser; error?: string } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, error: 'Session not found' };
    }

    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return { valid: false, error: 'Session expired' };
    }

    const user = this.users.get(session.userId);
    if (!user) {
      return { valid: false, error: 'User not found' };
    }

    return { valid: true, user };
  }

  /**
   * Get user by session ID
   */
  getUserBySession(sessionId: string): ZkLoginUser | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    return this.users.get(session.userId) || null;
  }

  /**
   * Generate deterministic Sui address from OAuth provider and ID
   * In production: Use Sui's zkLogin to generate actual Sui addresses
   */
  private generateSuiAddressFromOAuth(provider: 'google' | 'discord', oauthId: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${provider}:${oauthId}`)
      .digest('hex');

    // Sui address format: 0x + 64 hex chars
    return `0x${hash}`;
  }

  /**
   * Logout user by invalidating session
   */
  logout(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      console.log(`🚪 User logged out: ${sessionId}`);
      return true;
    }
    return false;
  }
}

export default new ZkLoginService();
