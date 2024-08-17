import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity()
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User, (user) => user.chatRooms)
  creator: User;

  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];

  @Column('simple-array')
  participants: number[];
}
