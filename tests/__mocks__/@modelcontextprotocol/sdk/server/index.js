/**
 * Mock for @modelcontextprotocol/sdk/server/index.js
 */

const Server = jest.fn().mockImplementation((info, capabilities) => ({
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

module.exports = { Server };