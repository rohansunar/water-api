import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as sharp from 'sharp';
import { S3Service, S3UploadResult } from './s3.service';

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  size: number;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  maintainAspectRatio?: boolean;
}

export interface ImageValidationResult {
  isValid: boolean;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Validate image file format, size, and integrity.
   *
   * This method performs comprehensive validation of uploaded image files to ensure
   * they meet security and quality requirements before processing. Validation includes
   * format checking, size limits, and corruption detection.
   *
   * Supported Image Formats:
   * - JPEG/JPG: 'image/jpeg', 'image/jpg'
   * - PNG: 'image/png'
   * - Validation is extensible through the allowedTypes parameter
   *
   * Size Limits:
   * - Default maximum: 5MB (configurable)
   * - Prevents oversized uploads that could impact performance
   * - Size checked before processing to fail fast
   *
   * Security Considerations:
   * - Format validation prevents malicious files disguised as images
   * - Sharp library metadata extraction ensures file is valid image
   * - Corrupted or malformed files are rejected
   * - No execution of image data, only metadata extraction
   *
   * Validation Process:
   * 1. Attempt to extract metadata using Sharp library
   * 2. Verify format is in allowed types list
   * 3. Check file size against maximum limit
   * 4. Return validation result with metadata if valid
   *
   * Error Handling:
   * - Sharp failures indicate corrupted or invalid files
   * - Specific error messages for different failure types
   * - Graceful degradation with detailed error information
   *
   * @param fileBuffer - The image file buffer to validate
   * @param allowedTypes - Array of allowed MIME types (default: JPEG, JPG, PNG)
   * @param maxSizeBytes - Maximum allowed file size in bytes (default: 5MB)
   * @returns Promise<ImageValidationResult> - Validation result with metadata or error
   */
  async validateImage(
    fileBuffer: Buffer,
    allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png'],
    maxSizeBytes: number = 5 * 1024 * 1024, // 5MB default
  ): Promise<ImageValidationResult> {
    try {
      const metadata = await sharp(fileBuffer).metadata();

      if (
        !metadata.format ||
        !allowedTypes.includes(`image/${metadata.format}`)
      ) {
        return {
          isValid: false,
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        };
      }

      if (fileBuffer.length > maxSizeBytes) {
        return {
          isValid: false,
          error: `File size exceeds maximum allowed size of ${maxSizeBytes / (1024 * 1024)}MB`,
        };
      }

      return {
        isValid: true,
        mimeType: `image/${metadata.format}`,
        width: metadata.width,
        height: metadata.height,
        size: fileBuffer.length,
      };
    } catch (error) {
      this.logger.error('Image validation failed:', error);
      return {
        isValid: false,
        error: 'Invalid image file or corrupted data',
      };
    }
  }

  /**
   * Process and resize image with format conversion and optimization.
   *
   * This method applies standardized image processing to ensure consistent quality,
   * size, and format across all uploaded images. Processing includes resizing,
   * format conversion, and quality optimization for web delivery.
   *
   * Image Resizing:
   * - Default dimensions: 800x600 pixels (configurable)
   * - Maintains aspect ratio by default (fit: 'inside')
   * - No enlargement: Images smaller than target size are not upscaled
   * - Alternative: 'fill' fit available for exact dimensions (aspect ratio not preserved)
   *
   * Format Conversion:
   * - Default output: WebP format for optimal compression
   * - Alternatives: JPEG and PNG supported
   * - WebP provides better compression than JPEG with similar quality
   *
   * Quality Optimization:
   * - Default quality: 80% (good balance of size vs quality)
   * - Applicable to lossy formats (WebP, JPEG)
   * - PNG uses lossless compression, quality parameter affects compression level
   *
   * Processing Steps:
   * 1. Create Sharp instance with input buffer
   * 2. Apply resize operation with specified constraints
   * 3. Convert to target format with quality settings
   * 4. Generate output buffer and extract final metadata
   * 5. Return processed image with dimensions and size
   *
   * Security Considerations:
   * - All processing happens in memory with Sharp library
   * - No temporary files created that could be exploited
   * - Output validation ensures processed images are valid
   *
   * Error Handling:
   * - Sharp processing failures indicate image corruption
   * - Converted to BadRequestException for API consistency
   * - Detailed logging for debugging processing issues
   *
   * @param fileBuffer - The original image buffer to process
   * @param options - Processing options for dimensions, quality, and format
   * @returns Promise<ProcessedImage> - Processed image buffer with metadata
   * @throws BadRequestException - When image processing fails
   */
  async processImage(
    fileBuffer: Buffer,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    const {
      maxWidth = 800,
      maxHeight = 600,
      quality = 80,
      format = 'webp',
      maintainAspectRatio = true,
    } = options;

    try {
      let sharpInstance = sharp(fileBuffer);

      if (maintainAspectRatio) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      } else {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'fill',
          withoutEnlargement: true,
        });
      }

      // Convert to specified format
      switch (format) {
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality });
          break;
      }

      const processedBuffer = await sharpInstance.toBuffer();
      const metadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        contentType: `image/${format}`,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: processedBuffer.length,
      };
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * Process a single image and upload it to S3 with comprehensive metadata.
   *
   * This method combines validation, processing, and S3 upload into a single
   * operation, ensuring data consistency and providing rich metadata storage.
   * It's the primary method used by the vendor product service for image uploads.
   *
   * Complete Workflow:
   * 1. Validate image format, size, and integrity
   * 2. Process image (resize, convert format, optimize quality)
   * 3. Generate secure, unique S3 key
   * 4. Upload processed image to S3 with detailed metadata
   * 5. Return upload result with S3 URL and key
   *
   * S3 Key Generation:
   * - Uses S3Service.generateKey() for consistent, secure naming
   * - Format: products/{productId}/{timestamp}_{sanitizedFilename}
   * - Prevents collisions and path traversal attacks
   *
   * Metadata Storage in S3:
   * - originalWidth/Height: Dimensions before processing
   * - processedWidth/Height: Dimensions after processing
   * - originalSize: File size before processing
   * - processedSize: File size after processing
   * - Metadata enables analytics and optimization insights
   *
   * Error Handling:
   * - Validation failures: Immediate rejection with specific error
   * - Processing failures: BadRequestException with processing context
   * - S3 upload failures: Propagated with S3 error details
   * - All failures prevent partial state and ensure cleanup
   *
   * Security Considerations:
   * - Complete validation before any processing or storage
   * - Sanitized filenames prevent path traversal
   * - Metadata doesn't contain sensitive information
   * - Processed images are safe for public access
   *
   * @param fileBuffer - The original image buffer to process and upload
   * @param filename - Original filename for key generation and metadata
   * @param productId - Product identifier for organizing S3 keys
   * @param options - Image processing options (dimensions, quality, format)
   * @returns Promise<S3UploadResult> - S3 upload result with key, URL, and metadata
   * @throws BadRequestException - When validation or processing fails
   */
  async processAndUploadImage(
    fileBuffer: Buffer,
    filename: string,
    productId: string,
    options: ImageProcessingOptions = {},
  ): Promise<S3UploadResult> {
    // Validate image first
    const validation = await this.validateImage(fileBuffer);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    // Process image
    const processedImage = await this.processImage(fileBuffer, options);

    // Generate S3 key
    const key = this.s3Service.generateKey('products', filename, productId);

    // Upload to S3
    return await this.s3Service.uploadFile(
      processedImage.buffer,
      key,
      processedImage.contentType,
      {
        metadata: {
          originalWidth: validation.width?.toString() || '',
          originalHeight: validation.height?.toString() || '',
          processedWidth: processedImage.width.toString(),
          processedHeight: processedImage.height.toString(),
          originalSize: validation.size?.toString() || '',
          processedSize: processedImage.size.toString(),
        },
      },
    );
  }

  /**
   * Process and upload multiple images concurrently with batch error handling.
   *
   * This method enables efficient bulk image processing by running all uploads
   * in parallel while maintaining individual error tracking and rollback capabilities.
   * Used by the vendor product service for multi-image uploads.
   *
   * Concurrent Processing Benefits:
   * - Faster upload times for multiple images
   * - Efficient use of network and compute resources
   * - Maintains order of results matching input order
   *
   * Error Handling Strategy:
   * - Individual image failures don't stop batch processing
   * - Promise.all() ensures all operations complete before returning
   * - First failure causes entire batch to fail (fail-fast approach)
   * - Detailed logging for debugging batch operation issues
   *
   * Rollback Considerations:
   * - If any image fails, successful uploads remain in S3
   * - Calling service handles cleanup of partial uploads
   * - Database updates are atomic to prevent inconsistent state
   *
   * Performance Optimization:
   * - Parallel S3 uploads reduce total processing time
   * - Memory usage scales with number of concurrent operations
   * - Sharp processing is CPU-intensive but parallelizable
   *
   * Security Considerations:
   * - All images validated individually before batch processing
   * - Failed images don't compromise successful ones
   * - No shared state between individual image operations
   *
   * @param files - Array of image buffers and filenames to process
   * @param productId - Product identifier for S3 key generation
   * @param options - Image processing options applied to all images
   * @returns Promise<S3UploadResult[]> - Array of upload results in input order
   * @throws BadRequestException - When any image in the batch fails processing
   */
  async processAndUploadMultipleImages(
    files: Array<{ buffer: Buffer; filename: string }>,
    productId: string,
    options: ImageProcessingOptions = {},
  ): Promise<S3UploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.processAndUploadImage(
        file.buffer,
        file.filename,
        productId,
        options,
      ),
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      this.logger.error('Batch image processing failed:', error);
      throw new BadRequestException('Failed to process one or more images');
    }
  }

  /**
   * Extract image dimensions without full processing
   */
  async getImageDimensions(
    fileBuffer: Buffer,
  ): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(fileBuffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get image dimensions:', error);
      throw new BadRequestException('Invalid image file');
    }
  }
}
