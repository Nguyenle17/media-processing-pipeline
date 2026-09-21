import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GoogleProfile } from './interfaces/google-profile.interface';
import type { GoogleUserInfo } from './interfaces/google-user-info.interface';
import type { GoogleTokenResponse } from './interfaces/google-token-response.interface';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  REQUEST_TIMEOUT_MS,
} from './configs/config';

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(private readonly configService: ConfigService) {}

  private get clientId(): string {
    return this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
  }

  private get clientSecret(): string {
    return this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
  }

  private get redirectUri(): string {
    return (
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ??
      'http://localhost:3000/auth/google/callback'
    );
  }

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async getProfile(code: string): Promise<GoogleProfile> {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!tokenRes.ok) {
      this.logger.warn(`Google token exchange failed: HTTP ${tokenRes.status}`);
      throw new UnauthorizedException('Google authentication failed');
    }

    const token = (await tokenRes.json()) as GoogleTokenResponse;
    if (!token.access_token) {
      throw new UnauthorizedException('Google authentication failed');
    }

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!userRes.ok) {
      this.logger.warn(`Google userinfo failed: HTTP ${userRes.status}`);
      throw new UnauthorizedException('Could not fetch Google profile');
    }

    const info = (await userRes.json()) as GoogleUserInfo;

    if (!info.email || info.email_verified !== true) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return {
      email: info.email,
      name: info.name ?? info.email,
      picture: info.picture,
    };
  }
}
