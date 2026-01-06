# Minds MCP Server

An MCP (Model Context Protocol) server for Minds, allowing LLMs to interact with the Minds SDK through a standardized interface.

## Installation

Install the required dependencies (virtual environment recommended)

```bash
python -m venv env
source env/bin/activate
```

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

## Configuration

The server can be configured using environment variables:

### FastMCP Settings

- `FASTMCP_DEBUG`: Enable debug mode (default: false)
- `FASTMCP_LOG_LEVEL`: Set log level (default: INFO)
- `FASTMCP_HOST`: Host to bind to (default: 0.0.0.0)
- `FASTMCP_PORT`: Port to bind to (default: 8000)
- `FASTMCP_SSE_PATH`: Path for SSE events (default: /sse)
- `FASTMCP_MESSAGE_PATH`: Path for messages (default: /messages/)

### Minds Settings

- `MINDS_BASE_URL`: Base URL for the Minds API (default: https://mdb.ai)

## Usage

### Starting the Server

```bash
python -m server
```

### Resource Templates

The server exposes the following resource templates according to the MCP specification:

- `minds://{api_key}` - List all available Minds
- `minds://{mind_name}/{api_key}` - Get a specific Mind by name

### Tool Templates

The server provides the following tool templates:

- `completion` - Generate a completion using a specified Mind
  - Parameters:
    - `mind_name`: The ID of the Mind to use
    - `message`: The message to complete
    - `api_key`: The Minds API key

## Development

### Running Tests

```bash
# Run all tests
python -m pytest

# Run only unit tests
python -m pytest tests/unit
```

### Development Mode

For easier development, you can use the MCP development server:

```bash
mcp dev server.py
```

This will start the server and open the MCP Inspector in your browser for testing.

## MCP Protocol

This server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), which provides:

- **Resource Templates**: Parameterized URL patterns for retrieving data
- **Tool Templates**: Function signatures for executing actions
- **Prompt Templates**: Reusable interaction templates (not used in this server)

MCP clients can:
1. Discover available resource and tool templates
2. Instantiate templates with parameters
3. Access resources and call tools in a standardized way