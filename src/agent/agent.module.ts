import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [OrderModule, UserModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
