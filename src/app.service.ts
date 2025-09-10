import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Water Jar Delivery API - Ready to serve! 💧';
  }
}
