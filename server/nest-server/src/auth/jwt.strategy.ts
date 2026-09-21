import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { AuthUser } from './interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      settings: payload.settings,
    };
  }
}
