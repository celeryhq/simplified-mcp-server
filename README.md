# Simplified MCP Server

A Model Context Protocol (MCP) server that provides seamless integration between Claude, Cursor, Kiro ( and other MCP supported platforms) and [Simplified's API](https://simplified.com). This server enables LLMs to interact with Simplified's services through standardized MCP tools, allowing for social media account management and post creation across multiple platforms.

## Features

- **Full MCP Protocol Support**: Built using the official @modelcontextprotocol/sdk
- **Social Media Management**: Comprehensive social media account and post management
- **Multi-Platform Support**: Support for Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube, Pinterest, Threads, Google Business Profile, and Bluesky
- **Type-Safe Implementation**: Written in TypeScript with full type safety
- **Robust Error Handling**: Comprehensive error handling with detailed error messages
- **Configurable Logging**: Adjustable logging levels for debugging and monitoring
- **Platform-Specific Features**: Advanced platform-specific settings for Google Business Profile, TikTok, YouTube, Instagram, and more
- **Scheduling Support**: Create scheduled posts with platform-specific settings
- **Authentication Management**: Secure API token handling with automatic retry logic

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- A [Simplified API token](https://simplified.readme.io/reference/authentication)

### Install from NPM

```bash
npm install -g simplified-mcp-server
```

### Install from Source

```bash
git clone https://github.com/celeryhq/simplified-mcp-server.git
cd simplified-mcp-server
npm install
npm run build
```

### pack DXT file
```bash
npm install -g @anthropic-ai/dxt
npx @anthropic-ai/dxt pack        
```

## Configuration

The server is configured using environment variables. Create a `.env` file in your project root or set these variables in your environment:

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SIMPLIFIED_API_TOKEN` | Your Simplified API token | `sk_live_abc123...` |

### Optional Configuration

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `SIMPLIFIED_API_BASE_URL` | Simplified API base URL | `https://api.simplified.com` | Any valid URL |
| `LOG_LEVEL` | Logging verbosity level | `info` | `debug`, `info`, `warn`, `error` |
| `REQUEST_TIMEOUT` | API request timeout (ms) | `30000` | Any positive number |
| `RETRY_ATTEMPTS` | Number of retry attempts | `3` | Any non-negative number |
| `RETRY_DELAY` | Delay between retries (ms) | `1000` | Any positive number |

### Workflow Tool Configuration

The server supports dynamic workflow tools that automatically discover and register tools based on available workflows. This feature is disabled by default and can be enabled through environment variables.

| Variable | Description | Default | Range/Options |
|----------|-------------|---------|---------------|
| `WORKFLOWS_ENABLED` | Enable dynamic workflow tools | `false` | `true`, `false` |
| `WORKFLOW_DISCOVERY_INTERVAL` | Auto-refresh interval (ms) | `0` (disabled) | `0-86400000` (0 = disabled) |
| `WORKFLOW_EXECUTION_TIMEOUT` | Execution timeout (ms) | `300000` (5 min) | `1000-3600000` |
| `WORKFLOW_MAX_CONCURRENT_EXECUTIONS` | Max concurrent executions | `10` | `1-100` |
| `WORKFLOW_FILTER_PATTERNS` | Comma-separated name patterns | `` (none) | Wildcard patterns |
| `WORKFLOW_STATUS_CHECK_INTERVAL` | Status polling interval (ms) | `5000` | `1000-300000` |
| `WORKFLOW_RETRY_ATTEMPTS` | Retry attempts for failures | `3` | `0-10` |

### Example Configuration

```bash
# Required
SIMPLIFIED_API_TOKEN=sk_live_your_token_here

# Optional - Basic Configuration
SIMPLIFIED_API_BASE_URL=https://api.simplified.com
LOG_LEVEL=info
REQUEST_TIMEOUT=30000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000

# Optional - Workflow Configuration
WORKFLOWS_ENABLED=true
WORKFLOW_DISCOVERY_INTERVAL=300000
WORKFLOW_EXECUTION_TIMEOUT=600000
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=10
WORKFLOW_FILTER_PATTERNS=data-*,report-*
WORKFLOW_STATUS_CHECK_INTERVAL=5000
WORKFLOW_RETRY_ATTEMPTS=3
```

### Environment-Specific Configuration Examples

#### Development Environment
```bash
# Development settings for faster feedback
WORKFLOWS_ENABLED=true
WORKFLOW_DISCOVERY_INTERVAL=60000          # 1 minute refresh
WORKFLOW_EXECUTION_TIMEOUT=120000          # 2 minute timeout
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=5       # Lower concurrency
WORKFLOW_STATUS_CHECK_INTERVAL=2000        # 2 second polling
WORKFLOW_RETRY_ATTEMPTS=1                  # Fewer retries
LOG_LEVEL=debug
```

#### Production Environment
```bash
# Production settings for stability and performance
WORKFLOWS_ENABLED=true
WORKFLOW_DISCOVERY_INTERVAL=600000         # 10 minute refresh
WORKFLOW_EXECUTION_TIMEOUT=600000          # 10 minute timeout
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=20      # Higher concurrency
WORKFLOW_STATUS_CHECK_INTERVAL=10000       # 10 second polling
WORKFLOW_RETRY_ATTEMPTS=5                  # More retries
LOG_LEVEL=warn
```

## Usage

### Programmatic Usage

```typescript
import { SimplifiedMCPServer } from 'simplified-mcp-server';
import { ConfigurationManager } from 'simplified-mcp-server/config';

async function startServer() {
  const config = ConfigurationManager.loadConfig();
  const server = new SimplifiedMCPServer(config);
  await server.start();
}

startServer().catch(console.error);
```

### Integration with Claude

Add the server to your Claude MCP configuration:

```json
{
   "mcpServers": {
      "simplified": {
        "command": "node",
        "args": [
          "{PATH_TO_CLONED_REPOSITORY}/dist/cli.js",
          "start"
        ],
        "env": {
          "SIMPLIFIED_API_TOKEN": "your_token_here",
          "SIMPLIFIED_API_BASE_URL": "https://api.simplified.com",
          "LOG_LEVEL": "info",
          "WORKFLOWS_ENABLED": "true",
          "WORKFLOW_EXECUTION_TIMEOUT": "600000"
        }
      }
    }
}
```

Install DXT extension:

Extensions -> Advanced settings -> Install Extension...

Choose simplified-mcp.dxt file.
Add your token.

### Integration with Kiro

Add the server to your Kiro MCP configuration:

```json
{
  "mcpServers": {
    "simplified": {
      "command": "simplified-mcp-server",
      "env": {
        "SIMPLIFIED_API_TOKEN": "your_token_here",
        "WORKFLOWS_ENABLED": "true",
        "WORKFLOW_DISCOVERY_INTERVAL": "300000",
        "WORKFLOW_EXECUTION_TIMEOUT": "600000"
      }
    }
  }
}
```

## Available Tools

The server provides comprehensive social media management tools with platform-specific features, plus dynamic workflow tools for extended functionality:

### Social Media Tools

Tools for managing social media accounts and posts.

#### `get_social_media_accounts`
Retrieve all connected social media accounts.

**Parameters:**
- `network` (optional): Filter by platform (facebook, instagram, linkedin, tiktok, youtube, pinterest, threads, google, bluesky, tiktokBusiness)

**Example:**
```json
{
  "name": "get_social_media_accounts",
  "arguments": {
    "network": "instagram"
  }
}
```

#### `create_social_media_post`
Create a new social media post with platform-specific settings for Google, TikTok, Threads, YouTube, Facebook, LinkedIn, Instagram, and Pinterest.

**Parameters:**
- `message` (required): Post message/content (1-5000 characters)
- `accountId` (required): Social media account ID
- `action` (required): Action to perform (schedule, add_to_queue, draft)
- `date` (optional): Scheduled date for the post (format: YYYY-MM-DD HH:MM)
- `media` (optional): Array of media file URLs to attach (max 10 items)
- `additional` (optional): Platform-specific post settings and metadata

**Basic Example:**
```json
{
  "name": "create_social_media_post",
  "arguments": {
    "message": "Excited to announce our new product launch! 🚀",
    "accountId": "acc_fb123",
    "action": "schedule",
    "date": "2024-01-22 12:00",
    "media": [
      "https://example.com/product-image.jpg",
      "https://example.com/launch-video.mp4"
    ],
    "additional": {}
  }
}
```

### Media Files

The `media` parameter accepts an array of URL strings pointing to your media files:

```json
{
  "media": [
    "https://example.com/image1.jpg",
    "https://example.com/video.mp4",
    "https://example.com/image2.png"
  ]
}
```

**Media Requirements:**
- Maximum 10 media files per post
- URLs must be publicly accessible
- Supported formats vary by platform (images: JPG, PNG, GIF; videos: MP4, MOV, etc.)

### Platform-Specific Features

The `additional` parameter supports platform-specific configurations:

#### Google Business Profile
```json
{
  "additional": {
    "google": {
      "post": {
        "title": "New Product Launch",
        "topicType": "OFFER",
        "couponCode": "LAUNCH20",
        "callToActionUrl": "https://example.com/product",
        "callToActionType": "SHOP",
        "termsConditions": "Valid until end of month"
      }
    }
  }
}
```

#### TikTok / TikTok Business
```json
{
  "additional": {
    "tiktok": {
      "post": {
        "brandContent": true,
        "privacyStatus": "PUBLIC_TO_EVERYONE",
        "duetDisabled": false,
        "commentDisabled": false
      },
      "channel": { "value": "direct" },
      "postType": { "value": "video" }
    }
  }
}
```

#### YouTube
```json
{
  "additional": {
    "youtube": {
      "post": {
        "title": "Product Launch Video",
        "license": "standard",
        "privacyStatus": "public",
        "selfDeclaredMadeForKids": "no"
      },
      "postType": { "value": "short" }
    }
  }
}
```

#### Instagram
```json
{
  "additional": {
    "instagram": {
      "postReel": {
        "audioName": "Trending Audio Track",
        "shareToFeed": true
      },
      "postType": { "value": "reel" }
    }
  }
}
```

#### Pinterest
```json
{
  "additional": {
    "pinterest": {
      "post": {
        "link": "https://example.com/product",
        "title": "Amazing Product",
        "imageAlt": "Product showcase image"
      }
    }
  }
}
```

#### LinkedIn
```json
{
  "additional": {
    "linkedin": {
      "audience": { "value": "PUBLIC" }
    }
  }
}
```

#### Facebook
```json
{
  "additional": {
    "facebook": {
      "postType": { "value": "feed" }
    }
  }
}
```

#### Threads
```json
{
  "additional": {
    "threads": {
      "channel": { "value": "direct" }
    }
  }
}
```

### Dynamic Workflow Tools

The server supports dynamic workflow tools that automatically discover and register tools based on workflows provided by a `workflows-list-tool`. This feature enables the server to expose workflow-based functionality as standard MCP tools without requiring code changes.

#### Enabling Workflow Tools

To enable dynamic workflow tools, set the following environment variable:

```bash
WORKFLOWS_ENABLED=true
```

When enabled, the server will:
1. Query the `workflows-list-tool` to discover available workflows
2. Automatically register MCP tools for each discovered workflow
3. Handle workflow execution through standard MCP tool calls
4. Provide status checking capabilities for running workflows

#### Workflow Tool Discovery

The server discovers workflows by calling a `workflows-list-tool` that should return an array of workflow definitions. Each workflow must conform to this schema:

```json
{
  "id": "workflow-123",
  "name": "Data Analysis Workflow",
  "description": "Analyzes data and generates reports",
  "category": "analytics",
  "version": "1.0.0",
  "inputSchema": {
    "type": "object",
    "properties": {
      "dataset": {
        "type": "string",
        "description": "Path to the dataset file"
      },
      "format": {
        "type": "string",
        "enum": ["csv", "json", "xlsx"],
        "description": "Data format"
      }
    },
    "required": ["dataset"]
  },
  "executionType": "async",
  "metadata": {
    "estimatedDuration": "5-10 minutes",
    "resourceRequirements": "medium"
  }
}
```

#### Using Workflow Tools

Once discovered, workflow tools appear in the standard MCP tools list and can be called like any other tool:

```json
{
  "name": "workflow-data-analysis-workflow",
  "arguments": {
    "dataset": "/path/to/data.csv",
    "format": "csv"
  }
}
```

#### Workflow Execution Flow

1. **Tool Call**: MCP client calls a workflow tool with parameters
2. **Execution Start**: Server makes POST call to workflow execution endpoint
3. **Status Polling**: Server polls workflow status with minimum 1000ms intervals
4. **Result Return**: Server returns workflow results in standard MCP format

Example execution response:
```json
{
  "success": true,
  "data": {
    "workflowId": "workflow-123",
    "executionId": "exec-456",
    "status": "COMPLETED",
    "results": {
      "summary": "Analysis completed successfully",
      "reportUrl": "https://example.com/report.pdf",
      "metrics": {
        "recordsProcessed": 10000,
        "executionTime": "4m 32s"
      }
    }
  }
}
```

#### Workflow Status Checking

The server provides a built-in `workflow-status-check` tool for monitoring workflow executions:

```json
{
  "name": "workflow-status-check",
  "arguments": {
    "workflowId": "workflow-123",
    "executionId": "exec-456"
  }
}
```

Status response includes:
- Current execution status (RUNNING, COMPLETED, FAILED, CANCELLED)
- Start and end times
- Progress information (if available)
- Input parameters and output results
- Error details (if failed)

#### Workflow Configuration Options

##### Discovery and Refresh
```bash
# Enable automatic workflow discovery
WORKFLOWS_ENABLED=true

# Refresh workflows every 5 minutes (300000ms)
WORKFLOW_DISCOVERY_INTERVAL=300000
```

##### Execution Management
```bash
# Set workflow execution timeout to 10 minutes
WORKFLOW_EXECUTION_TIMEOUT=600000

# Allow up to 15 concurrent workflow executions
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=15

# Check workflow status every 3 seconds
WORKFLOW_STATUS_CHECK_INTERVAL=3000
```

##### Workflow Filtering
```bash
# Only expose workflows matching these patterns
WORKFLOW_FILTER_PATTERNS=data-*,report-*,analysis-*

# This would expose workflows like:
# - data-processing-workflow
# - report-generation-workflow  
# - analysis-customer-workflow
# But not:
# - admin-cleanup-workflow
# - test-workflow
```

##### Error Handling
```bash
# Retry failed workflow operations up to 5 times
WORKFLOW_RETRY_ATTEMPTS=5
```

#### Workflow Tool Examples

##### Data Processing Workflow
```json
{
  "name": "workflow-data-processor",
  "arguments": {
    "inputFile": "sales-data-2024.csv",
    "operations": ["clean", "aggregate", "analyze"],
    "outputFormat": "json"
  }
}
```

##### Report Generation Workflow
```json
{
  "name": "workflow-monthly-report",
  "arguments": {
    "month": "2024-01",
    "includeCharts": true,
    "recipients": ["manager@company.com"],
    "format": "pdf"
  }
}
```

##### Machine Learning Workflow
```json
{
  "name": "workflow-ml-training",
  "arguments": {
    "dataset": "customer-behavior.csv",
    "algorithm": "random-forest",
    "testSplit": 0.2,
    "hyperparameters": {
      "n_estimators": 100,
      "max_depth": 10
    }
  }
}
```

### Platform-Specific Options Reference

| Platform | Available Options | Description |
|----------|------------------|-------------|
| **Google Business Profile** | `title`, `topicType`, `couponCode`, `callToActionUrl`, `callToActionType`, `termsConditions` | Business post enhancements with CTAs and offers |
| **TikTok/TikTok Business** | `brandContent`, `privacyStatus`, `duetDisabled`, `stitchDisabled`, `commentDisabled` | Content settings and engagement controls |
| **YouTube** | `title`, `license`, `privacyStatus`, `selfDeclaredMadeForKids` | Video metadata and compliance settings |
| **Instagram** | `audioName`, `shareToFeed`, `postType` | Reel-specific settings and feed sharing |
| **Pinterest** | `link`, `title`, `imageAlt` | Pin destination and accessibility |
| **LinkedIn** | `audience` | Professional audience targeting |
| **Facebook** | `postType` | Content type specification |
| **Threads** | `channel` | Publishing method |

### Workflow Tools

Dynamic tools automatically generated from discovered workflows. These tools are only available when `WORKFLOWS_ENABLED=true`.

#### `workflow-status-check`
Check the status of a running workflow execution.

**Parameters:**
- `workflowId` (required): The original workflow ID
- `executionId` (required): The workflow execution ID (UUID)

**Example:**
```json
{
  "name": "workflow-status-check",
  "arguments": {
    "workflowId": "data-processor-v2",
    "executionId": "8f496b6a-c905-41bb-b7b7-200a8982ab30"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "RUNNING",
    "progress": 65,
    "startTime": 1753703781802,
    "estimatedCompletion": "2024-01-22T12:45:00Z",
    "input": {
      "dataset": "sales-data.csv",
      "format": "csv"
    },
    "output": null
  }
}
```

#### Dynamic Workflow Tools

Each discovered workflow becomes an individual MCP tool with the naming pattern `workflow-{workflow-name}`. The tool parameters are dynamically generated based on the workflow's input schema.

**Example Workflow Tools:**
- `workflow-data-analysis` - Analyze datasets and generate insights
- `workflow-report-generator` - Create automated reports
- `workflow-image-processor` - Process and transform images
- `workflow-email-campaign` - Send targeted email campaigns
- `workflow-backup-system` - Perform system backups

**Dynamic Tool Example:**
```json
{
  "name": "workflow-customer-segmentation",
  "arguments": {
    "customerData": "customers-2024.csv",
    "segmentationCriteria": ["age", "purchase_history", "location"],
    "outputFormat": "json",
    "includeVisualization": true
  }
}
```

**Dynamic Tool Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "exec-789",
    "status": "COMPLETED",
    "results": {
      "segments": [
        {
          "name": "High Value Customers",
          "count": 1250,
          "criteria": "age: 25-45, purchases: >$500/month"
        },
        {
          "name": "Occasional Buyers",
          "count": 3400,
          "criteria": "age: 18-65, purchases: $50-$500/month"
        }
      ],
      "visualizationUrl": "https://example.com/segments-chart.png",
      "executionTime": "3m 45s"
    }
  }
}
```

## Error Handling

The server provides comprehensive error handling with detailed error messages:

### Error Types

- **Configuration Errors**: Missing or invalid configuration
- **Authentication Errors**: Invalid or expired API tokens
- **API Errors**: Errors from Simplified's API
- **Tool Execution Errors**: Errors during tool execution
- **Validation Errors**: Invalid tool parameters
- **Workflow Discovery Errors**: Issues discovering or validating workflows
- **Workflow Execution Errors**: Failures during workflow execution
- **Workflow Timeout Errors**: Workflow execution exceeding timeout limits

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "type": "AUTHENTICATION_ERROR",
    "code": 401,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Workflow-Specific Error Examples

#### Workflow Discovery Error
```json
{
  "success": false,
  "error": "Failed to discover workflows",
  "details": {
    "type": "WORKFLOW_DISCOVERY_ERROR",
    "message": "workflows-list-tool is not available",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "retryAfter": 300
  }
}
```

#### Workflow Execution Error
```json
{
  "success": false,
  "error": "Workflow execution failed",
  "details": {
    "type": "WORKFLOW_EXECUTION_ERROR",
    "workflowId": "data-processor",
    "executionId": "exec-123",
    "status": "FAILED",
    "message": "Invalid input format: expected CSV, got JSON",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Workflow Timeout Error
```json
{
  "success": false,
  "error": "Workflow execution timed out",
  "details": {
    "type": "WORKFLOW_TIMEOUT_ERROR",
    "workflowId": "long-running-analysis",
    "executionId": "exec-456",
    "timeout": 300000,
    "elapsed": 300001,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Development

### Building from Source

```bash
git clone https://github.com/celeryhq/simplified-mcp-server.git
cd simplified-mcp-server
npm install
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Development Mode

```bash
# Start in development mode with auto-reload
npm run dev

# Start in development mode with watch
npm run dev:watch
```

### Project Structure

```
simplified-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── cli.ts                # Command line interface
│   ├── config/
│   │   └── configuration.ts  # Configuration management
│   ├── tools/
│   │   ├── registry.ts       # Tool registry
│   │   ├── definitions.ts    # Tool definition utilities
│   │   └── implementations/  # Tool implementations
│   │       ├── social-media-tools.ts  # Social media management tools
│   │       └── index.ts               # Tool exports
│   ├── api/
│   │   └── client.ts         # Simplified API client
│   ├── utils/
│   │   ├── errors.ts         # Error handling utilities
│   │   └── logger.ts         # Logging utilities
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── tests/                    # Test files
├── dist/                     # Compiled JavaScript
└── docs/                     # Documentation
```

## Workflow Configuration Guide

### Understanding Workflow Tools

Workflow tools extend the server's capabilities by automatically discovering and registering tools based on external workflow definitions. This allows you to expose complex business processes, data pipelines, and automation workflows as simple MCP tools.

### Configuration Parameters Explained

#### `WORKFLOWS_ENABLED`
**Purpose**: Master switch for workflow functionality  
**Default**: `false`  
**Recommendation**: Set to `true` only when you have a `workflows-list-tool` available

```bash
# Enable workflow tools
WORKFLOWS_ENABLED=true
```

#### `WORKFLOW_DISCOVERY_INTERVAL`
**Purpose**: How often to refresh the list of available workflows  
**Default**: `0` (disabled)  
**Range**: `0-86400000` ms (0 = disabled, max = 24 hours)  
**Recommendation**: 
- Development: `60000` (1 minute) for rapid iteration
- Production: `600000` (10 minutes) for stability
- Set to `0` if workflows rarely change

```bash
# Refresh every 5 minutes
WORKFLOW_DISCOVERY_INTERVAL=300000

# Disable automatic refresh
WORKFLOW_DISCOVERY_INTERVAL=0
```

#### `WORKFLOW_EXECUTION_TIMEOUT`
**Purpose**: Maximum time to wait for workflow completion  
**Default**: `300000` ms (5 minutes)  
**Range**: `1000-3600000` ms (1 second to 1 hour)  
**Recommendation**: Set based on your longest-running workflow

```bash
# For quick workflows (e.g., data validation)
WORKFLOW_EXECUTION_TIMEOUT=30000

# For long workflows (e.g., ML training)
WORKFLOW_EXECUTION_TIMEOUT=1800000
```

#### `WORKFLOW_MAX_CONCURRENT_EXECUTIONS`
**Purpose**: Limit simultaneous workflow executions to prevent resource exhaustion  
**Default**: `10`  
**Range**: `1-100`  
**Recommendation**: 
- Development: `3-5` for resource-constrained environments
- Production: `10-20` based on server capacity

```bash
# Conservative limit for development
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=3

# Higher limit for production
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=20
```

#### `WORKFLOW_FILTER_PATTERNS`
**Purpose**: Control which workflows are exposed as tools  
**Default**: `` (empty - all workflows exposed)  
**Format**: Comma-separated wildcard patterns  
**Examples**:

```bash
# Only expose data-related workflows
WORKFLOW_FILTER_PATTERNS=data-*

# Multiple patterns
WORKFLOW_FILTER_PATTERNS=data-*,report-*,analysis-*

# Exclude test workflows
WORKFLOW_FILTER_PATTERNS=*,-test-*,-dev-*

# Expose all workflows (default)
WORKFLOW_FILTER_PATTERNS=
```

#### `WORKFLOW_STATUS_CHECK_INTERVAL`
**Purpose**: How often to poll workflow status during execution  
**Default**: `5000` ms (5 seconds)  
**Range**: `1000-300000` ms (1 second to 5 minutes)  
**Recommendation**: Balance between responsiveness and API load

```bash
# Frequent polling for interactive workflows
WORKFLOW_STATUS_CHECK_INTERVAL=2000

# Less frequent polling to reduce API load
WORKFLOW_STATUS_CHECK_INTERVAL=10000
```

#### `WORKFLOW_RETRY_ATTEMPTS`
**Purpose**: Number of retry attempts for failed workflow operations  
**Default**: `3`  
**Range**: `0-10`  
**Recommendation**: 
- Development: `1` for faster failure feedback
- Production: `3-5` for reliability

```bash
# No retries for testing
WORKFLOW_RETRY_ATTEMPTS=0

# More retries for production reliability
WORKFLOW_RETRY_ATTEMPTS=5
```

### Configuration Best Practices

#### Development Environment
```bash
# Fast feedback, lower resource usage
WORKFLOWS_ENABLED=true
WORKFLOW_DISCOVERY_INTERVAL=60000
WORKFLOW_EXECUTION_TIMEOUT=120000
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=3
WORKFLOW_STATUS_CHECK_INTERVAL=2000
WORKFLOW_RETRY_ATTEMPTS=1
WORKFLOW_FILTER_PATTERNS=dev-*,test-*
LOG_LEVEL=debug
```

#### Production Environment
```bash
# Stability and performance focused
WORKFLOWS_ENABLED=true
WORKFLOW_DISCOVERY_INTERVAL=600000
WORKFLOW_EXECUTION_TIMEOUT=600000
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=15
WORKFLOW_STATUS_CHECK_INTERVAL=5000
WORKFLOW_RETRY_ATTEMPTS=3
WORKFLOW_FILTER_PATTERNS=prod-*
LOG_LEVEL=warn
```

#### Testing Environment
```bash
# Predictable behavior for tests
WORKFLOWS_ENABLED=false
WORKFLOW_DISCOVERY_INTERVAL=0
WORKFLOW_EXECUTION_TIMEOUT=30000
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=1
WORKFLOW_STATUS_CHECK_INTERVAL=1000
WORKFLOW_RETRY_ATTEMPTS=0
LOG_LEVEL=error
```

### Configuration Validation

The server validates all workflow configuration on startup and provides detailed error messages for invalid values:

```bash
# Example validation error
Configuration validation failed:
Invalid configuration values: workflowExecutionTimeout: Workflow execution timeout must be at least 1000ms (1 second)

Workflow configuration guidelines:
- Set WORKFLOW_DISCOVERY_INTERVAL to 0 to disable automatic refresh
- Use WORKFLOW_FILTER_PATTERNS to limit which workflows are exposed (e.g., "data-*,report-*")
- Minimum WORKFLOW_STATUS_CHECK_INTERVAL is 1000ms to avoid excessive API calls
- WORKFLOW_EXECUTION_TIMEOUT should be set based on your longest-running workflows
```

### Performance Considerations

#### API Rate Limiting
- Set `WORKFLOW_DISCOVERY_INTERVAL` to at least 60 seconds to avoid rate limits
- Use `WORKFLOW_STATUS_CHECK_INTERVAL` of at least 2 seconds for status polling
- Consider the total API load: discovery + (concurrent executions × status checks)

#### Resource Management
- Monitor memory usage with high `WORKFLOW_MAX_CONCURRENT_EXECUTIONS`
- Long-running workflows may require increased `WORKFLOW_EXECUTION_TIMEOUT`
- Use workflow filtering to reduce the number of registered tools

#### Monitoring Recommendations
```bash
# Enable detailed logging for monitoring
LOG_LEVEL=info

# Set reasonable limits
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=10
WORKFLOW_EXECUTION_TIMEOUT=300000

# Monitor workflow performance
WORKFLOW_STATUS_CHECK_INTERVAL=5000
```

## Troubleshooting

### Common Issues

#### Server Won't Start

**Problem**: Server fails to start with configuration error.

**Solution**: 
1. Verify your `.env` file contains `SIMPLIFIED_API_TOKEN`
2. Check that your API token is valid
3. Ensure Node.js version is 18.0.0 or higher

```bash
# Check Node.js version
node --version

# Verify environment variables
echo $SIMPLIFIED_API_TOKEN
```

#### Authentication Errors

**Problem**: API calls fail with authentication errors.

**Solution**:
1. Verify your API token is correct and not expired
2. Check that the token has the necessary permissions
3. Ensure the API base URL is correct

#### Tool Execution Failures

**Problem**: Tools return errors or unexpected results.

**Solution**:
1. Check the tool parameters match the expected schema
2. Verify the API endpoint exists and is accessible
3. Check server logs for detailed error information

```bash
# Enable debug logging
LOG_LEVEL=debug simplified-mcp-server
```

#### Connection Issues

**Problem**: Cannot connect to Simplified API.

**Solution**:
1. Check your internet connection
2. Verify the API base URL is accessible
3. Check if there are any firewall restrictions
4. Use the health check tool to diagnose connectivity

#### Workflow Tool Issues

**Problem**: Workflow tools are not appearing in the tools list.

**Solution**:
1. Verify `WORKFLOWS_ENABLED=true` is set in your environment
2. Check that the `workflows-list-tool` is available and responding
3. Verify workflow definitions match the expected schema
4. Check server logs for workflow discovery errors

```bash
# Enable debug logging to see workflow discovery details
LOG_LEVEL=debug simplified-mcp-server
```

**Problem**: Workflow execution times out or fails.

**Solution**:
1. Increase `WORKFLOW_EXECUTION_TIMEOUT` for longer-running workflows
2. Check workflow status using the `workflow-status-check` tool
3. Verify workflow parameters match the expected schema
4. Check if the workflow execution system is available

```bash
# Increase timeout to 10 minutes for long workflows
WORKFLOW_EXECUTION_TIMEOUT=600000
```

**Problem**: Too many concurrent workflow executions causing errors.

**Solution**:
1. Reduce `WORKFLOW_MAX_CONCURRENT_EXECUTIONS` to limit resource usage
2. Implement workflow queuing in your application
3. Monitor system resources during peak usage

```bash
# Limit to 5 concurrent executions
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=5
```

**Problem**: Workflow discovery is too frequent and causing API rate limits.

**Solution**:
1. Increase `WORKFLOW_DISCOVERY_INTERVAL` to reduce API calls
2. Set to 0 to disable automatic discovery and use manual refresh
3. Implement workflow caching in your application

```bash
# Refresh workflows every 30 minutes instead of every 5 minutes
WORKFLOW_DISCOVERY_INTERVAL=1800000

# Or disable automatic discovery
WORKFLOW_DISCOVERY_INTERVAL=0
```

**Problem**: Only some workflows are being discovered.

**Solution**:
1. Check `WORKFLOW_FILTER_PATTERNS` configuration
2. Verify workflow names match your filter patterns
3. Remove filters to see all available workflows

```bash
# Remove all filters to see all workflows
WORKFLOW_FILTER_PATTERNS=

# Or adjust patterns to include more workflows
WORKFLOW_FILTER_PATTERNS=*
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
LOG_LEVEL=debug simplified-mcp-server
```

### Health Check

Use the built-in health check tool to verify server status:

```json
{
  "name": "simplified-health-check",
  "arguments": {
    "includeDetails": true
  }
}
```

### Workflow Troubleshooting Guide

#### Workflow Discovery Issues

**Symptom**: No workflow tools appear in tools list despite `WORKFLOWS_ENABLED=true`

**Diagnostic Steps**:
1. Enable debug logging: `LOG_LEVEL=debug`
2. Check server startup logs for workflow discovery messages
3. Verify `workflows-list-tool` is available and responding

**Common Causes & Solutions**:
```bash
# Cause: workflows-list-tool not found
# Solution: Ensure the tool is properly registered and available
LOG_LEVEL=debug simplified-mcp-server
# Look for: "Workflow discovery failed: workflows-list-tool not found"

# Cause: Invalid workflow definitions
# Solution: Check workflow schema compliance
# Look for: "Skipping invalid workflow: missing required field 'name'"

# Cause: All workflows filtered out
# Solution: Check filter patterns
WORKFLOW_FILTER_PATTERNS=  # Remove filters temporarily
```

**Symptom**: Workflows discovered but tools not registered

**Diagnostic Steps**:
1. Check for tool name conflicts in logs
2. Verify workflow names are valid MCP tool names
3. Look for schema validation errors

**Solutions**:
```bash
# Enable detailed tool registration logging
LOG_LEVEL=debug

# Check for naming conflicts
# Look for: "Tool name conflict: workflow-data-processor already exists"

# Verify workflow names contain only valid characters
# Valid: data-processor, report_generator, analysis123
# Invalid: data processor, report-generator!, análisis
```

#### Workflow Execution Issues

**Symptom**: Workflow execution times out

**Diagnostic Steps**:
1. Check workflow execution logs
2. Verify workflow is actually running
3. Monitor workflow status manually

**Solutions**:
```bash
# Increase timeout for long-running workflows
WORKFLOW_EXECUTION_TIMEOUT=1800000  # 30 minutes

# Check workflow status manually
{
  "name": "workflow-status-check",
  "arguments": {
    "workflowId": "your-workflow-id",
    "executionId": "execution-uuid"
  }
}

# Reduce status check interval for better monitoring
WORKFLOW_STATUS_CHECK_INTERVAL=2000
```

**Symptom**: Workflow execution fails immediately

**Diagnostic Steps**:
1. Validate input parameters against workflow schema
2. Check workflow system availability
3. Verify API credentials and permissions

**Solutions**:
```bash
# Enable parameter validation logging
LOG_LEVEL=debug

# Check parameter schema compliance
# Look for: "Parameter validation failed: 'dataset' is required"

# Test workflow system connectivity
# Use workflow-status-check with a known execution ID
```

#### Performance Issues

**Symptom**: Server becomes slow or unresponsive

**Diagnostic Steps**:
1. Check concurrent execution count
2. Monitor memory and CPU usage
3. Review workflow discovery frequency

**Solutions**:
```bash
# Reduce concurrent executions
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=5

# Increase discovery interval to reduce API load
WORKFLOW_DISCOVERY_INTERVAL=1800000  # 30 minutes

# Disable automatic discovery if not needed
WORKFLOW_DISCOVERY_INTERVAL=0

# Use workflow filtering to reduce tool count
WORKFLOW_FILTER_PATTERNS=essential-*,critical-*
```

**Symptom**: Excessive API calls causing rate limiting

**Solutions**:
```bash
# Increase status check interval
WORKFLOW_STATUS_CHECK_INTERVAL=10000  # 10 seconds

# Reduce discovery frequency
WORKFLOW_DISCOVERY_INTERVAL=3600000   # 1 hour

# Limit concurrent executions
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=3
```

#### Configuration Issues

**Symptom**: Server fails to start with workflow configuration errors

**Common Errors & Solutions**:
```bash
# Error: "Workflow execution timeout must be at least 1000ms"
WORKFLOW_EXECUTION_TIMEOUT=30000  # Set to at least 1 second

# Error: "Status check interval must be at least 1000ms"
WORKFLOW_STATUS_CHECK_INTERVAL=2000  # Set to at least 1 second

# Error: "Maximum concurrent executions must be positive"
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=5  # Set to positive number

# Error: "Discovery interval cannot exceed 24 hours"
WORKFLOW_DISCOVERY_INTERVAL=3600000   # Set to max 1 hour
```

#### Integration Issues

**Symptom**: Workflows work in testing but fail in production

**Diagnostic Checklist**:
1. Environment variable differences
2. Network connectivity and firewall rules
3. API endpoint availability
4. Resource limits and timeouts

**Production Configuration Review**:
```bash
# Ensure production-appropriate timeouts
WORKFLOW_EXECUTION_TIMEOUT=600000     # 10 minutes
WORKFLOW_STATUS_CHECK_INTERVAL=5000   # 5 seconds
WORKFLOW_DISCOVERY_INTERVAL=600000    # 10 minutes

# Set appropriate concurrency limits
WORKFLOW_MAX_CONCURRENT_EXECUTIONS=15

# Use production workflow filters
WORKFLOW_FILTER_PATTERNS=prod-*,live-*

# Enable appropriate logging
LOG_LEVEL=warn  # Reduce log noise in production
```

#### Debug Commands

**Enable Maximum Debugging**:
```bash
LOG_LEVEL=debug
WORKFLOWS_ENABLED=true
WORKFLOW_DISCOVERY_INTERVAL=60000
WORKFLOW_STATUS_CHECK_INTERVAL=2000
WORKFLOW_RETRY_ATTEMPTS=1
```

**Test Workflow Discovery**:
```bash
# Start server and look for these log messages:
# "Starting workflow discovery..."
# "Discovered X workflows"
# "Registered workflow tool: workflow-name"
# "Workflow discovery completed"
```

**Test Workflow Execution**:
```bash
# Use a simple workflow first
{
  "name": "workflow-simple-test",
  "arguments": {
    "input": "test-value"
  }
}

# Monitor logs for:
# "Starting workflow execution: workflow-id"
# "Workflow status: RUNNING"
# "Workflow completed: execution-id"
```

### Getting Help

1. **Check the logs**: Enable debug logging to see detailed error information
2. **Verify configuration**: Ensure all required environment variables are set
3. **Test connectivity**: Use the health check and API status tools
4. **Check API documentation**: Verify endpoint paths and parameters
5. **Test workflow tools**: Start with simple workflows before complex ones
6. **Monitor resources**: Check memory and CPU usage during workflow execution
7. **Report issues**: Create an issue on the GitHub repository with logs and configuration details

## API Reference

### Server Configuration

The server accepts the following configuration options:

```typescript
interface ServerConfig {
  // Basic Configuration
  apiToken: string;           // Required: Simplified API token
  apiBaseUrl: string;         // Optional: API base URL
  logLevel: 'debug' | 'info' | 'warn' | 'error'; // Optional: Log level
  timeout: number;            // Optional: Request timeout in ms
  retryAttempts: number;      // Optional: Number of retry attempts
  retryDelay: number;         // Optional: Delay between retries in ms
  
  // Workflow Configuration
  workflowsEnabled: boolean;                    // Optional: Enable workflow tools
  workflowDiscoveryInterval: number;            // Optional: Auto-refresh interval (ms)
  workflowExecutionTimeout: number;             // Optional: Execution timeout (ms)
  workflowMaxConcurrentExecutions: number;      // Optional: Max concurrent executions
  workflowFilterPatterns: string[];             // Optional: Workflow name patterns
  workflowStatusCheckInterval: number;          // Optional: Status polling interval (ms)
  workflowRetryAttempts: number;                // Optional: Retry attempts for failures
}
```

### Tool Response Format

All tools return responses in the following format:

```typescript
interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string; // JSON string containing the actual response data
  }>;
}
```

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "details": { /* additional error information */ }
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/simplified-mcp-server.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes and add tests
6. Run tests: `npm test`
7. Build the project: `npm run build`
8. Commit your changes: `git commit -m "Add your feature"`
9. Push to your fork: `git push origin feature/your-feature`
10. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **API Documentation**: [API Docs](https://simplified.readme.io/reference/introduction)
- **Documentation**: [GitHub Wiki](https://github.com/celeryhq/simplified-mcp-server/wiki)
- **Issues**: [GitHub Issues](https://github.com/celeryhq/simplified-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/celeryhq/simplified-mcp-server/discussions)

