import { Global, Module, OnModuleInit } from '@nestjs/common';
import { EnvValidationService } from './env-validation.service';

@Global()
@Module({
  providers: [EnvValidationService],
  exports: [EnvValidationService],
})
export class ConfigModule implements OnModuleInit {
  constructor(private readonly envValidationService: EnvValidationService) {}

  onModuleInit() {
    this.envValidationService.validate();
  }
}