import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../../src/common/services/s3.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('S3Service', () => {
  let service: S3Service;
  let configService: jest.Mocked<ConfigService>;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn()
        .mockReturnValueOnce('https://test.supabase.co')
        .mockReturnValueOnce('test-anon-key')
        .mockReturnValueOnce('images')
        .mockReturnValueOnce(true),
    };

    mockSupabaseClient = {
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        remove: jest.fn(),
        list: jest.fn(),
        getPublicUrl: jest.fn(),
        createSignedUrl: jest.fn(),
      },
    };

    const { createClient } = require('@supabase/supabase-js');
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file successfully with public access', async () => {
      const mockUploadResponse = { data: { path: 'test-key' }, error: null };
      mockSupabaseClient.storage.from().upload.mockResolvedValue(mockUploadResponse);
      mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/images/test-key' },
      });

      const result = await service.uploadFile(Buffer.from('test'), 'test-key', 'image/webp');

      expect(result).toEqual({
        key: 'test-key',
        url: 'https://test.supabase.co/storage/v1/object/public/images/test-key',
        bucket: 'images',
        etag: undefined,
      });
      expect(mockSupabaseClient.storage.from().upload).toHaveBeenCalledWith('test-key', Buffer.from('test'), {
        contentType: 'image/webp',
        upsert: false,
      });
    });

    it('should upload file successfully with private access', async () => {
      // Create service with private access
      const privateConfigService = {
        get: jest.fn()
          .mockReturnValueOnce('https://test.supabase.co')
          .mockReturnValueOnce('test-anon-key')
          .mockReturnValueOnce('images')
          .mockReturnValueOnce(false), // private access
      };

      const privateModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: privateConfigService,
          },
        ],
      }).compile();

      const privateService = privateModule.get<S3Service>(S3Service);

      const mockUploadResponse = { data: { path: 'test-key' }, error: null };
      mockSupabaseClient.storage.from().upload.mockResolvedValue(mockUploadResponse);
      mockSupabaseClient.storage.from().createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/images/test-key?token=abc' },
        error: null,
      });

      const result = await privateService.uploadFile(Buffer.from('test'), 'test-key', 'image/webp');

      expect(result.url).toBe('https://test.supabase.co/storage/v1/object/sign/images/test-key?token=abc');
    });

    it('should throw error on upload failure', async () => {
      const mockUploadResponse = { data: null, error: { message: 'Upload failed' } };
      mockSupabaseClient.storage.from().upload.mockResolvedValue(mockUploadResponse);

      await expect(service.uploadFile(Buffer.from('test'), 'test-key', 'image/webp')).rejects.toThrow(
        'Supabase upload failed: Upload failed',
      );
    });
  });

  describe('deleteFile', () => {
    // Config already mocked in beforeEach

    it('should delete file successfully', async () => {
      const mockDeleteResponse = { error: null };
      mockSupabaseClient.storage.from().remove.mockResolvedValue(mockDeleteResponse);

      await expect(service.deleteFile('test-key')).resolves.toBeUndefined();
      expect(mockSupabaseClient.storage.from().remove).toHaveBeenCalledWith(['test-key']);
    });

    it('should throw error on delete failure', async () => {
      const mockDeleteResponse = { error: { message: 'Delete failed' } };
      mockSupabaseClient.storage.from().remove.mockResolvedValue(mockDeleteResponse);

      await expect(service.deleteFile('test-key')).rejects.toThrow('Supabase delete failed: Delete failed');
    });
  });

  describe('fileExists', () => {
    // Config already mocked in beforeEach

    it('should return true when file exists', async () => {
      const mockListResponse = {
        data: [{ name: 'test-file.webp' }],
        error: null,
      };
      mockSupabaseClient.storage.from().list.mockResolvedValue(mockListResponse);

      const result = await service.fileExists('products/123/test-file.webp');
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const mockListResponse = {
        data: [],
        error: null,
      };
      mockSupabaseClient.storage.from().list.mockResolvedValue(mockListResponse);

      const result = await service.fileExists('products/123/test-file.webp');
      expect(result).toBe(false);
    });

    it('should throw error on list failure', async () => {
      const mockListResponse = { data: null, error: { message: 'List failed' } };
      mockSupabaseClient.storage.from().list.mockResolvedValue(mockListResponse);

      await expect(service.fileExists('test-key')).rejects.toThrow('Supabase file existence check failed: List failed');
    });
  });

  describe('generateKey', () => {
    // Config already mocked in beforeEach

    it('should generate correct key', () => {
      const key = service.generateKey('products', 'test-image.jpg', '123');
      expect(key).toMatch(/^products\/products\/123\/\d+_test-image\.jpg$/);
    });

    it('should sanitize filename', () => {
      const key = service.generateKey('products', 'test-image<script>.jpg', '123');
      expect(key).toMatch(/^products\/products\/123\/\d+_test-image_script_.jpg$/);
    });
  });
});