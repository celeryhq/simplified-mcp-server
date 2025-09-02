/**
 * Simplified API Client for social media operations
 */

import type { HttpMethod, APIRequestOptions, APIResponse } from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';

/**
 * Configuration for the API client
 */
export interface APIClientConfig {
  baseUrl: string;
  apiToken: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Simplified API Client for making HTTP requests to Simplified API
 */
export class SimplifiedAPIClient {
  private config: APIClientConfig;

  constructor(config: APIClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Make a generic HTTP request
   */
  async makeRequest(
    endpoint: string,
    method: HttpMethod = 'GET',
    data?: any,
    options?: APIRequestOptions
  ): Promise<APIResponse> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Api-Key ${this.config.apiToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'simplified-mcp-server/1.0.0',
      ...options?.headers
    };
    
    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(options?.timeout || this.config.timeout!)
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = JSON.stringify(data);
    }

    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 0; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        let responseData: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        if (!response.ok) {
          throw new AppError(
            this.getErrorType(response.status),
            `API request failed: ${response.status} ${response.statusText}`,
            {
              status: response.status,
              statusText: response.statusText,
              data: responseData,
              url,
              method
            },
            response.status
          );
        }

        return {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on client errors (4xx) or if it's the last attempt
        if (error instanceof AppError && error.status && error.status < 500) {
          throw error;
        }
        
        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay! * Math.pow(2, attempt));
      }
    }

    throw new AppError(
      ErrorType.NETWORK_ERROR,
      `Request failed after ${this.config.retryAttempts! + 1} attempts: ${lastError.message}`,
      { originalError: lastError, url, method }
    );
  }

  /**
   * Make a GET request
   */
  async get(endpoint: string, params?: Record<string, any>, options?: APIRequestOptions): Promise<APIResponse> {
    let url = endpoint;
   
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }
    
    return this.makeRequest(url, 'GET', undefined, options);
  }

  /**
   * Make a POST request
   */
  async post(endpoint: string, data: any, options?: APIRequestOptions): Promise<APIResponse> {
    return this.makeRequest(endpoint, 'POST', data, options);
  }

  /**
   * Make a PUT request
   */
  async put(endpoint: string, data: any, options?: APIRequestOptions): Promise<APIResponse> {
    return this.makeRequest(endpoint, 'PUT', data, options);
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint: string, options?: APIRequestOptions): Promise<APIResponse> {
    return this.makeRequest(endpoint, 'DELETE', undefined, options);
  }

  /**
   * Make a PATCH request
   */
  async patch(endpoint: string, data: any, options?: APIRequestOptions): Promise<APIResponse> {
    return this.makeRequest(endpoint, 'PATCH', data, options);
  }

  /**
   * Get the appropriate error type based on HTTP status code
   */
  private getErrorType(status: number): ErrorType {
    if (status === 401 || status === 403) {
      return ErrorType.AUTH_ERROR;
    }
    if (status >= 400 && status < 500) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (status >= 500) {
      return ErrorType.API_ERROR;
    }
    return ErrorType.NETWORK_ERROR;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<APIClientConfig> {
    return { ...this.config };
  }

  /**
   * Update API token
   */
  updateToken(token: string): void {
    this.config.apiToken = token;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}