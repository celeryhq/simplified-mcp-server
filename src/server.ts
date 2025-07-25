/**
 * Simplified MCP Server implementation using the official TypeScript SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  ListToolsResult
} from '@modelcontextprotocol/sdk/types.js';

import type { ServerConfig, ToolDefinition, ToolCallParams, Logger } from './types/index.js';
import { ToolRegistry, createTool, ErrorHandler, AppError, ErrorType } from './types/index.js';
import { socialMediaTools } from './tools/implementations/social-media-tools.js';
import { SimplifiedAPIClient } from './api/client.js';

/**
 * Simplified MCP Server class that implements the MCP protocol
 * using the official TypeScript SDK
 */
export class SimplifiedMCPServer {
  private server: Server;
  private config: ServerConfig;
  private toolRegistry: ToolRegistry;
  private logger: Logger | undefined;
  private apiClient: SimplifiedAPIClient;

  constructor(config: ServerConfig, logger?: Logger) {
    this.config = config;
    this.toolRegistry = new ToolRegistry();
    this.logger = logger;
    
    // Initialize API client
    this.apiClient = new SimplifiedAPIClient({
      baseUrl: config.apiBaseUrl,
      apiToken: config.apiToken,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay
    });
    
    // Initialize the MCP server with proper capabilities
    this.server = new Server(
      {
        name: 'simplified-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.registerDefaultTools();
  }

  /**
   * Set up MCP request handlers using the official SDK patterns
   */
  private setupToolHandlers(): void {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
      try {
        return {
          tools: this.toolRegistry.getAvailableTools()
        };
      } catch (error) {
        ErrorHandler.logError(error as Error, 'list-tools', this.logger);
        throw ErrorHandler.translateToMCPError(error as Error, {
          operation: 'list-tools',
          timestamp: new Date()
        });
      }
    });

    // Handle tool call requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;
      
      try {
        return await this.handleToolCall({ name, arguments: args || {} });
      } catch (error) {
        ErrorHandler.logError(error as Error, `tool-call:${name}`, this.logger);
        
        // Create MCP-compliant error response for tool calls
        const mcpError = ErrorHandler.createToolErrorResponse(
          error as Error,
          name,
          args,
          'tool-execution'
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${mcpError.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Register default tools for the server
   */
  private registerDefaultTools(): void {
    // Register social media tools
    for (const tool of socialMediaTools) {
      this.toolRegistry.registerTool(tool);
    }
  }

  /**
   * Register a new tool with the server
   */
  public registerTool(toolDef: ToolDefinition): void {
    this.toolRegistry.registerTool(toolDef);
  }

  /**
   * Get the tool registry instance
   */
  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Handle tool call requests
   */
  private async handleToolCall(params: ToolCallParams): Promise<CallToolResult> {
    const { name, arguments: args } = params;

    try {
      // Execute the tool using the registry (includes validation)
      const result = await this.toolRegistry.executeTool(name, args, this.apiClient);

      // Ensure the result has the correct format
      if (!result || !result.content || !Array.isArray(result.content)) {
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result)
            }
          ]
        };
      }

      return result;
    } catch (error) {
      // Return error as MCP-compliant response
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool '${name}': ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }



  /**
   * Start the MCP server with stdio transport
   */
  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log server startup (to stderr so it doesn't interfere with MCP protocol)
    console.error('Simplified MCP Server started successfully');
    console.error(`Registered ${this.toolRegistry.getToolCount()} tools`);
    console.error('Listening for MCP requests via stdio...');
  }

  /**
   * Stop the MCP server gracefully
   */
  public async stop(): Promise<void> {
    try {
      // The MCP SDK server doesn't have an explicit close method
      // but we can perform cleanup here if needed
      console.error('Stopping Simplified MCP Server...');
      
      // Any cleanup logic would go here
      // For now, we just log the shutdown
      console.error('Server cleanup completed');
    } catch (error) {
      console.error('Error during server shutdown:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Get server configuration
   */
  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Get registered tools count
   */
  public getToolsCount(): number {
    return this.toolRegistry.getToolCount();
  }

  /**
   * Get tool names
   */
  public getToolNames(): string[] {
    return this.toolRegistry.getToolNames();
  }
}