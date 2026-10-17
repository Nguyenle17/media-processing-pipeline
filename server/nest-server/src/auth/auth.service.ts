import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/schemas/user.schema';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { REFRESH_TOKEN_EXPIRES_IN, setRefreshCookie } from './configs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthUser } from './interfaces/auth-user.interface';
import type { GoogleProfile } from './interfaces/google-profile.interface';
import { EmailService } from 'src/email/email.service';

const DEFAULT_MODEL = 'base';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private get refreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateResetCode(): string {
    return String(randomInt(100000, 1000000));
  }

  private async resendVerificationEmail(user: UserDocument): Promise<void> {
    if (!user.email) return;

    const token = randomBytes(32).toString('hex');
    await this.usersService.updateVerificationToken(
      user._id,
      this.hashToken(token),
      new Date(Date.now() + 15 * 60 * 1000),
    );
    await this.emailService.sendVerificationEmail(user.email, token);
  }

  private isTokenMatching(token: string, hashedToken: string): boolean {
    const a = Buffer.from(this.hashToken(token));
    const b = Buffer.from(hashedToken);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private buildPayload(user: UserDocument): JwtPayload {
    return {
      sub: String(user._id),
      name: user.name ?? '',
      email: user.email ?? '',
      role: user.role || 'user',
      settings: user.selectedModel || DEFAULT_MODEL,
    };
  }

  private toPublicUser(user: UserDocument): AuthUser {
    return {
      userId: String(user._id),
      name: user.name ?? '',
      email: user.email ?? '',
      role: user.role || 'user',
      settings: user.selectedModel || DEFAULT_MODEL,
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      return null;
    }
  }

  signAccessToken(user: UserDocument): string {
    return this.jwtService.sign(this.buildPayload(user));
  }

  async issueRefreshToken(user: UserDocument): Promise<string> {
    const token = this.jwtService.sign(this.buildPayload(user), {
      secret: this.refreshSecret,
      expiresIn: Math.floor(REFRESH_TOKEN_EXPIRES_IN / 1000),
    });
    await this.usersService.updateRefreshToken(user._id, this.hashToken(token));
    return token;
  }

  async login(
    loginUserDto: LoginUserDto,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(loginUserDto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordMatching = await bcrypt.compare(
      loginUserDto.password,
      user.password,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isVerified == false) {
      await this.resendVerificationEmail(user);
      throw new UnauthorizedException('Account is not verified by email');
    }

    if (!user.isActivate) {
      throw new UnauthorizedException('Account is banned');
    }

    const refreshToken = await this.issueRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    return { accessToken: this.signAccessToken(user) };
  }

  async loginWithGoogle(profile: GoogleProfile, res: Response): Promise<void> {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.usersService.create({
        name: profile.name,
        email: profile.email,
        password: randomBytes(32).toString('hex'),
      });
    }

    if (!user.isActivate) {
      throw new UnauthorizedException('Account is banned');
    }

    const refreshToken = await this.issueRefreshToken(user);
    setRefreshCookie(res, refreshToken);
  }

  async register(userData: CreateUserDto): Promise<AuthUser> {
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      if (existingUser.isVerified == false) {
        await this.resendVerificationEmail(existingUser);
        return this.toPublicUser(existingUser);
      }
      throw new ConflictException('User already exists');
    }

    const user = await this.usersService.create(userData);
    await this.resendVerificationEmail(user);

    return this.toPublicUser(user);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);

    const user = await this.usersService.findByVerificationToken(tokenHash);

    if (!user || user.isVerified) {
      throw new UnauthorizedException('Invalid verification token');
    }

    if (
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Verification token expired');
    }

    await this.usersService.markEmailVerified(user._id);

    return { message: 'Email verified successfully' };
  }

  async refreshToken(
    refreshToken: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (
      !user ||
      !user.refreshToken ||
      !this.isTokenMatching(refreshToken, user.refreshToken)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!user.isActivate) {
      throw new UnauthorizedException('Account is banned');
    }

    const rotatedRefreshToken = await this.issueRefreshToken(user);
    setRefreshCookie(res, rotatedRefreshToken);
    return { accessToken: this.signAccessToken(user) };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) return;

    try {
      await this.usersService.updateRefreshToken(payload.sub, null);
    } catch (error: unknown) {
      if (!(error instanceof NotFoundException)) throw error;
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Always return the same response to avoid revealing whether an email exists.
    if (user?.email) {
      const code = this.generateResetCode();
      await this.usersService.updateCodeResetPassword(
        user._id,
        this.hashToken(code),
        new Date(Date.now() + 15 * 60 * 1000),
      );
      await this.emailService.sendCodeToResetPassword(user.email, code);
    }

    return { message: 'If the email exists, a reset code has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(resetPasswordDto.email);
    const codeHash = this.hashToken(resetPasswordDto.code);

    if (
      !user ||
      !user.codeResetPassword ||
      !this.isTokenMatching(resetPasswordDto.code, user.codeResetPassword) ||
      !user.codeResetPasswordExpiredAt ||
      user.codeResetPasswordExpiredAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    const updated = await this.usersService.updatePasswordAndClearResetCode(
      user._id,
      resetPasswordDto.newPassword,
      codeHash,
    );

    if (!updated) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    return { message: 'Password reset successfully' };
  }
}
