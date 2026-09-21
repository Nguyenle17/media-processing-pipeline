import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { REFRESH_COOKIE_NAME, clearRefreshCookie } from './configs/config';
import type { RequestWithCookies } from './interfaces/request-with-cookies.interface';
import type { AuthUser } from './interfaces/auth-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() userData: CreateUserDto): Promise<AuthUser> {
    return this.authService.register(userData);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(loginUserDto, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(
    @Req() req: RequestWithCookies,
  ): Promise<{ accessToken: string }> {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }
    return this.authService.refreshToken(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      await this.authService.logout(token);
    }
    clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }
}
