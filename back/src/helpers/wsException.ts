import { WsException } from '@nestjs/websockets';

export class customWsException extends WsException {
  constructor(
    message: string,
    private readonly statusCode: number,
  ) {
    super({ message, statusCode });
  }
}
