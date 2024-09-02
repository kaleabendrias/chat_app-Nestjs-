import * as dotenv from 'dotenv';
import { ChatRoom } from 'src/modules/chat/entities/chatRoom.entities';
import { Message } from 'src/modules/chat/entities/message.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { DataSource } from 'typeorm';

dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';

const dataSource = new DataSource({
  type: process.env.DB_TYPE as 'postgres',
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  database: process.env.DB_NAME,
  entities: [User, Message, ChatRoom],
  migrations: [process.env.DB_MIGRATIONS],
  synchronize: isDevelopment,
  migrationsTableName: 'migrations',
  ssl: process.env.DB_SSL === 'true',
  logging: true,
});

export async function initializeDataSource() {
  if (!dataSource.isInitialized) {
    try {
      await dataSource.initialize();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to the database', error);
    }
  }
  return dataSource;
}

export default dataSource;
