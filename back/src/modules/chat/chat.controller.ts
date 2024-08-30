import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/create')
  createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.chatService.createRoom(createRoomDto);
  }

  @Post()
  create(@Body() createChatDto: any) {
    return this.chatService.createMessage(createChatDto);
  }
}
