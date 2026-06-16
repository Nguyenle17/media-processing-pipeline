import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) { }

    async login(LoginUserDto: LoginUserDto, res: any) {
        try {
            const user = await this.usersService.findByEmail(LoginUserDto.email);
            
            if (!user) {
                throw new NotFoundException('User not found');
            }

            if (!user.isActivate) {
                throw new UnauthorizedException('Account is banned');
            }

            const hashedPassword = bcrypt.hashSync(LoginUserDto.password, user.password.slice(0, 29));
            const isPasswordMatching = hashedPassword === user.password;
            if (!isPasswordMatching) {
                throw new UnauthorizedException('Invalid credentials');
            }

            const payload = { sub: user._id, name: user.name, email: user.email };
            const accessToken = this.jwtService.sign(payload);
            const refreshToken = this.jwtService.sign(payload, {
                secret: process.env.JWT_FRESHTOKEN_SECRET,
                expiresIn: '15d',
            });
            const hashRefreshToken = await bcrypt.hash(refreshToken, 10);
            await this.usersService.updateRefreshToken(user._id, hashRefreshToken);
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
            });
            return {
                accessToken,
            };
        } catch (error) {
            throw error;
        }
    }

    async register(userData: CreateUserDto) {
        try {
            const existingUser = await this.usersService.findByEmail(userData.email);
            if (existingUser) {
                throw new UnauthorizedException('User already exists');
            }
            return this.usersService.create(userData);
        } catch (error) {
            throw error;
        }
    }

    async refreshToken(refreshToken: string) {
        try {
            const decoded = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_FRESHTOKEN_SECRET,
            });
            const user = await this.usersService.findById(decoded.sub);
            if (!user || !user.refreshToken) {
                throw new UnauthorizedException('Invalid refresh token');
            }
            const isRefreshTokenMatching = await bcrypt.compare(refreshToken, user.refreshToken);
            if (!isRefreshTokenMatching) {
                throw new UnauthorizedException('Invalid refresh token');
            }
            const payload = { sub: user._id, name: user.name, email: user.email, settings: user.selectedModel || 'tiny', role: user.role || 'user' };
            const newAccessToken = this.jwtService.sign(payload);
            return {
                accessToken: newAccessToken,
            };
        } catch (error) {
            throw error;
        }
    }

    async logout(refreshToken: string) {
        try {
            const decoded = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_FRESHTOKEN_SECRET,
            });
            const userId = decoded.sub;
            await this.usersService.updateRefreshToken(userId, "");
        } catch (error) {
            throw error;
        }
    }
}