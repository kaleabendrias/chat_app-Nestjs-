import { Exclude } from 'class-transformer';
import { ChatRoom } from 'src/modules/chat/entities/chatRoom.entities';
import { Message } from 'src/modules/chat/entities/message.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  profilePicture?: string;

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @OneToMany(() => ChatRoom, (chatRoom) => chatRoom.creator)
  chatRooms: ChatRoom[];
}
