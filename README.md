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

## pack DXT file
```bash
npm install -g @anthropic-ai/dxt
npx @anthropic-ai/dxt pack        

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

### Example Configuration

```bash
# Required
SIMPLIFIED_API_TOKEN=sk_live_your_token_here

# Optional
SIMPLIFIED_API_BASE_URL=https://api.simplified.com
LOG_LEVEL=info
REQUEST_TIMEOUT=30000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
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
          "LOG_LEVEL": "info"
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
        "SIMPLIFIED_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Available Tools

The server provides comprehensive social media management tools with platform-specific features:

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


## Error Handling

The server provides comprehensive error handling with detailed error messages:

### Error Types

- **Configuration Errors**: Missing or invalid configuration
- **Authentication Errors**: Invalid or expired API tokens
- **API Errors**: Errors from Simplified's API
- **Tool Execution Errors**: Errors during tool execution
- **Validation Errors**: Invalid tool parameters

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

### Getting Help

1. **Check the logs**: Enable debug logging to see detailed error information
2. **Verify configuration**: Ensure all required environment variables are set
3. **Test connectivity**: Use the health check and API status tools
4. **Check API documentation**: Verify endpoint paths and parameters
5. **Report issues**: Create an issue on the GitHub repository with logs and configuration details

## API Reference

### Server Configuration

The server accepts the following configuration options:

```typescript
interface ServerConfig {
  apiToken: string;           // Required: Simplified API token
  apiBaseUrl: string;         // Optional: API base URL
  logLevel: 'debug' | 'info' | 'warn' | 'error'; // Optional: Log level
  timeout: number;            // Optional: Request timeout in ms
  retryAttempts: number;      // Optional: Number of retry attempts
  retryDelay: number;         // Optional: Delay between retries in ms
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

