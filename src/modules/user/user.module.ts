import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { User, UserSchema, UserAddress, UserAddressSchema } from './entities/user.entity';
import { EventBusModule } from '../../common/events/event-bus.module';
import { LoggerModule } from '../../common/logger/logger.module';

/**
 * User Module
 * Self-contained module for user management
 * Microservices-ready with event-driven communication
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserAddress.name, schema: UserAddressSchema },
    ]),
    EventBusModule,
    LoggerModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'IUserService',
      useExisting: UserService,
    },
  ],
  exports: [
    UserService,
    'IUserService',
  ],
})
export class UserModule {}
