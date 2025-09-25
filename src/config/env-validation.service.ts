import { Injectable, Logger } from '@nestjs/common';
import * as Joi from 'joi';

@Injectable()
export class EnvValidationService {
  private readonly logger = new Logger(EnvValidationService.name);

  private readonly mandatoryVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_ADMIN_SECRET',
    'MONGODB_URI',
  ];

  private readonly optionalVars = [
    'PORT',
    'FRONTEND_URL',
    'LOG_LEVEL',
    'JWT_EXPIRES_IN',
    'MONGODB_TEST_URI',
    'NODE_ENV',
    'LOG_DIR',
    'THROTTLE_TTL',
    'THROTTLE_LIMIT',
  ];

  private readonly schema = Joi.object({
    DATABASE_URL: Joi.string().uri().required(),
    JWT_SECRET: Joi.string().min(1).required(),
    JWT_ADMIN_SECRET: Joi.string().min(1).required(),
    MONGODB_URI: Joi.string().uri().required(),
    PORT: Joi.number().integer().min(1).max(65535).optional(),
    FRONTEND_URL: Joi.string().uri().optional(),
    LOG_LEVEL: Joi.string()
      .valid('error', 'warn', 'info', 'debug', 'verbose')
      .optional(),
    JWT_EXPIRES_IN: Joi.string().optional(),
    MONGODB_TEST_URI: Joi.string().uri().optional(),
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .optional(),
    LOG_DIR: Joi.string().optional(),
    THROTTLE_TTL: Joi.number().integer().min(1).optional(),
    THROTTLE_LIMIT: Joi.number().integer().min(1).optional(),
  }).options({ allowUnknown: true });

  validate(): void {
    const { error } = this.schema.validate(process.env);

    if (error) {
      const missingMandatory: string[] = [];
      const invalidVars: string[] = [];

      error.details.forEach((detail) => {
        const key = detail.path[0] as string;

        if (detail.type === 'any.required') {
          if (this.mandatoryVars.includes(key)) {
            missingMandatory.push(key);
          } else if (this.optionalVars.includes(key)) {
            this.logger.warn(`Optional environment variable ${key} is missing`);
          }
        } else {
          invalidVars.push(`${key} (${detail.message})`);
        }
      });

      if (missingMandatory.length > 0) {
        throw new Error(
          `Mandatory environment variables are missing: ${missingMandatory.join(', ')}`,
        );
      }

      if (invalidVars.length > 0) {
        throw new Error(
          `Environment variables are invalid: ${invalidVars.join(', ')}`,
        );
      }
    }
  }
}