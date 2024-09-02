import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Message } from './entities/message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chatRoom.entities';
import { UsersService } from '../users/users.service';
import { WsException } from '@nestjs/websockets';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    private userService: UsersService,
  ) {}

  async createRoom(createRoomDto) {
    const { name, creatorId, participants } = createRoomDto;

    const creator = await this.userService.findByID(creatorId);
    if (!creator) {
      throw new HttpException(
        `User with ID ${creatorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    for (const participantId of participants) {
      const participant = await this.userService.findByID(participantId);
      if (!participant) {
        throw new HttpException(
          `User with ID ${participantId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const chatRoom = this.chatRoomRepository.create({
      name,
      creator,
      participants,
    });

    return await this.chatRoomRepository.save(chatRoom);
  }

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

  async getMessages(chatRoomId: string): Promise<any[]> {
    if (!chatRoomId) {
      throw new Error('Invalid chatRoomId');
    }
    console.log(`Getting messages for chatRoomId: ${chatRoomId}`);
    const messages = await this.messageRepository.find({
      where: { chatRoom: { id: chatRoomId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    const sanitizedMessages = messages.map((message) =>
      instanceToPlain(message),
    );
    console.log(`messages: ${sanitizedMessages}`);
    return sanitizedMessages;
  }

  async findRoomByParticipants(
    participants: number[],
  ): Promise<ChatRoom | null> {
    const participantsArrayLiteral = `{${participants.join(',')}}`;

    return this.chatRoomRepository
      .createQueryBuilder('room')
      .where('room.participants @> :participants', {
        participants: participantsArrayLiteral,
      })
      .getOne();
  }
}
