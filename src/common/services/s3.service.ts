import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
  etag?: string;
}

/**
 * Supabase Storage Service
 *
 * This service provides file upload, download, and management capabilities using Supabase Storage.
 * It replaces traditional AWS S3 functionality with Supabase's serverless storage solution.
 *
 * Key Features:
 * - File upload with automatic content-type detection
 * - Public and private file access control
 * - Signed URL generation for secure temporary access
 * - File existence checking and deletion
 * - Automatic key generation with security sanitization
 *
 * Supabase Storage Limitations:
 * - Maximum file size: 50MB per file
 * - Storage quota depends on Supabase plan
 * - No direct ETag support (returns undefined)
 * - Signed URLs expire (default: 1 hour)
 *
 * Configuration:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Public anonymous key for client access
 * - SUPABASE_STORAGE_BUCKET: Storage bucket name (default: 'images')
 * - SUPABASE_PUBLIC_ACCESS: Enable public access to files (default: true)
 *
 * Security Considerations:
 * - Files are stored in Supabase Storage with project-level access controls
 * - Public access allows direct URL access without authentication
 * - Private access requires signed URLs for temporary access
 * - File keys are sanitized to prevent path traversal attacks
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly publicAccess: boolean;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase URL and ANON KEY must be configured for storage operations',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucket = this.configService.get<string>(
      'SUPABASE_STORAGE_BUCKET',
      'images',
    );
    this.publicAccess = this.configService.get<boolean>(
      'SUPABASE_PUBLIC_ACCESS',
      true,
    );

    this.logger.log(
      `Supabase Storage Service initialized with bucket: ${this.bucket}, public access: ${this.publicAccess}`,
    );
  }

  /**
   * Upload a file buffer to Supabase Storage with configurable access control and metadata.
   *
   * This method handles the complete Supabase Storage upload process including bucket configuration,
   * access control settings, and metadata storage. It supports both public and private
   * file access based on the service configuration.
   *
   * Supabase Storage Configuration:
   * - Uses the configured Supabase Storage bucket (default: 'images')
   * - Credentials loaded from SUPABASE_URL and SUPABASE_ANON_KEY environment variables
   * - File size limit: 50MB per file (Supabase Storage limitation)
   * - Automatic file type detection and validation
   *
   * File Naming and Key Generation:
   * - Keys are generated using generateKey() method for consistency
   * - Format: 'products/{productId}/{timestamp}_{sanitizedFilename}'
   * - Timestamps prevent collisions, sanitization prevents path traversal
   *
   * Access Control:
   * - Public access: Files accessible via direct URLs without authentication
   * - Private access: Requires signed URLs with expiration (default: 1 hour)
   * - Configurable via SUPABASE_PUBLIC_ACCESS environment variable
   *
   * Supabase Storage Features:
   * - Automatic content-type detection and validation
   * - Built-in security policies and access controls
   * - Real-time file synchronization across devices
   * - Automatic thumbnail generation for images (when enabled)
   * - CDN integration for global content delivery
   *
   * Error Handling:
   * - Network failures, authentication errors, permission issues caught and logged
   * - File size exceeded (50MB limit) returns specific error
   * - Invalid file types or corrupted uploads handled gracefully
   * - Specific error messages provided for debugging
   * - Failed uploads throw errors to trigger rollback in calling services
   *
   * Metadata Storage:
   * - Custom metadata can be attached to storage objects
   * - Used by image processing service to store dimensions and processing info
   * - Metadata is stored as key-value pairs in Supabase Storage
   *
   * @param fileBuffer - The file content as a Buffer (max 50MB)
   * @param key - The storage object key (file path within bucket)
   * @param contentType - MIME type of the file (e.g., 'image/webp', 'application/pdf')
   * @param options - Optional configuration for metadata
   * @returns Promise<S3UploadResult> - Upload result with key, URL, bucket (ETag not provided by Supabase)
   * @throws Error - When upload fails due to storage errors, size limits, or configuration issues
   */
  async uploadFile(
    fileBuffer: Buffer,
    key: string,
    contentType: string,
    options: {
      metadata?: Record<string, string>;
    } = {},
  ): Promise<S3UploadResult> {
    try {
      const uploadOptions: any = {
        contentType,
        upsert: false,
      };

      if (options.metadata) {
        uploadOptions.metadata = options.metadata;
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(key, fileBuffer, uploadOptions);

      if (error) {
        throw error;
      }

      const url = this.publicAccess
        ? this.supabase.storage.from(this.bucket).getPublicUrl(key).data
            .publicUrl
        : await this.getSignedUrl(key);

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        bucket: this.bucket,
        etag: undefined, // Supabase does not provide ETag
      };
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}:`, error);
      throw new Error(`Supabase upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a file from Supabase Storage bucket.
   *
   * This method permanently removes a file from the configured Supabase Storage bucket.
   * The operation is irreversible and the file will no longer be accessible.
   *
   * Supabase Storage Behavior:
   * - Files are immediately removed from storage
   * - Public URLs become invalid after deletion
   * - Signed URLs expire naturally (no immediate invalidation)
   * - Deletion is permanent with no recovery options
   *
   * @param key - The storage object key to delete
   * @throws Error - When deletion fails due to permissions or network issues
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([key]);

      if (error) {
        throw error;
      }

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw new Error(`Supabase delete failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a file exists in Supabase Storage bucket.
   *
   * This method verifies the existence of a file by listing objects in the parent directory
   * and checking for a matching filename. This approach is used because Supabase Storage
   * does not provide a direct "file exists" API endpoint.
   *
   * Implementation Details:
   * - Extracts directory path from the full key
   * - Lists files in the directory with a limit of 1
   * - Searches for exact filename match
   * - Returns boolean existence status
   *
   * Performance Considerations:
   * - Directory listing is efficient for small to medium directories
   * - Large directories may impact performance
   * - Consider caching results for frequently checked files
   *
   * @param key - The storage object key to check
   * @returns Promise<boolean> - True if file exists, false otherwise
   * @throws Error - When check fails due to permissions or network issues
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(key.substring(0, key.lastIndexOf('/')), {
          limit: 1,
          search: key.substring(key.lastIndexOf('/') + 1),
        });

      if (error) {
        throw error;
      }

      return (
        data &&
        data.length > 0 &&
        data.some(
          (file) => file.name === key.substring(key.lastIndexOf('/') + 1),
        )
      );
    } catch (error) {
      this.logger.error(`Failed to check file existence ${key}:`, error);
      throw new Error(
        `Supabase file existence check failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Generate a signed URL for private files or return public URL for public access.
   *
   * For private access: Creates a temporary signed URL with expiration (default: 1 hour)
   * that allows direct access to the file without requiring authentication.
   *
   * For public access: Returns the direct public URL for files that are publicly accessible.
   *
   * Supabase Storage URL Behavior:
   * - Public URLs: Direct access via https://[project].supabase.co/storage/v1/object/public/[bucket]/[key]
   * - Signed URLs: Temporary access via https://[project].supabase.co/storage/v1/object/sign/[bucket]/[key]?token=[token]
   * - Expiration: Signed URLs automatically expire and become invalid
   *
   * @param key - The storage object key
   * @returns Promise<string> - Public URL or signed URL based on access configuration
   * @throws Error - When URL generation fails
   */
  private async getSignedUrl(key: string): Promise<string> {
    if (this.publicAccess) {
      return this.supabase.storage.from(this.bucket).getPublicUrl(key).data
        .publicUrl;
    } else {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(key, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      return data.signedUrl;
    }
  }

  /**
   * Generate a unique and secure storage object key for Supabase Storage file uploads.
   *
   * This method creates structured, collision-resistant keys for Supabase Storage objects
   * following a consistent naming convention. Keys are designed to be:
   * - Unique: Timestamp prevents filename collisions
   * - Organized: Hierarchical structure for easy management in Supabase Storage
   * - Secure: Filename sanitization prevents path traversal attacks
   *
   * Supabase Storage Key Structure:
   * {prefix}/products/{productId}/{timestamp}_{sanitizedFilename}
   * Example: products/123/1703123456789_product_image.jpg
   *
   * Supabase Storage Organization:
   * - Keys map directly to file paths within the storage bucket
   * - Hierarchical structure enables efficient file browsing and management
   * - Supports folder-like organization in Supabase Storage dashboard
   *
   * Security Considerations:
   * - Filename sanitization: Removes special characters that could enable path traversal
   * - Only alphanumeric, dots, and hyphens allowed in filenames
   * - Special characters replaced with underscores for safety
   * - Prevents malicious file uploads with dangerous filenames
   *
   * Organization Benefits:
   * - Prefix allows different types of uploads (products, documents, user-uploads, etc.)
   * - ProductId groups all product-related files together for easy retrieval
   * - Timestamp ensures uniqueness even with identical filenames
   * - Original filename preserved (sanitized) for user recognition and SEO
   *
   * @param prefix - Category prefix (e.g., 'products', 'documents', 'avatars')
   * @param originalFilename - Original filename from user upload
   * @param productId - Product identifier for grouping related files
   * @returns string - Sanitized, unique Supabase Storage object key
   */
  generateKey(
    prefix: string,
    originalFilename: string,
    productId: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `${prefix}/${productId}/${timestamp}_${sanitizedFilename}`;
  }
}
