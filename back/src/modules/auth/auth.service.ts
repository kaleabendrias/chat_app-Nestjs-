import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.Dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  async register(createAuthDto: CreateUserDto) {
    const { username, email, password } = createAuthDto;

    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      throw new HttpException(
        'User with this email already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      email,
    });
    return this.userRepository.save(newUser);
  }

  async login(loginDto: LoginDto) {
    this.logger.debug('token: ', process.env.JWT_SECRET);
    const { email, password: loginPassword } = loginDto;

    const existingUser = await this.userService.findByEmail(email);

    if (!existingUser) {
      throw new HttpException(
        'Invaid email or password',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordCompare = await bcrypt.compare(
      loginPassword,
      existingUser.password,
    );

    if (!passwordCompare) {
      throw new HttpException(
        'invalid email or password',
        HttpStatus.BAD_REQUEST,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithOutPassword } = existingUser;
    const token = await this.signToken(existingUser.id);
    this.logger.debug(`token: ${token}`);
    return { userWithOutPassword, accessToken: token };
  }
  async signToken(userId) {
    return await this.jwtService.sign({ sub: userId });
  }
}
