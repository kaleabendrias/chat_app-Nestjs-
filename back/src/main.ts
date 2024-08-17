import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeDataSource } from './database/datasource';

async function bootstrap() {
  await initializeDataSource();

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
