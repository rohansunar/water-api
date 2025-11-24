import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Vendor } from '../interfaces/vendor.interface';

export const CurrentVendor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Vendor => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
