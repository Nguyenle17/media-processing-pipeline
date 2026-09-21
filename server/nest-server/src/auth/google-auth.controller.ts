import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google.auth.service';
import { stateCookieOptions } from './configs/config';
import type { RequestWithCookies } from './interfaces/request-with-cookies.interface';

const STATE_COOKIE_NAME = 'oauth_state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL
    );
  }

  private isStateValid(received?: string, saved?: string): boolean {
    if (!received || !saved) return false;
    const a = Buffer.from(received);
    const b = Buffer.from(saved);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  @Get()
  redirectToGoogle(@Res() res: Response): void {
    const state = randomBytes(32).toString('hex');
    res.cookie(STATE_COOKIE_NAME, state, {
      ...stateCookieOptions(),
      maxAge: STATE_MAX_AGE_MS,
    });
    res.redirect(this.googleOAuth.buildAuthUrl(state));
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: RequestWithCookies,
    @Res() res: Response,
  ): Promise<void> {
    const savedState = req.cookies?.[STATE_COOKIE_NAME];
    // state chỉ dùng 1 lần; phải clear với đúng options (path) đã set
    res.clearCookie(STATE_COOKIE_NAME, stateCookieOptions());

    if (error || !code || !this.isStateValid(state, savedState)) {
      this.logger.warn(`Google callback rejected (error=${error ?? 'none'})`);
      return res.redirect(`${this.frontendUrl}/login?error=google_auth_failed`);
    }

    try {
      const profile = await this.googleOAuth.getProfile(code);
      await this.authService.loginWithGoogle(profile, res);
      return res.redirect(`${this.frontendUrl}/auth/callback`);
    } catch (err: unknown) {
      this.logger.warn(
        `Google login failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return res.redirect(`${this.frontendUrl}/login?error=google_auth_failed`);
    }
  }
}
