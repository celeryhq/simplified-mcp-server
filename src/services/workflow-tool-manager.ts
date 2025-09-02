/**
 * WorkflowToolManager - Main orchestrator for dynamic workflow tools
 * Handles workflow discovery, tool registration, and lifecycle management
 */

import type {
  WorkflowDefinition,
  ToolDefinition,
  APIClient,
  Logger,
  ServerConfig
} from '../types/index.js';
import { AppError, ErrorType } from '../types/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { WorkflowDiscoveryService, type IWorkflowDiscoveryService } from './workflow-discovery.js';
import { WorkflowExecutionService } from './workflow-execution.js';
import { WorkflowStatusService } from './workflow-status.js';
import { WorkflowToolGenerator, type IWorkflowToolGenerator } from './workflow-tool-generator.js';
import { WorkflowErrorHandler } from '../utils/workflow-error-handler.js';
import { WorkflowPerformanceMonitor, type PerformanceMonitorConfig } from './workflow-performance-monitor.js';

/**
 * Interface for WorkflowToolManager
 */
export interface IWorkflowToolManager {
  // Initialization and lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Workflow discovery and registration
  discoverWorkflows(): Promise<WorkflowDefinition[]>;
  registerWorkflowTools(workflows: WorkflowDefinition[]): void;
  refreshWorkflows(): Promise<void>;
  
  // Manual refresh and hot-reloading
  triggerManualRefresh(): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      added: number;
      updated: number;
      removed: number;
      unchanged: number;
    };
  }>;
  getRefreshStatus(): {
    enabled: boolean;
    lastRefreshTime: number;
    refreshAge: number;
    autoRefreshEnabled: boolean;
    autoRefreshInterval: number;
    nextRefreshIn?: number;
  };
  
  // Configuration and status
  isEnabled(): boolean;
  getRegisteredWorkflowCount(): number;
  getWorkflowToolNames(): string[];
  
  // Additional methods for testing and management
  getWorkflowById?(workflowId: string): WorkflowDefinition | undefined;
  getAllWorkflows?(): WorkflowDefinition[];
  getWorkflowStats?(): {
    enabled: boolean;
    totalWorkflows: number;
    lastRefreshTime: number;
    refreshAge: number;
    autoRefreshEnabled: boolean;
    autoRefreshInterval: number;
  };
  forceRefresh?(): Promise<void>;
  getDiscoveryCacheStats?(): any;
  getToolGeneratorStats?(): any;
  getPerformanceStats?(windowMs?: number): any;
  getPerformanceMonitor?(): any;
}

/**
 * WorkflowToolManager implementation
 * Main orchestrator for dynamic workflow tools functionality
 */
export class WorkflowToolManager implements IWorkflowToolManager {
  private apiClient: APIClient;
  private logger: Logger;
  private config: ServerConfig;
  private toolRegistry: ToolRegistry;
  private errorHandler: WorkflowErrorHandler;
  
  // Service dependencies
  private discoveryService: IWorkflowDiscoveryService;
  private executionService: WorkflowExecutionService;
  private statusService: WorkflowStatusService;
  private toolGenerator: IWorkflowToolGenerator;
  
  // State management
  private isInitialized: boolean = false;
  private registeredWorkflows: Map<string, WorkflowDefinition> = new Map();
  private refreshTimer: NodeJS.Timeout | undefined = undefined;
  private lastRefreshTime: number = 0;

  constructor(
    apiClient: APIClient,
    logger: Logger,
    config: ServerConfig,
    toolRegistry: ToolRegistry
  ) {
    this.apiClient = apiClient;
    this.logger = logger;
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.errorHandler = new WorkflowErrorHandler(logger);
    
    // Initialize services
    this.discoveryService = new WorkflowDiscoveryService(
      apiClient,
      logger,
      this.getWorkflowConfig()
    );
    
    // Create performance monitoring config
    const performanceConfig: PerformanceMonitorConfig = {
      enabled: true,
      metricsRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      maxConcurrentExecutions: config.workflowMaxConcurrentExecutions,
      executionTimeout: config.workflowExecutionTimeout,
      memoryThreshold: 512, // 512 MB
      cpuThreshold: 80 // 80%
    };

    this.executionService = new WorkflowExecutionService(
      apiClient,
      logger,
      {
        executionTimeout: config.workflowExecutionTimeout,
        statusCheckInterval: config.workflowStatusCheckInterval,
        maxRetryAttempts: config.workflowRetryAttempts,
        performanceMonitoring: performanceConfig
      }
    );
    
    this.statusService = new WorkflowStatusService(
      apiClient,
      logger,
      {
        statusCheckInterval: config.workflowStatusCheckInterval,
        maxRetryAttempts: config.workflowRetryAttempts,
        cleanupInterval: 300000 // 5 minutes
      }
    );
    
    this.toolGenerator = new WorkflowToolGenerator(
      logger,
      {
        executionTimeout: config.workflowExecutionTimeout,
        statusCheckInterval: config.workflowStatusCheckInterval,
        maxRetryAttempts: config.workflowRetryAttempts,
        toolNamePrefix: 'workflow'
      },
      this.executionService
    );
  }

  /**
   * Initialize the WorkflowToolManager
   * Discovers workflows and registers them as tools if enabled
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('WorkflowToolManager is already initialized');
      return;
    }

    this.logger.info('Initializing WorkflowToolManager...');

    if (!this.isEnabled()) {
      this.logger.info('Workflow tools are disabled in configuration');
      this.isInitialized = true;
      return;
    }

    try {
      // Test connection to workflows-list-tool
      const isAvailable = await this.discoveryService.isWorkflowsListToolAvailable();
      if (!isAvailable) {
        this.logger.warn('workflows-list-tool is not available, workflow tools will be disabled');
        this.isInitialized = true;
        return;
      }

      // Discover and register workflows
      try {
        await this.refreshWorkflows();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to initialize WorkflowToolManager: ${errorMessage}`);
      }

      // Start auto-refresh timer if configured
      this.startAutoRefresh();

      this.isInitialized = true;
      this.logger.info(
        `WorkflowToolManager initialized successfully with ${this.getRegisteredWorkflowCount()} workflow tools`
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize WorkflowToolManager: ${errorMessage}`);
      
      // Don't throw error - graceful degradation
      this.isInitialized = true;
    }
  }

  /**
   * Shutdown the WorkflowToolManager
   * Cleans up resources and stops auto-refresh
   */
  async shutdown(): Promise<void> {
    this.logger.info('4 Shutting down WorkflowToolManager...');

    // Stop auto-refresh timer
    this.stopAutoRefresh();

    // Shutdown services
    this.statusService.shutdown();
    this.executionService.shutdown(); // This now includes performance monitor shutdown

    // Clear tool generator cache
    this.toolGenerator.clearGeneratedNames();

    // Unregister all workflow tools
    this.unregisterAllWorkflowTools();

    this.isInitialized = false;
    this.logger.info('WorkflowToolManager shutdown complete');
  }

  /**
   * Discover available workflows
   * @returns Promise<WorkflowDefinition[]> Array of discovered workflows
   */
  async discoverWorkflows(): Promise<WorkflowDefinition[]> {
    if (!this.isEnabled()) {
      this.logger.debug('Workflow discovery skipped - workflows disabled');
      return [];
    }

    this.logger.debug('Starting workflow discovery...');
    const workflows = await this.discoveryService.listWorkflows();
    
    this.logger.info(`Discovered ${workflows.length} workflows`);
    return workflows;
  }

  /**
   * Register workflow tools with the tool registry
   * @param workflows Array of workflow definitions to register
   */
  registerWorkflowTools(workflows: WorkflowDefinition[]): void {
    this.logger.debug(`Registering ${workflows.length} workflow tools...`);

    let successCount = 0;
    let errorCount = 0;

    // Get existing tool names to avoid conflicts
    const existingToolNames = new Set(this.toolRegistry.getToolNames());

    for (const workflow of workflows) {
      try {
        // Convert workflow to tool definition using the generator
        const toolDefinition = this.toolGenerator.convertWorkflowToTool(workflow);
        
        // Check if tool already exists and unregister it first
        const existingTool = this.toolRegistry.getTool(toolDefinition.name);
        if (existingTool) {
          this.toolRegistry.unregisterTool(toolDefinition.name);
          this.logger.debug(`Unregistered existing tool: ${toolDefinition.name}`);
        }

        // Register the new tool with workflow metadata
        this.toolRegistry.registerWorkflowTool(toolDefinition, workflow);
        this.registeredWorkflows.set(workflow.id, workflow);
        
        successCount++;
        this.logger.debug(`Registered workflow tool: ${toolDefinition.name}`);

      } catch (error) {
        errorCount++;
        // Use error handler for tool generation failures
        this.errorHandler.handleToolGenerationError(
          error instanceof Error ? error : new Error(String(error)),
          workflow,
          { operation: 'tool_registration' }
        );
      }
    }

    this.logger.info(
      `Workflow tool registration complete: ${successCount} successful, ${errorCount} failed`
    );
  }

  /**
   * Refresh workflows by discovering and re-registering them
   * Performs incremental updates to minimize disruption
   */
  async refreshWorkflows(): Promise<void> {
    this.logger.info('Refreshing workflow tools...');

    try {
      // Discover current workflows - this can throw errors
      const discoveredWorkflows = await this.discoverWorkflows();
      
      // Perform incremental update instead of full replacement
      const updateResult = this.updateWorkflowTools(discoveredWorkflows);
      
      this.lastRefreshTime = Date.now();
      this.logger.info(
        `Workflow refresh completed: ${updateResult.added} added, ${updateResult.updated} updated, ${updateResult.removed} removed, ${updateResult.unchanged} unchanged`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Workflow refresh failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Check if workflow tools are enabled
   * @returns boolean True if enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.config.workflowsEnabled;
  }

  /**
   * Get the number of registered workflow tools
   * @returns number Count of registered workflow tools
   */
  getRegisteredWorkflowCount(): number {
    return this.registeredWorkflows.size;
  }

  /**
   * Get names of all registered workflow tools
   * @returns string[] Array of workflow tool names
   */
  getWorkflowToolNames(): string[] {
    return Array.from(this.registeredWorkflows.values()).map(workflow => 
      this.toolGenerator.generateToolName(workflow, new Set(this.toolRegistry.getToolNames()))
    );
  }

  /**
   * Get workflow definition by ID
   * @param workflowId Workflow ID to look up
   * @returns WorkflowDefinition | undefined Workflow definition if found
   */
  getWorkflowById(workflowId: string): WorkflowDefinition | undefined {
    return this.registeredWorkflows.get(workflowId);
  }

  /**
   * Get all registered workflows
   * @returns WorkflowDefinition[] Array of all registered workflows
   */
  getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.registeredWorkflows.values());
  }

  /**
   * Get workflow statistics
   * @returns Object with workflow statistics
   */
  getWorkflowStats(): {
    enabled: boolean;
    totalWorkflows: number;
    lastRefreshTime: number;
    refreshAge: number;
    autoRefreshEnabled: boolean;
    autoRefreshInterval: number;
  } {
    return {
      enabled: this.isEnabled(),
      totalWorkflows: this.getRegisteredWorkflowCount(),
      lastRefreshTime: this.lastRefreshTime,
      refreshAge: Date.now() - this.lastRefreshTime,
      autoRefreshEnabled: this.config.workflowDiscoveryInterval > 0,
      autoRefreshInterval: this.config.workflowDiscoveryInterval
    };
  }



  /**
   * Unregister all workflow tools from the registry
   */
  private unregisterAllWorkflowTools(): void {
    const workflowToolNames = this.getWorkflowToolNames();
    let unregisteredCount = 0;

    for (const toolName of workflowToolNames) {
      if (this.toolRegistry.unregisterTool(toolName)) {
        unregisteredCount++;
      }
    }

    this.registeredWorkflows.clear();
    
    if (unregisteredCount > 0) {
      this.logger.info(`Unregistered ${unregisteredCount} workflow tools`);
    }
  }

  /**
   * Start auto-refresh timer if configured
   */
  private startAutoRefresh(): void {
    if (this.config.workflowDiscoveryInterval > 0) {
      this.logger.info(
        `Starting auto-refresh timer with interval: ${this.config.workflowDiscoveryInterval}ms`
      );
      
      this.refreshTimer = setInterval(async () => {
        try {
          this.logger.debug('Auto-refresh triggered');
          await this.refreshWorkflows();
        } catch (error) {
          // Use error handler for auto-refresh failures
          this.errorHandler.handleDiscoveryError(
            error instanceof Error ? error : new Error(String(error)),
            { operation: 'auto_refresh' }
          );
        }
      }, this.config.workflowDiscoveryInterval);
    }
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer !== undefined) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
      this.logger.debug('Auto-refresh timer stopped');
    }
  }

  /**
   * Get workflow configuration from server config
   * @returns WorkflowConfig Workflow configuration object
   */
  private getWorkflowConfig() {
    return {
      enabled: this.config.workflowsEnabled,
      discoveryInterval: this.config.workflowDiscoveryInterval,
      executionTimeout: this.config.workflowExecutionTimeout,
      maxConcurrentExecutions: this.config.workflowMaxConcurrentExecutions,
      filterPatterns: this.config.workflowFilterPatterns,
      statusCheckInterval: this.config.workflowStatusCheckInterval,
      retryAttempts: this.config.workflowRetryAttempts
    };
  }

  /**
   * Force clear cache and refresh (for testing)
   */
  async forceRefresh(): Promise<void> {
    this.logger.info('Forcing workflow refresh...');
    
    // Clear discovery service cache
    this.discoveryService.clearCache();
    
    // Clear tool generator cache
    this.toolGenerator.clearGeneratedNames();
    
    // Refresh workflows
    await this.refreshWorkflows();
  }

  /**
   * Get discovery service cache stats (for testing)
   */
  getDiscoveryCacheStats() {
    return this.discoveryService.getCacheStats();
  }

  /**
   * Get tool generator statistics (for testing)
   */
  getToolGeneratorStats() {
    return this.toolGenerator.getGenerationStats();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(windowMs?: number) {
    return this.executionService.getPerformanceStats(windowMs);
  }

  /**
   * Get performance monitor instance (for testing)
   */
  getPerformanceMonitor() {
    return this.executionService.getPerformanceMonitor();
  }

  /**
   * Update workflow tools incrementally based on discovered workflows
   * @param discoveredWorkflows Array of newly discovered workflows
   * @returns Update statistics
   */
  private updateWorkflowTools(discoveredWorkflows: WorkflowDefinition[]): {
    added: number;
    updated: number;
    removed: number;
    unchanged: number;
  } {
    const stats = { added: 0, updated: 0, removed: 0, unchanged: 0 };
    
    // Create maps for efficient lookup
    const discoveredMap = new Map<string, WorkflowDefinition>();
    const discoveredToolNames = new Set<string>();
    
    // Build discovered workflows map and generate tool names
    for (const workflow of discoveredWorkflows) {
      discoveredMap.set(workflow.id, workflow);
      const toolName = this.toolGenerator.generateToolName(workflow, new Set(this.toolRegistry.getToolNames()));
      discoveredToolNames.add(toolName);
    }
    
    // Get current workflow tools
    const currentWorkflowIds = new Set(this.registeredWorkflows.keys());
    const currentToolNames = new Set(this.getWorkflowToolNames());
    
    // Find workflows to remove (exist in current but not in discovered)
    const workflowsToRemove = Array.from(currentWorkflowIds).filter(id => !discoveredMap.has(id));
    
    // Remove obsolete workflow tools
    for (const workflowId of workflowsToRemove) {
      const workflow = this.registeredWorkflows.get(workflowId);
      if (workflow) {
        const toolName = this.toolGenerator.generateToolName(workflow, new Set());
        if (this.toolRegistry.unregisterTool(toolName)) {
          this.registeredWorkflows.delete(workflowId);
          stats.removed++;
          this.logger.debug(`Removed workflow tool: ${toolName} (workflow ${workflowId})`);
        }
      }
    }
    
    // Process discovered workflows
    for (const workflow of discoveredWorkflows) {
      const existingWorkflow = this.registeredWorkflows.get(workflow.id);
      
      if (!existingWorkflow) {
        // New workflow - add it
        try {
          const toolDefinition = this.toolGenerator.convertWorkflowToTool(workflow);
          this.toolRegistry.registerWorkflowTool(toolDefinition, workflow);
          this.registeredWorkflows.set(workflow.id, workflow);
          stats.added++;
          // this.logger.debug(`Added new workflow tool: ${toolDefinition.name}`);
        } catch (error) {
          this.errorHandler.handleToolGenerationError(
            error instanceof Error ? error : new Error(String(error)),
            workflow,
            { operation: 'tool_addition' }
          );
        }
      } else if (this.hasWorkflowChanged(existingWorkflow, workflow)) {
        // Existing workflow has changed - update it
        try {
          const oldToolName = this.toolGenerator.generateToolName(existingWorkflow, new Set());
          
          // Unregister old tool
          this.toolRegistry.unregisterTool(oldToolName);
          
          // Register updated tool
          const toolDefinition = this.toolGenerator.convertWorkflowToTool(workflow);
          this.toolRegistry.registerWorkflowTool(toolDefinition, workflow);
          this.registeredWorkflows.set(workflow.id, workflow);
          stats.updated++;
          this.logger.debug(`Updated workflow tool: ${toolDefinition.name}`);
        } catch (error) {
          this.errorHandler.handleToolGenerationError(
            error instanceof Error ? error : new Error(String(error)),
            workflow,
            { operation: 'tool_update' }
          );
        }
      } else {
        // Workflow unchanged
        stats.unchanged++;
      }
    }
    
    return stats;
  }

  /**
   * Check if a workflow has changed by comparing key properties
   * @param oldWorkflow Previous workflow definition
   * @param newWorkflow New workflow definition
   * @returns True if workflow has changed
   */
  private hasWorkflowChanged(oldWorkflow: WorkflowDefinition, newWorkflow: WorkflowDefinition): boolean {
    // Compare key properties that would affect tool generation
    if (oldWorkflow.name !== newWorkflow.name) return true;
    if (oldWorkflow.description !== newWorkflow.description) return true;
    if (oldWorkflow.category !== newWorkflow.category) return true;
    if (oldWorkflow.version !== newWorkflow.version) return true;
    if (oldWorkflow.executionType !== newWorkflow.executionType) return true;
    
    // Compare input schema (deep comparison)
    if (JSON.stringify(oldWorkflow.inputSchema) !== JSON.stringify(newWorkflow.inputSchema)) {
      return true;
    }
    
    // Compare metadata if present
    if (JSON.stringify(oldWorkflow.metadata) !== JSON.stringify(newWorkflow.metadata)) {
      return true;
    }
    
    return false;
  }

  /**
   * Manually trigger workflow refresh
   * This is a public method that can be called to force a refresh
   */
  async triggerManualRefresh(): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      added: number;
      updated: number;
      removed: number;
      unchanged: number;
    };
  }> {
    this.logger.info('Manual workflow refresh triggered');
    
    try {
      const discoveredWorkflows = await this.discoverWorkflows();
      const updateResult = this.updateWorkflowTools(discoveredWorkflows);
      
      this.lastRefreshTime = Date.now();
      
      this.logger.info(
        `Manual refresh completed: ${updateResult.added} added, ${updateResult.updated} updated, ${updateResult.removed} removed, ${updateResult.unchanged} unchanged`
      );
      
      return {
        success: true,
        stats: updateResult
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Manual refresh failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get refresh status and statistics
   */
  getRefreshStatus(): {
    enabled: boolean;
    lastRefreshTime: number;
    refreshAge: number;
    autoRefreshEnabled: boolean;
    autoRefreshInterval: number;
    nextRefreshIn?: number;
  } {
    const now = Date.now();
    const status = {
      enabled: this.isEnabled(),
      lastRefreshTime: this.lastRefreshTime,
      refreshAge: now - this.lastRefreshTime,
      autoRefreshEnabled: this.config.workflowDiscoveryInterval > 0,
      autoRefreshInterval: this.config.workflowDiscoveryInterval
    };

    // Calculate next refresh time if auto-refresh is enabled and we have a last refresh time
    if (status.autoRefreshEnabled && this.lastRefreshTime > 0) {
      const nextRefreshTime = this.lastRefreshTime + this.config.workflowDiscoveryInterval;
      const nextRefreshIn = Math.max(0, nextRefreshTime - now);
      return { ...status, nextRefreshIn };
    }

    return status;
  }
}