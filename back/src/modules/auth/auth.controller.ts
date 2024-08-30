import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.Dto';
import { Public } from 'src/helper/skipAuth';
import * as dotenv from 'dotenv';

dotenv.config();

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/register')
  async create(@Body() createAuthDto: CreateUserDto) {
    return this.authService.register(createAuthDto);
  }

  @Public()
  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    console.log('Validated loginDto:', loginDto);
    return this.authService.login(loginDto);
  }
}
