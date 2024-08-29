import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  @InjectRepository(User)
  private userRepository: Repository<User>;
  async findByID(id: number): Promise<User> {
    return this.userRepository.findOneBy({ id });
  }

  async findByEmail(email) {
    return this.userRepository.findOne({ where: { email } });
  }
}
