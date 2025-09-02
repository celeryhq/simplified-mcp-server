#!/usr/bin/env node

/**
 * Command Line Interface for Simplified MCP Server
 * This script starts the MCP server with stdio transport
 */

import { ConfigurationManager, type ServerConfig } from './config/configuration.js';
import { SimplifiedMCPServer } from './server.js';

interface CLIOptions {
  help?: boolean;
  version?: boolean;
  verbose?: boolean;
  config?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  docs?: boolean;
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-v':
      case '--version':
        options.version = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '-c':
      case '--config':
        if (i + 1 < args.length) {
          const configPath = args[++i];
          if (configPath) {
            options.config = configPath;
          } else {
            console.error('Error: --config requires a file path');
            process.exit(1);
          }
        } else {
          console.error('Error: --config requires a file path');
          process.exit(1);
        }
        break;
      case '--log-level':
        if (i + 1 < args.length) {
          const level = args[++i];
          if (level && (level === 'debug' || level === 'info' || level === 'warn' || level === 'error')) {
            options.logLevel = level;
          } else {
            console.error('Error: --log-level must be one of: debug, info, warn, error');
            process.exit(1);
          }
        } else {
          console.error('Error: --log-level requires a value (debug, info, warn, error)');
          process.exit(1);
        }
        break;
      case '--docs':
        options.docs = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Error: Unknown option ${arg}`);
          console.error('Use --help for usage information');
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Simplified MCP Server - Model Context Protocol server for Simplified API

USAGE:
  simplified-mcp-server [OPTIONS]

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Show version information
  --verbose               Enable verbose logging
  -c, --config <file>     Specify configuration file path
  --log-level <level>     Set log level (debug, info, warn, error)
  --docs                  Generate and display tool documentation

ENVIRONMENT VARIABLES:
  SIMPLIFIED_API_TOKEN    Required: Your Simplified API token
  SIMPLIFIED_API_BASE_URL Optional: API base URL (default: https://api.simplified.com)
  LOG_LEVEL              Optional: Log level (default: info)
  REQUEST_TIMEOUT        Optional: Request timeout in ms (default: 30000)

EXAMPLES:
  simplified-mcp-server
  simplified-mcp-server --verbose
  simplified-mcp-server --log-level debug
  simplified-mcp-server --config /path/to/.env
  simplified-mcp-server --docs

For more information, visit: https://github.com/celeryhq/simplified-mcp
`);
}

async function showVersion(): Promise<void> {
  // Read version from package.json
  try {
    // Use dynamic import for ES modules compatibility
    const pkg = await import('../package.json', { assert: { type: 'json' } });
    console.log(`Simplified MCP Server v${pkg.default.version}`);
  } catch {
    console.log('Simplified MCP Server v1.0.0');
  }
}

async function generateDocumentation(): Promise<void> {
  try {
    // Load configuration to initialize the server properly
    const config = ConfigurationManager.loadConfig();
    
    // Create a temporary server instance to initialize tools and generate documentation
    const server = new SimplifiedMCPServer(config);
    
    // Initialize the server to register all tools (including workflow tools)
    await server.initialize();
    
    // Generate and output the documentation
    const documentation = server.getToolRegistry().generateDocumentation();
    console.log(documentation);
    
  } catch (error) {
    console.error('Failed to generate documentation:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseArguments();

  // Handle help and version flags
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    await showVersion();
    process.exit(0);
  }

  if (options.docs) {
    await generateDocumentation();
    process.exit(0);
  }

  try {
    // Load and validate configuration
    const config = ConfigurationManager.loadConfig();

    // Create a mutable copy of the config for CLI overrides
    const finalConfig: ServerConfig = { ...config };

    // Override log level if specified via CLI
    if (options.logLevel) {
      finalConfig.logLevel = options.logLevel;
    }

    // Enable verbose logging if requested
    if (options.verbose) {
      finalConfig.logLevel = 'debug';
    }

    console.error('Simplified MCP Server starting...');
    console.error(`API Base URL: ${finalConfig.apiBaseUrl}`);
    console.error(`Log Level: ${finalConfig.logLevel}`);
    console.error(`Timeout: ${finalConfig.timeout}ms`);
    console.error('Configuration loaded successfully');

    // Initialize and start the MCP server
    server = new SimplifiedMCPServer(finalConfig);
    await server.start();

  } catch (error) {
    console.error('Failed to start Simplified MCP Server:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\nUse --help for usage information');
    process.exit(1);
  }
}

let server: SimplifiedMCPServer | null = null;
let isShuttingDown = false;

// Handle graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.error('Force shutdown...');
    process.exit(1);
  }

  isShuttingDown = true;
  console.error(`Received ${signal}, shutting down gracefully...`);

  try {
    if (server) {
      await server.stop();
      console.error('Server stopped successfully');
    }
  } catch (error) {
    console.error('Error during shutdown:', error instanceof Error ? error.message : String(error));
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});