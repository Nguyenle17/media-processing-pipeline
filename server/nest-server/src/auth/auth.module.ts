import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthController } from './google-auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { GoogleOAuthService } from './google.auth.service';
import { ACCESS_TOKEN_EXPIRES_IN } from './configs/config';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // getOrThrow: thiếu JWT_SECRET thì báo lỗi ngay lúc khởi động thay vì lỗi lúc sign
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        // config lưu ms, jwt cần giây; trước đây bị hard-code '15m' bỏ qua config
        signOptions: { expiresIn: Math.floor(ACCESS_TOKEN_EXPIRES_IN / 1000) },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleOAuthService],
  controllers: [AuthController, GoogleAuthController],
  exports: [AuthService, GoogleOAuthService],
})
export class AuthModule {}
