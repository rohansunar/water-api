import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerService, CircuitBreakerConfig } from './circuit-breaker.service';
import { CustomLoggerService } from '../logger/logger.service';
import { ExternalServiceException, PaymentServiceException, NotificationServiceException } from '../exceptions/business.exception';

export interface HttpClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
  successThreshold?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  duration: number;
  headers: Record<string, string>;
}

@Injectable()
export class ExternalServiceClientService {
  private readonly logger = new Logger(ExternalServiceClientService.name);
  private readonly httpClients = new Map<string, HttpClient>();

  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly customLogger: CustomLoggerService,
  ) {}

  /**
   * Create or get HTTP client for service
   */
  getClient(serviceName: string, config: HttpClientConfig): HttpClient {
    if (!this.httpClients.has(serviceName)) {
      this.httpClients.set(serviceName, new HttpClient(serviceName, config, this.circuitBreaker, this.customLogger));
    }
    return this.httpClients.get(serviceName)!;
  }

  /**
   * Make HTTP request with circuit breaker protection
   */
  async request<T = any>(
    serviceName: string,
    requestConfig: RequestConfig,
    clientConfig?: Partial<HttpClientConfig>,
  ): Promise<ApiResponse<T>> {
    const client = this.getClient(serviceName, { ...clientConfig } as HttpClientConfig);

    try {
      return await client.request<T>(requestConfig);
    } catch (error) {
      // Re-throw business exceptions as-is
      if (error instanceof ExternalServiceException ||
          error instanceof PaymentServiceException ||
          error instanceof NotificationServiceException) {
        throw error;
      }

      // Wrap other errors
      throw new ExternalServiceException(
        serviceName,
        `HTTP request failed: ${error.message}`,
        true,
      );
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): any {
    const client = this.httpClients.get(serviceName);
    if (!client) {
      return { serviceName, status: 'NOT_CONFIGURED' };
    }

    return {
      serviceName,
      status: 'CONFIGURED',
      circuitBreaker: this.circuitBreaker.getCircuitStats(serviceName),
      config: client.getConfig(),
    };
  }

  /**
   * Get all services health status
   */
  getAllServicesHealth(): any[] {
    const health = [];
    for (const [serviceName] of this.httpClients) {
      health.push(this.getServiceHealth(serviceName));
    }
    return health;
  }
}

class HttpClient {
  private readonly logger = new Logger(HttpClient.name);
  private readonly baseConfig: HttpClientConfig;

  constructor(
    private readonly serviceName: string,
    config: HttpClientConfig,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly customLogger: CustomLoggerService,
  ) {
    this.baseConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 60000,
      successThreshold: 3,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Make HTTP request
   */
  async request<T>(requestConfig: RequestConfig): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const url = this.buildUrl(requestConfig);

    try {
      // Execute with circuit breaker
      const response = await this.circuitBreaker.execute<ApiResponse<T>>(
        this.serviceName,
        async () => {
          // Build headers
          const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'WaterJarDelivery-API/1.0',
            ...this.baseConfig.headers,
            ...requestConfig.headers,
          };

          // Build request options
          const requestOptions: RequestInit = {
            method: requestConfig.method || 'GET',
            headers,
            signal: AbortSignal.timeout(requestConfig.timeout || this.baseConfig.timeout || 5000),
          };

          // Add body for non-GET requests
          if (requestConfig.body && requestConfig.method !== 'GET') {
            requestOptions.body = JSON.stringify(requestConfig.body);
          }

          // Make the request
          const response = await fetch(url, requestOptions);

          // Parse response
          const responseText = await response.text();
          let responseData: any = null;

          try {
            responseData = responseText ? JSON.parse(responseText) : null;
          } catch (parseError) {
            this.logger.warn(`Failed to parse response as JSON: ${parseError.message}`);
          }

          const result: ApiResponse<T> = {
            success: response.ok,
            data: responseData,
            error: response.ok ? undefined : responseData?.message || response.statusText,
            statusCode: response.status,
            duration: Date.now() - startTime,
            headers: Object.fromEntries(response.headers.entries()),
          };

          return result;
        },
        this.baseConfig,
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log the error
      this.customLogger.logInterModuleCommunication(
        'api',
        this.serviceName,
        'http_request',
        duration,
        false,
        {
          method: requestConfig.method || 'GET',
          url,
          error: error.message,
          statusCode: error.statusCode || 500,
        },
      );

      throw error;
    }
  }

  /**
   * Build full URL from base URL and path
   */
  private buildUrl(requestConfig: RequestConfig): string {
    let url = this.baseConfig.baseUrl;

    // Remove trailing slash from base URL
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    // Add leading slash to path if missing
    let path = requestConfig.path;
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Add query parameters
    if (requestConfig.params) {
      const searchParams = new URLSearchParams();
      Object.entries(requestConfig.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        path += '?' + queryString;
      }
    }

    return url + path;
  }

  /**
   * Get client configuration
   */
  getConfig(): HttpClientConfig {
    return { ...this.baseConfig };
  }
}