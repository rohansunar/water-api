import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CustomerModule } from './customer/customer.module';
import { ProductModule } from './product/product.module';
import { VendorModule } from './vendor/vendor.module';
import { OrderModule } from './order/order.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { RiderModule } from './rider/rider.module';
import { WalletModule } from './wallet/wallet.module';
import { ComplaintModule } from './complaint/complaint.module';
import { LedgerModule } from './ledger/ledger.module';
import { AdminModule } from './admin/admin.module';
import { LoggerModule } from './common/logger/logger.module';
import { EventBusModule } from './common/events/event-bus.module';
import { CustomLoggerService } from './common/logger/logger.service';
import { DatabaseInitService } from './common/database/database-init.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CustomThrottlerGuard } from './common/guards/rate-limit.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/water-jar-delivery',
    ),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    EventBusModule,
    LoggerModule,
    AuthModule,
    UserModule,
    CustomerModule,
    VendorModule,
    ProductModule,
    OrderModule,
    SubscriptionModule,
    RiderModule,
    WalletModule,
    ComplaintModule,
    LedgerModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseInitService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useFactory: (customLogger: CustomLoggerService) =>
        new HttpExceptionFilter(customLogger),
      inject: [CustomLoggerService],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, SecurityMiddleware).forRoutes('*');
  }
}
