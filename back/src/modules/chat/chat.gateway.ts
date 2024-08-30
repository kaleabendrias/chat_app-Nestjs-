/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  HttpStatus,
  Logger,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from 'src/modules/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsGuard } from 'src/guards/Ws.guard';
import { customWsException } from 'src/helpers/wsException';
import { CreateRoomDto } from './dto/create-room.dto';

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

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  @UseGuards(WsGuard)
  async handleConnection(client: Socket) {
    const maskedId = this.maskClientId(client.id);
    const { sockets } = this.server.sockets;
    try {
      const token = client.handshake?.headers?.authorization?.split(' ')[1];
      if (!token) {
        throw new customWsException(
          'Missing authentication token',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.data.user = payload;
      this.logger.debug(`User authenticated with id: ${payload.sub}`);
    } catch (error) {
      this.logger.error(
        `Authentication error for client id: ${maskedId}`,
        error.stack,
      );
      client.disconnect();
    }
    this.logger.log(`Client id: ${maskedId} connected`);
    this.logger.debug(`Number of connected clients: ${sockets.size}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client id: ${client.id} disconnected`);
  }

  @SubscribeMessage('message')
  @UseGuards(WsGuard)
  async handleMessage(
    client: Socket,
    payload: {
      text: string;
      photoUrl?: string;
      chatRoomId: string;
    },
  ) {
    console.log('Received payload:', payload);
    const maskedId = this.maskClientId(client.id);
    this.logger.log(`Message received from client id: ${maskedId}`);

    if (!client.data.user) {
      throw new customWsException(
        'Unauthorized: User must be authenticated to create a room',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }

    const userId = client.data.user.payload;
    console.log('user:', userId);
    console.log('text:', payload.text);
    console.log('chatRoomId:', payload.chatRoomId);

    if (!payload.text || !payload.chatRoomId || !userId) {
      this.logger.error('Invalid payload received');
      client.emit('Error', 'Invalid message payload');
      return;
    }
    const messagePayload = {
      ...payload,
      userId,
    };
    const message = await this.chatService.createMessage(messagePayload);
    this.server.emit('receiveMessage', { data: { payload } });
  }

  @SubscribeMessage('createRoom')
  @UseGuards(WsGuard)
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() createRoomDto: CreateRoomDto,
  ) {
    const maskedId = this.maskClientId(client.id);

    try {
      if (!client.data.user) {
        throw new customWsException(
          'Unauthorized: User must be authenticated to create a room',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!createRoomDto.name || !createRoomDto.participants) {
        this.logger.error('Invalid payload received');
        client.emit('Error', 'Invalid message payload');
        return;
      }

      if (typeof createRoomDto === 'string') {
        createRoomDto = JSON.parse(createRoomDto);
      }

      this.logger.debug(
        `createRoomDto: ${JSON.stringify(createRoomDto, null, 2)}`,
      );

      const roomData = {
        ...createRoomDto,
        creatorId: client.data.user.sub,
      };
      this.logger.debug(`roomData: ${JSON.stringify(roomData, null, 2)}`);

      const existingRoom = await this.chatService.findRoomByParticipants(
        roomData.participants,
      );

      if (existingRoom) {
        this.logger.log(`Returning existing room for client id: ${maskedId}`);
        return { status: 'success', room: existingRoom };
      }

      const newRoom = await this.chatService.createRoom(roomData);

      this.server.emit('roomCreated', { room: newRoom });

      this.logger.log(`Room created by client id: ${maskedId}`);
      return { status: 'success', room: newRoom };
    } catch (error) {
      this.logger.error(
        `Error creating room for client id: ${maskedId}`,
        error.stack,
      );
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload) {
    // Extract chatRoomId from payload object
    console.log(payload);

    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }

    const { chatRoomId } = payload;

    console.log(chatRoomId);

    if (!chatRoomId) {
      this.logger.error('Invalid chatRoomId received');
      client.emit('Error', 'Invalid chatRoomId');
      return;
    }

    client.join(chatRoomId);

    const message = await this.chatService.getMessages(chatRoomId);

    client.emit('ChatHistory', { data: { message } });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, chatRoomId: string) {
    client.leave(chatRoomId);
  }
}
