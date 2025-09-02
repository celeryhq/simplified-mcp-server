/**
 * Simplified MCP Server implementation using the official TypeScript SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createWorkflowStatusTool } from './tools/implementations/workflow-status-tool.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  ListToolsResult
} from '@modelcontextprotocol/sdk/types.js';

import type { ServerConfig, ToolDefinition, ToolCallParams, Logger } from './types/index.js';
import { ToolRegistry, ErrorHandler } from './types/index.js';
import { socialMediaTools } from './tools/implementations/social-media-tools.js';
import { SimplifiedAPIClient } from './api/client.js';
import { WorkflowToolManager, type IWorkflowToolManager } from './services/workflow-tool-manager.js';
import { createMCPLogger } from './utils/logger.js';

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
  private workflowToolManager: IWorkflowToolManager;

  constructor(config: ServerConfig, logger?: Logger) {
    this.config = config;
    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.setConfig(config);
    this.logger = logger;

    // Initialize API client
    this.apiClient = new SimplifiedAPIClient({
      baseUrl: config.apiBaseUrl,
      apiToken: config.apiToken,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay
    });
    const loggers = this.logger || createMCPLogger({ context: 'SimplifiedMCPServer' });
    // Initialize WorkflowToolManager
    this.workflowToolManager = new WorkflowToolManager(
      this.apiClient,
      loggers, // this.logger || console,
      config,
      this.toolRegistry
    );

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

    // Register workflow status tool if workflows are enabled
    if (this.config.workflowsEnabled) {
      // Ensure we have a logger for the workflow status tool
      const logger = this.logger || createMCPLogger({ context: 'WorkflowStatusTool' });
      this.toolRegistry.registerTool(createWorkflowStatusTool(logger));
    }
  }

  /**
   * Initialize workflow tools with proper error handling
   */
  private async initializeWorkflowTools(): Promise<void> {
    try {
      const logger = this.logger || createMCPLogger({ context: 'SimplifiedMCPServer' });
      logger.info('Initializing workflow tools...');

      await this.workflowToolManager.initialize();

      if (this.workflowToolManager.isEnabled()) {
        const workflowCount = this.workflowToolManager.getRegisteredWorkflowCount();
        logger.info(`Workflow tools initialized: ${workflowCount} tools registered`);
      } else {
        logger.info('Workflow tools are disabled');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const logger = this.logger || createMCPLogger({ context: 'SimplifiedMCPServer' });

      logger.error(`Failed to initialize workflow tools: ${errorMessage}`);
      logger.warn('Server will continue with static tools only');

      // Don't throw error - graceful degradation
      // The server should continue to work with static tools only
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
   * Initialize the server (including workflow tools) without starting the transport
   * This is useful for documentation generation and testing
   */
  public async initialize(): Promise<void> {
    await this.initializeWorkflowTools();
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
    try {
      // Initialize workflow tools before starting the server
      await this.initializeWorkflowTools();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Get or create MCP-safe logger for server messages
      const logger = this.logger || createMCPLogger({ context: 'SimplifiedMCPServer' });

      // Log server startup using MCP-safe logger
      logger.info('Simplified MCP Server started successfully');
      logger.info(`Registered ${this.toolRegistry.getToolCount()} tools total`);

      // Log workflow tool information
      if (this.workflowToolManager.isEnabled()) {
        const workflowCount = this.workflowToolManager.getRegisteredWorkflowCount();
        logger.info(`Static tools: ${this.toolRegistry.getToolCount() - workflowCount}`);
        logger.info(`Workflow tools: ${workflowCount}`);

        if (workflowCount > 0) {
          const workflowToolNames = this.workflowToolManager.getWorkflowToolNames();
          logger.info(`Workflow tool names: ${workflowToolNames.join(', ')}`);
        }
      } else {
        logger.info(`Static tools: ${this.toolRegistry.getToolCount()}`);
        logger.info('Workflow tools: disabled');
      }

      logger.info('Listening for MCP requests via stdio...');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const logger = this.logger || createMCPLogger({ context: 'SimplifiedMCPServer' });
      logger.error(`Failed to start Simplified MCP Server: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stop the MCP server gracefully
   */
  public async stop(): Promise<void> {
    try {
      const logger = this.logger || createMCPLogger({ context: 'SimplifiedMCPServer' });
      logger.info('Stopping Simplified MCP Server...');

      // Shutdown workflow tool manager
      await this.workflowToolManager.shutdown();

      // The MCP SDK server doesn't have an explicit close method
      // but we can perform cleanup here if needed
      logger.info('Server cleanup completed');
    } catch (error) {
      const logger = this.logger || createMCPLogger({ context: 'SimplifiedMCPServer' });
      logger.error('Error during server shutdown:', error instanceof Error ? error.message : String(error));
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

  /**
   * Get workflow tool manager instance
   */
  public getWorkflowToolManager(): IWorkflowToolManager {
    return this.workflowToolManager;
  }

  /**
   * Get workflow tools count
   */
  public getWorkflowToolsCount(): number {
    return this.workflowToolManager.getRegisteredWorkflowCount();
  }

  /**
   * Check if workflow tools are enabled
   */
  public isWorkflowToolsEnabled(): boolean {
    return this.workflowToolManager.isEnabled();
  }

  /**
   * Refresh workflow tools
   */
  public async refreshWorkflowTools(): Promise<void> {
    await this.workflowToolManager.refreshWorkflows();
  }
}