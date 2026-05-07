import { Controller, Post, Get, Body, Res, Req, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import type { Response } from 'express';



@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private usersService: UsersService, private jwtService: JwtService) { }


    @Get('google')
    googleLogin(@Res() res: Response) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = 'http://localhost:3000/auth/google/callback';

        const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=code` +
            `&scope=openid%20email%20profile` +
            `&access_type=offline`;

        return res.redirect(url);
    }

    @Get('google/callback')
    async googleCallback(@Query('code') code: string, @Res() res: Response) {
        console.log('Received Google auth code:', code);
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID as string,
                client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
                redirect_uri: 'http://localhost:3000/auth/google/callback',
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();
        const access_token = tokenData.access_token;

        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const user = await userRes.json();
        console.log('Google user info:', user);

        let existingUser = await this.usersService.findByEmail(user.email);
        if (!existingUser) {
            existingUser = await this.usersService.create({
                name: user.name,
                email: user.email,
                password: Math.random().toString(36).slice(-8),
            });
        }

        const payload = { sub: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role || 'user' };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_FRESHTOKEN_SECRET,
            expiresIn: '15d',
        });

        const hashRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.usersService.updateRefreshToken(existingUser._id, hashRefreshToken);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            path: '/',
        });

        return res.redirect('http://localhost:5173/oauth2/success');
    }

    @Post('register')
    async register(@Body() userData: CreateUserDto) {
        return this.authService.register(userData);
    }

    @Post('login')
    async login(@Body() loginUserDto: LoginUserDto, @Res({ passthrough: true }) res: Response) {
        return await this.authService.login(loginUserDto, res);
    }

    @Post('refresh')
    async refreshToken(@Req() req: Request) {
        console.log('Raw cookie header:', (req as any).headers.cookie);
        console.log('Parsed cookies:', (req as any).cookies);
        const refreshToken = (req as any).cookies?.refreshToken;
        if (!refreshToken) {
            console.warn('No refresh token found in cookies');
            return { error: 'No refresh token provided' };
        }
        return this.authService.refreshToken(refreshToken);
    }

    @Post('logout')
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = (req as any).cookies?.refreshToken;
        await this.authService.logout(refreshToken);
        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
        return { message: 'Logged out successfully' };
    }
}