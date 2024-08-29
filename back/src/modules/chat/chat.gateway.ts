/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from 'src/modules/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ cors: { origin: '*' }, transports: ['websocket'] })
export class ChatGateway {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private maskClientId(clientId: string): string {
    return clientId.replace(/.(?=.{4})/g, '*');
  }

  private async authenticateClient(client: Socket): Promise<boolean> {
    try {
      const token = this.extractTokenFromWebSocket(client);
      if (!token) throw new UnauthorizedException('No token provided');

      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      if (this.isExpiredToken(payload)) {
        throw new UnauthorizedException('Token expired');
      }

      client['user'] = payload;
      client['token'] = token;
      return true;
    } catch (error) {
      this.logger.error('Authentication failed', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromWebSocket(client: Socket): string | undefined {
    const token = client.handshake.headers.authorization;
    const [type, authToken] = token ? token.split(' ') : [];
    return type === 'Bearer' ? authToken : undefined;
  }

  private isExpiredToken(token: any): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return token.exp < currentTime;
  }

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  async handleConnection(client: Socket) {
    // try {
    //   const isAuthenticated = await this.authenticateClient(client);
    //   if (isAuthenticated) {
    //     const maskedId = this.maskClientId(client.id);
    //     const { sockets } = this.server.sockets;
    //     this.logger.log(`Client id: ${maskedId} connected`);
    //     this.logger.debug(`Number of connected clients: ${sockets.size}`);
    //   }
    // } catch (error) {
    //   client.disconnect();
    // }

    const maskedId = this.maskClientId(client.id);
    const { sockets } = this.server.sockets;
    this.logger.log(`Client id: ${maskedId} connected`);
    this.logger.debug(`Number of connected clients: ${sockets.size}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client id: ${client.id} disconnected`);
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, payload: any) {
    const maskedId = this.maskClientId(client.id);
    this.logger.log(`Message received from client id: ${maskedId}`);
    this.logger.debug(`Payload: ${payload}`);
    const message = await this.chatService.createMessage(payload);
    this.server.emit('receiveMessage', { data: { payload } });
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, chatRoomId: string) {
    client.join(chatRoomId);
    const message = await this.chatService.getMessages(chatRoomId);
    client.emit('ChatHistory', { data: { message } });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, chatRoomId: string) {
    client.leave(chatRoomId);
  }
}
