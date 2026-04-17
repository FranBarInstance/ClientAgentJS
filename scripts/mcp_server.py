#!/usr/bin/env python3
# pylint: disable=broad-exception-caught,broad-exception-raised,no-else-return,arguments-differ
"""
Example MCP Server - ZERO EXTERNAL DEPENDENCIES
100% Python standard library, no installation required
Manual CORS implementation for Javascript client calls
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime
import sys
from typing import Any

# --- Configuration ---
HOST = "0.0.0.0"
PORT = 8000

# --- Available MCP Tools ---
AVAILABLE_TOOLS = [
    {
        "name": "get_server_info",
        "description": "Get information about this MCP example server",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "calculate_sum",
        "description": "Calculate sum of a list of numbers",
        "inputSchema": {
            "type": "object",
            "properties": {
                "numbers": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "List of numeric values to sum"
                }
            },
            "required": ["numbers"]
        }
    },
    {
        "name": "get_current_time",
        "description": "Returns current server timestamp",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "translate_to_glorbish",
        "description": "Translate text into glorbish preserving the number of words",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to translate to glorbish"
                }
            },
            "required": ["text"]
        }
    }
]

class MCPServerHandler(BaseHTTPRequestHandler):
    """
    HTTP request handler for MCP Server.
    Inherits from BaseHTTPRequestHandler, method names do_GET, do_POST, do_OPTIONS
    are required by standard library and cannot be modified.
    """

    def _set_cors_headers(self, status_code=200):
        """Set complete CORS headers manually for cross origin requests"""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Expose-Headers", "*")
        self.end_headers()

    # pylint: disable=invalid-name
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self._set_cors_headers(204)

    # pylint: disable=invalid-name
    def do_GET(self):
        """Handle GET requests"""
        if self.path == "/health":
            self._set_cors_headers(200)
            response = {
                "status": "ok",
                "server": "MCP Example Server (Zero Dependencies)",
                "cors": "enabled",
                "timestamp": datetime.utcnow().isoformat()
            }
            self.wfile.write(json.dumps(response, indent=2).encode("utf-8"))
            return

        self._set_cors_headers(404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

    # pylint: disable=invalid-name
    def do_POST(self):
        """Handle POST requests for MCP protocol calls"""
        if self.path != "/mcp":
            self._set_cors_headers(404)
            return

        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request = json.loads(post_data.decode('utf-8'))

            method = request.get("method")
            request_id = request.get("id")
            params = request.get("params", {})

            result = self.handle_mcp_method(method, params)

            response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }

            self._set_cors_headers(200)
            self.wfile.write(json.dumps(response, indent=2).encode("utf-8"))

        except Exception as e:
            self._set_cors_headers(500)
            error_response = {
                "jsonrpc": "2.0",
                "id": request.get("id") if 'request' in locals() else None,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
            self.wfile.write(json.dumps(error_response).encode("utf-8"))

    def handle_mcp_method(self, method, params):
        """Dispatch MCP protocol methods according to specification"""
        if method == "initialize":
            return {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "Zero Dep MCP Server",
                    "version": "1.0.0"
                }
            }

        elif method == "tools/list":
            return {
                "tools": AVAILABLE_TOOLS
            }

        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            try:
                return self.execute_tool(tool_name, arguments)
            except Exception as e:
                return {
                    "isError": True,
                    "content": [
                        {
                            "type": "text",
                            "text": f"Error executing tool '{tool_name}': {str(e)}"
                        }
                    ]
                }

        else:
            raise Exception(f"Unsupported method: {method}")

    def execute_tool(self, tool_name, arguments):
        """Execute requested MCP tool with provided arguments"""
        if tool_name == "get_server_info":
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({
                            "server": "Zero Dependency MCP Server",
                            "version": "1.0.0",
                            "runtime": "Python Standard Library",
                            "cors_enabled": True,
                            "timestamp": datetime.utcnow().isoformat()
                        }, indent=2)
                    }
                ]
            }

        elif tool_name == "calculate_sum":
            numbers = self._extract_numbers(arguments)
            total = sum(numbers)
            if all(float(value).is_integer() for value in numbers):
                total = int(total)

            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Calculated sum: {total}\nValues: {numbers}"
                    }
                ]
            }

        elif tool_name == "get_current_time":
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Current server time: {datetime.now().isoformat()}"
                    }
                ]
            }

        elif tool_name == "translate_to_glorbish":
            source_text = self._extract_text(arguments)
            translated_text = self._translate_to_glorbish(source_text)
            return {
                "content": [
                    {
                        "type": "text",
                        "text": translated_text
                    }
                ]
            }

        else:
            raise Exception(f"Unknown tool: {tool_name}")

    def _extract_numbers(self, arguments: Any):
        """Parse and normalize numeric arguments for calculate_sum."""
        if arguments is None:
            raise ValueError("Tool calculate_sum requires arguments.")

        raw_numbers = []
        if isinstance(arguments, dict):
            raw_numbers = arguments.get("numbers", [])
        elif isinstance(arguments, list):
            raw_numbers = arguments
        elif isinstance(arguments, str):
            stripped = arguments.strip()
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    raw_numbers = parsed if isinstance(parsed, list) else [parsed]
                except json.JSONDecodeError:
                    raw_numbers = [item.strip() for item in stripped.split(",")]
            else:
                raw_numbers = [item.strip() for item in stripped.split(",")]
        else:
            raw_numbers = [arguments]

        if not isinstance(raw_numbers, list):
            raise ValueError("Field 'numbers' must be a list of numeric values.")

        parsed_numbers = []
        for value in raw_numbers:
            if isinstance(value, (int, float)):
                parsed_numbers.append(float(value))
                continue

            if isinstance(value, str):
                cleaned = value.strip()
                if cleaned == "":
                    continue
                try:
                    parsed_numbers.append(float(cleaned))
                    continue
                except ValueError as exc:
                    raise ValueError(f"Invalid numeric value: {value}") from exc

            raise ValueError(f"Unsupported value type in numbers: {type(value).__name__}")

        if not parsed_numbers:
            raise ValueError("No valid numeric values received for calculate_sum.")

        return parsed_numbers

    def _extract_text(self, arguments: Any):
        """Parse and normalize text arguments for text-based tools."""
        if arguments is None:
            return ""

        text_value = ""
        if isinstance(arguments, dict):
            text_value = arguments.get("text", "")
        elif isinstance(arguments, str):
            # If the model sends a raw string instead of an object
            text_value = arguments
        else:
            text_value = str(arguments)

        return text_value.strip()

    @staticmethod
    def _translate_to_glorbish(text: str):
        """Translate any text to glorbish preserving word count."""
        words = text.split()
        if not words:
            return ""

        return " ".join(["glorbish"] * len(words))

    def log_message(self, log_format, *args):
        """Simplified logging output"""
        sys.stderr.write(f"[MCP] {self.address_string()} - {log_format % args}\n")


if __name__ == "__main__":
    print("=" * 60)
    print("🚀  ZERO DEPENDENCY MCP SERVER")
    print("✅  100% Python Standard Library - NO INSTALL REQUIRED")
    print("✅  Full CORS enabled")
    print(f"📡  Listening on http://{HOST}:{PORT}")
    print(f"🔗  MCP Endpoint: http://localhost:{PORT}/mcp")
    print(f"💡  Health check: http://localhost:{PORT}/health")
    print("=" * 60)
    print("\nRun directly with: python mcp_server.py\n")

    server = HTTPServer((HOST, PORT), MCPServerHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        server.server_close()
