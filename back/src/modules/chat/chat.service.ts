import { Injectable } from '@nestjs/common';
import { Message } from './entities/message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chatRoom.entities';
import { UsersService } from '../users/users.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    private userService: UsersService,
  ) {}
  async createMessage(payload: {
    text: string;
    photoUrl?: string;
    chatRoomId: string;
    userId: number;
  }): Promise<any> {
    const { text, photoUrl, chatRoomId, userId } = payload;
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });

    if (!chatRoom) {
      throw new WsException('Chat room not found');
    }

    const sender = await this.userService.findByID(userId);

    if (!sender) {
      throw new Error('User not found');
    }

    const message = this.messageRepository.create({
      text,
      photoUrl,
      chatRoom: chatRoom,
      sender: sender,
    });

    return this.messageRepository.save(message);
  }

  async getMessages(chatRoomId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { chatRoom: { id: chatRoomId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }
}
