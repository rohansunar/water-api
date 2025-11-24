import { Injectable, Logger } from '@nestjs/common';
import * as Joi from 'joi';

/**
 * Environment Variable Validation Service
 *
 * This service validates all environment variables required by the application,
 * ensuring proper configuration for database, authentication, and external services.
 *
 * Supabase Storage Configuration Requirements:
 * - SUPABASE_URL: Your Supabase project URL (found in Project Settings > API)
 * - SUPABASE_ANON_KEY: Public anonymous key (safe for client-side use)
 * - SUPABASE_STORAGE_BUCKET: Storage bucket name (default: 'images')
 * - SUPABASE_PUBLIC_ACCESS: Enable public file access (default: true)
 *
 * Configuration Sources:
 * - Project URL: https://[project-id].supabase.co
 * - API Keys: Available in Supabase Dashboard > Settings > API
 * - Storage Bucket: Created in Supabase Dashboard > Storage
 *
 * Security Notes:
 * - SUPABASE_ANON_KEY is safe for client-side use (Row Level Security applies)
 * - Never expose service role keys in client applications
 * - Storage access is controlled by bucket policies and RLS
 */
@Injectable()
export class EnvValidationService {
  private readonly logger = new Logger(EnvValidationService.name);

  // Mandatory environment variables required for application startup
  private readonly mandatoryVars = [
    'DATABASE_URL', // PostgreSQL database connection string
    'JWT_SECRET', // Secret key for JWT token signing
    'JWT_ADMIN_SECRET', // Secret key for admin JWT token signing
    'SUPABASE_URL', // Supabase project URL (e.g., https://your-project.supabase.co)
    'SUPABASE_ANON_KEY', // Supabase anonymous/public API key for client access
  ];

  // Optional environment variables with default values
  private readonly optionalVars = [
    'PORT', // Server port (default: 3000)
    'FRONTEND_URL', // Frontend application URL for CORS
    'LOG_LEVEL', // Logging level: error, warn, info, debug, verbose
    'JWT_EXPIRES_IN', // JWT token expiration time
    'NODE_ENV', // Environment: development, production, test
    'LOG_DIR', // Directory for log file storage
    'THROTTLE_TTL', // Rate limiting time window in seconds
    'THROTTLE_LIMIT', // Maximum requests per time window
    'SUPABASE_STORAGE_BUCKET', // Supabase Storage bucket name (default: 'images')
    'SUPABASE_PUBLIC_ACCESS', // Enable public access to storage files (default: true)
  ];

  // Joi validation schema for environment variables
  private readonly schema = Joi.object({
    // Database Configuration
    DATABASE_URL: Joi.string().uri().required(), // PostgreSQL connection string

    // JWT Authentication
    JWT_SECRET: Joi.string().min(1).required(), // Main JWT signing secret
    JWT_ADMIN_SECRET: Joi.string().min(1).required(), // Admin JWT signing secret

    // Supabase Storage Configuration
    SUPABASE_URL: Joi.string().uri().required(), // Supabase project URL (https://xxx.supabase.co)
    SUPABASE_ANON_KEY: Joi.string().min(1).required(), // Public anonymous key for client-side access

    // Server Configuration
    PORT: Joi.number().integer().min(1).max(65535).optional(), // Server listening port

    // CORS and Frontend
    FRONTEND_URL: Joi.string().uri().optional(), // Frontend URL for CORS configuration

    // Logging Configuration
    LOG_LEVEL: Joi.string()
      .valid('error', 'warn', 'info', 'debug', 'verbose')
      .optional(), // Winston logging level

    // JWT Token Configuration
    JWT_EXPIRES_IN: Joi.string().optional(), // Token expiration (e.g., '7d', '24h')

    // Environment
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .optional(), // Node.js environment

    // File System
    LOG_DIR: Joi.string().optional(), // Directory for log files

    // Rate Limiting
    THROTTLE_TTL: Joi.number().integer().min(1).optional(), // Rate limit window (seconds)
    THROTTLE_LIMIT: Joi.number().integer().min(1).optional(), // Max requests per window

    // Supabase Storage Settings
    SUPABASE_STORAGE_BUCKET: Joi.string().optional().default('images'), // Storage bucket name
    SUPABASE_PUBLIC_ACCESS: Joi.boolean().optional().default(true), // Public file access
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
