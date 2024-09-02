import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.Dto';
import { User } from '../../users/entities/user.entity';

export function RegisterDocs() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({ summary: 'Register a new user' }),
    ApiBody({ type: CreateUserDto }),
    ApiResponse({
      status: 201,
      description: 'User registered successfully',
      type: User,
    }),
    ApiResponse({
      status: 400,
      description: 'User with this email already exists',
    }),
  );
}

export function LoginDocs() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({ summary: 'Login a user' }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      status: 200,
      description: 'User logged in successfully',
      schema: {
        properties: {
          userWithOutPassword: {
            type: 'object',
            $ref: '#/components/schemas/User',
          },
          accessToken: { type: 'string' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid email or password' }),
  );
}
