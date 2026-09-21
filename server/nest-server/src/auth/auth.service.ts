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
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/schemas/user.schema';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { REFRESH_TOKEN_EXPIRES_IN, setRefreshCookie } from './configs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthUser } from './interfaces/auth-user.interface';
import type { GoogleProfile } from './interfaces/google-profile.interface';

/** Trước đây buildPayload dùng 'tiny' còn toPublicUser dùng 'base' -> không nhất quán. */
const DEFAULT_MODEL = 'base';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Sửa typo: JWT_FRESHTOKEN_SECRET -> JWT_REFRESH_SECRET (nhớ đổi trong .env)
  private get refreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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
      // jwt.sign nhận GIÂY, config lưu MILLISECONDS
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
    // user.password có thể rỗng (tài khoản đăng ký bằng Google) -> bcrypt.compare sẽ throw
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

    // Trước đây login không kiểm tra ban, chỉ refresh mới kiểm tra
    if (!user.isActivate) {
      throw new UnauthorizedException('Account is banned');
    }

    const refreshToken = await this.issueRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    return { accessToken: this.signAccessToken(user) };
  }

  /** Đăng nhập bằng Google: tìm user theo email, chưa có thì tạo mới, rồi set refresh cookie. */
  async loginWithGoogle(profile: GoogleProfile, res: Response): Promise<void> {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      // Tài khoản Google không có mật khẩu; dùng mật khẩu ngẫu nhiên để
      // tái sử dụng usersService.create (nơi hash mật khẩu).
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
      throw new ConflictException('User already exists');
    }

    const user = await this.usersService.create(userData);
    return this.toPublicUser(user);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
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
}
