import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findByID(+id);
  }

  @Get('/test/1')
  async test(@Req() req): Promise<User> {
    const user = req.user;
    const foundUser = await this.userRepository.findOne({
      where: { id: user.id },
    });
    return foundUser;
  }
}
