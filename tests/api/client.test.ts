/**
 * Tests for SimplifiedAPIClient
 */

import { SimplifiedAPIClient } from '../../src/api/client.js';
import { AppError, ErrorType } from '../../src/types/index.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('SimplifiedAPIClient', () => {
  let client: SimplifiedAPIClient;
  const mockConfig = {
    baseUrl: 'https://api.simplified.com',
    apiToken: 'test-token',
    timeout: 5000,
    retryAttempts: 2,
    retryDelay: 100
  };

  beforeEach(() => {
    client = new SimplifiedAPIClient(mockConfig);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with provided config', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe(mockConfig.baseUrl);
      expect(config.apiToken).toBe(mockConfig.apiToken);
      expect(config.timeout).toBe(mockConfig.timeout);
    });

    it('should use default values for optional config', () => {
      const minimalClient = new SimplifiedAPIClient({
        baseUrl: 'https://api.test.com',
        apiToken: 'token'
      });
      
      const config = minimalClient.getConfig();
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });
  });

  describe('makeRequest', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.makeRequest('/test', 'GET');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Api-Key test-token',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual({
        status: 200,
        statusText: 'OK',
        data: { data: 'test' }
      });
    });

    it('should make successful POST request with data', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ id: 123 })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const postData = { name: 'test' };
      const result = await client.makeRequest('/create', 'POST', postData);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Authorization': 'Api-Key test-token',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result.data).toEqual({ id: 123 });
    });

    it('should handle non-JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'text/plain']]),
        text: jest.fn().mockResolvedValue('plain text response')
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.makeRequest('/text');
      expect(result.data).toBe('plain text response');
    });

    it('should throw AppError for 4xx responses', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ error: 'Invalid request' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(client.makeRequest('/bad')).rejects.toThrow(AppError);
      await expect(client.makeRequest('/bad')).rejects.toThrow('API request failed: 400 Bad Request');
    });

    it('should throw AppError for 401 authentication errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ error: 'Invalid token' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      try {
        await client.makeRequest('/protected');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.AUTH_ERROR);
      }
    });

    it('should retry on 5xx errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ error: 'Server error' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(client.makeRequest('/server-error')).rejects.toThrow(AppError);
      
      // Should have made initial request + 2 retries = 3 total calls
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ error: 'Bad request' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(client.makeRequest('/bad-request')).rejects.toThrow(AppError);
      
      // Should only make 1 call, no retries for client errors
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Convenience methods', () => {
    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ success: true })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    });

    it('should make GET request with query parameters', async () => {
      await client.get('/test', { param1: 'value1', param2: 'value2' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/test?param1=value1&param2=value2',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request', async () => {
      const data = { name: 'test' };
      await client.post('/create', data);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
    });

    it('should make PUT request', async () => {
      const data = { id: 1, name: 'updated' };
      await client.put('/update/1', data);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/update/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
    });

    it('should make DELETE request', async () => {
      await client.delete('/delete/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/delete/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should make PATCH request', async () => {
      const data = { name: 'patched' };
      await client.patch('/patch/1', data);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/patch/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data)
        })
      );
    });
  });

  describe('Utility methods', () => {
    it('should update API token', () => {
      const newToken = 'new-token';
      client.updateToken(newToken);
      
      const config = client.getConfig();
      expect(config.apiToken).toBe(newToken);
    });

    it('should test connection successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValue({ status: 'healthy' })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.simplified.com/health',
        expect.any(Object)
      );
    });

    it('should test connection failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.makeRequest('/test')).rejects.toThrow(AppError);
      
      // Should retry on network errors
      expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should handle timeout errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('The operation was aborted'));

      await expect(client.makeRequest('/test')).rejects.toThrow(AppError);
    });
  });
});