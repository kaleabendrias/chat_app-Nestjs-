import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsGuard implements CanActivate {
  private logger = new Logger(WsGuard.name);
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('Inside of my guard');
    const client: Socket = context.switchToWs().getClient<Socket>();
    try {
      const token = this.extractTokenFromWebSocket(client);
      this.logger.log(token);
      if (!token) {
        this.logger.error('No token provided');
        client.disconnect(); // Disconnect client on failure
        return false;
      }
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });
      if (this.expiredToken(payload)) {
        this.logger.error('Token Expired');
        client.disconnect(); // Disconnect client on failure
        return false;
      }
      client['user'] = payload;
      client['token'] = token;
    } catch (error) {
      this.logger.error('Authentication failed', error.stack);
      client.disconnect(); // Disconnect client on failure
      return false;
    }
    return true;
  }
  private extractTokenFromWebSocket(client: Socket): string | undefined {
    const token = client.handshake.headers.authorization;
    console.log(token);
    const [type, authToken] = token ? token.split(' ') : undefined;
    return type == 'Bearer' ? authToken : undefined;
  }

  private expiredToken(token: any): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return token.exp < currentTime;
  }
}
