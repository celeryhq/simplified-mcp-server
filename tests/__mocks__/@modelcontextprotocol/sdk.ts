/**
 * Mock implementation of the MCP SDK for testing
 */

export const MockServer = jest.fn().mockImplementation((info, capabilities) => ({
  info,
  capabilities,
  requestHandlers: new Map(),
  
  setRequestHandler: jest.fn().mockImplementation(function(schema, handler) {
    this.requestHandlers.set(schema.method || 'unknown', handler);
  }),
  
  connect: jest.fn().mockResolvedValue(undefined),
  
  close: jest.fn().mockResolvedValue(undefined),
  
  // Mock method to simulate request handling
  handleRequest: jest.fn().mockImplementation(function(method, params) {
    const handler = this.requestHandlers.get(method);
    if (handler) {
      return handler({ method, params });
    }
    throw new Error(`No handler for method: ${method}`);
  })
}));

export const MockStdioServerTransport = jest.fn().mockImplementation(() => ({
  start: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined)
}));

// Mock MCP types and schemas
export const ListToolsRequestSchema = {
  method: 'tools/list',
  type: 'request'
};

export const CallToolRequestSchema = {
  method: 'tools/call',
  type: 'request'
};

export const MockMCPError = jest.fn().mockImplementation((code, message, data) => ({
  code,
  message,
  data
}));

// Mock tool response types
export const createMockToolResponse = (content: any) => ({
  content: Array.isArray(content) ? content : [{ type: 'text', text: String(content) }]
});

export const createMockErrorResponse = (code: number, message: string, data?: any) => ({
  error: {
    code,
    message,
    data
  }
});

// Mock server capabilities
export const createMockCapabilities = () => ({
  tools: {},
  resources: {},
  prompts: {},
  logging: {}
});

// Mock server info
export const createMockServerInfo = (name: string, version: string) => ({
  name,
  version,
  protocolVersion: '2024-11-05'
});

// Export mocked modules
export const Server = MockServer;
export const StdioServerTransport = MockStdioServerTransport;
export const MCPError = MockMCPError;