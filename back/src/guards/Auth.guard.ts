import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'src/helper/skipAuth';
import { Request } from 'express';
import { Socket } from 'socket.io';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const client = context.switchToWs().getClient<Socket>();

    const token = request
      ? this.extractTokenFromHeader(request)
      : this.extractTokenFromWebSocket(client);

    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublicRoute) {
      return true;
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      if (this.isExpiredToken(payload)) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'You are not authorized',
          status_code: HttpStatus.UNAUTHORIZED,
        });
      }

      if (request) {
        request['user'] = payload;
        request['token'] = token;
      } else {
        client['user'] = payload;
        client['token'] = token;
      }
    } catch {
      throw new UnauthorizedException({
        status: 'error',
        message: 'You are not authorized',
        status_code: HttpStatus.UNAUTHORIZED,
      });
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromWebSocket(client: Socket): string | undefined {
    const token = client.handshake.headers.authorization;
    const [type, authToken] = token.split(' ') ?? [];
    return type === 'Bearer' ? authToken : undefined;
  }

  private isExpiredToken(token: any): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return token.exp < currentTime;
  }
}
