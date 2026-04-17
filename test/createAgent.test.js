import test from "node:test"
import assert from "node:assert/strict"

import { createAgent } from "../src/index.js"

function createMockFetch(responseText = "hello") {
  return async (_url, options) => {
    const payload = JSON.parse(options.body)

    if (payload.stream) {
      const encoder = new TextEncoder()
      const data = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: responseText } }] })}\n\n`,
        "data: [DONE]\n\n"
      ]

      return {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            for (const chunk of data) {
              controller.enqueue(encoder.encode(chunk))
            }
            controller.close()
          }
        })
      }
    }

    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: responseText
              }
            }
          ]
        }
      }
    }
  }
}

function createAgentsMdMockFetch(responseText = "hello") {
  return async (url, options = {}) => {
    if (String(url) === "/custom/path/AGENTS.md") {
      assert.equal(options.method, "GET")
      return {
        ok: true,
        async text() {
          return "# Agent Instructions\nAlways reply with concise summaries."
        }
      }
    }

    const payload = JSON.parse(options.body)

    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: responseText
              }
            }
          ],
          echoedContext: payload.messages.at(-1)?.content || ""
        }
      }
    }
  }
}

function createAnthropicMockFetch(responseText = "hello claude") {
  return async (url, options) => {
    const payload = JSON.parse(options.body)
    assert.equal(String(url).endsWith("/v1/messages"), true)

    if (payload.stream) {
      const encoder = new TextEncoder()
      const data = [
        `event: content_block_delta\ndata: ${JSON.stringify({
          type: "content_block_delta",
          delta: { type: "text_delta", text: responseText }
        })}\n\n`,
        "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
      ]

      return {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            for (const chunk of data) {
              controller.enqueue(encoder.encode(chunk))
            }
            controller.close()
          }
        })
      }
    }

    return {
      ok: true,
      async json() {
        return {
          type: "message",
          content: [{ type: "text", text: responseText }]
        }
      }
    }
  }
}

function createGoogleMockFetch(responseText = "hello gemini") {
  return async (url, options) => {
    const payload = JSON.parse(options.body)
    const urlString = String(url)

    assert.match(urlString, /\/models\/gemini-[^:]+:generateContent|\/models\/gemini-[^:]+:streamGenerateContent\?alt=sse/)
    assert.equal(options.headers["x-goog-api-key"], "google-test-key")

    if (urlString.includes(":streamGenerateContent")) {
      const encoder = new TextEncoder()
      const data = [
        `data: ${JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: responseText }]
              }
            }
          ]
        })}\n\n`
      ]

      return {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            for (const chunk of data) {
              controller.enqueue(encoder.encode(chunk))
            }
            controller.close()
          }
        })
      }
    }

    assert.equal(Array.isArray(payload.contents), true)

    return {
      ok: true,
      async json() {
        return {
          candidates: [
            {
              content: {
                parts: [{ text: responseText }]
              }
            }
          ]
        }
      }
    }
  }
}

function createAnthropicToolCallingMockFetch(toolName = "clientagentjs_local__calculate_sum") {
  return async (url, options) => {
    const payload = JSON.parse(options.body)
    const urlString = String(url)

    assert.equal(String(urlString).endsWith("/v1/messages"), true)

    const hasToolResult = Array.isArray(payload.messages)
      ? payload.messages.some(
          (message) =>
            message.role === "user" &&
            Array.isArray(message.content) &&
            message.content.some((item) => item.type === "tool_result")
        )
      : false

    if (!hasToolResult) {
      return {
        ok: true,
        async json() {
          return {
            type: "message",
            content: [
              {
                type: "tool_use",
                id: "toolu_1",
                name: toolName,
                input: { numbers: [2, 3, 5] }
              }
            ]
          }
        }
      }
    }

    return {
      ok: true,
      async json() {
        return {
          type: "message",
          content: [{ type: "text", text: "The sum is 10." }]
        }
      }
    }
  }
}

function createMcpMockFetch() {
  return async (_url, options) => {
    const payload = JSON.parse(options.body)

    if (payload.method === "tools/list") {
      return {
        ok: true,
        async json() {
          return {
            jsonrpc: "2.0",
            id: payload.id,
            result: {
              tools: [{ name: "calculate_sum" }]
            }
          }
        }
      }
    }

    return {
      ok: true,
      async json() {
        return {
          jsonrpc: "2.0",
          id: payload.id,
          result: {
            ok: true
          }
        }
      }
    }
  }
}

function createOpenAiToolCallingMockFetch(toolName = "example__calculate_sum") {
  return async (url, options) => {
    const payload = JSON.parse(options.body)
    const urlString = String(url)

    if (urlString.endsWith("/mcp")) {
      if (payload.method === "tools/list") {
        return {
          ok: true,
          async json() {
            return {
              jsonrpc: "2.0",
              id: payload.id,
              result: {
                tools: [
                  {
                    name: "calculate_sum",
                    description: "Calculate sum of numbers",
                    inputSchema: {
                      type: "object",
                      properties: {
                        numbers: {
                          type: "array",
                          items: { type: "number" }
                        }
                      },
                      required: ["numbers"]
                    }
                  }
                ]
              }
            }
          }
        }
      }

      if (payload.method === "tools/call") {
        const numbers = payload.params?.arguments?.numbers || []
        const total = numbers.reduce((acc, value) => acc + Number(value || 0), 0)
        return {
          ok: true,
          async json() {
            return {
              jsonrpc: "2.0",
              id: payload.id,
              result: {
                content: [{ type: "text", text: `Calculated sum: ${total}` }]
              }
            }
          }
        }
      }
    }

    if (urlString.endsWith("/chat/completions")) {
      const hasToolMessage = Array.isArray(payload.messages)
        ? payload.messages.some((message) => message.role === "tool")
        : false

      if (!hasToolMessage) {
        return {
          ok: true,
          async json() {
            return {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "",
                    tool_calls: [
                      {
                        id: "call_1",
                        type: "function",
                        function: {
                          name: toolName,
                          arguments: JSON.stringify({ numbers: [2, 3, 5] })
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      }

      return {
        ok: true,
        async json() {
          return {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "The sum is 10."
                }
              }
            ]
          }
        }
      }
    }

    throw new Error(`Unexpected URL in mock fetch: ${urlString}`)
  }
}

test("createAgent stores and loads profiles", () => {
  const agent = createAgent({ fetch: createMockFetch() })

  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai",
    model: "gpt-4.1-mini"
  })

  agent.setActiveProfile("demo")

  const loaded = agent.getActiveProfile()
  assert.equal(loaded?.id, "demo")
  assert.equal(agent.isReady(), true)
})

test("ask returns text from provider", async () => {
  const agent = createAgent({ fetch: createMockFetch("ok") })

  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai",
    model: "gpt-4.1-mini"
  })
  agent.setActiveProfile("demo")

  const response = await agent.ask("hi")
  assert.equal(response.text, "ok")
})

test("stream yields chunks", async () => {
  const agent = createAgent({ fetch: createMockFetch("chunk") })

  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai",
    model: "gpt-4.1-mini"
  })
  agent.setActiveProfile("demo")

  let merged = ""
  for await (const part of agent.stream("hello")) {
    merged += part.text
  }

  assert.equal(merged, "chunk")
})

test("session keeps memory", async () => {
  const agent = createAgent({ fetch: createMockFetch("session") })

  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai",
    model: "gpt-4.1-mini"
  })
  agent.setActiveProfile("demo")

  const session = agent.createSession()
  await session.ask("first")
  await session.ask("second")

  const history = session.getHistory()
  assert.equal(history.length, 4)
  assert.equal(history[0].role, "user")
  assert.equal(history[1].role, "assistant")
})

test("createSession loads agentsMd instructions into request context", async () => {
  const agent = createAgent({
    fetch: createAgentsMdMockFetch("ok"),
    agentsMd: "/custom/path/AGENTS.md"
  })

  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai",
    model: "gpt-4.1-mini"
  })
  agent.setActiveProfile("demo")

  const session = agent.createSession()
  const response = await session.ask("hello")

  assert.equal(response.text, "ok")
  assert.match(response.raw.echoedContext, /\[AGENTS\.md\]/)
  assert.match(response.raw.echoedContext, /Always reply with concise summaries\./)
})

test("anthropic-native ask returns text", async () => {
  const agent = createAgent({ fetch: createAnthropicMockFetch("claude ok") })

  agent.saveProfile("claude", {
    id: "claude",
    name: "Claude",
    provider: "anthropic",
    providerType: "anthropic-native",
    apiKey: "test-key",
    model: "claude-sonnet-4-20250514"
  })
  agent.setActiveProfile("claude")

  const response = await agent.ask("Hello Claude")
  assert.equal(response.text, "claude ok")
})

test("anthropic-native stream yields chunks", async () => {
  const agent = createAgent({ fetch: createAnthropicMockFetch("stream claude") })

  agent.saveProfile("claude", {
    id: "claude",
    name: "Claude",
    provider: "anthropic",
    providerType: "anthropic-native",
    apiKey: "test-key",
    model: "claude-sonnet-4-20250514"
  })
  agent.setActiveProfile("claude")

  let merged = ""
  for await (const part of agent.stream("Hello Claude")) {
    merged += part.text
  }

  assert.equal(merged, "stream claude")
})

test("requestMcp sends JSON-RPC request to configured server", async () => {
  const agent = createAgent({ fetch: createMcpMockFetch() })

  agent.saveMcpServer("example", {
    id: "example",
    name: "Example MCP",
    transport: "streamable-http",
    url: "http://localhost:8000/mcp",
    headers: {},
    enabled: true
  })

  const result = await agent.listMcpTools("example")
  assert.equal(Array.isArray(result.result.tools), true)
  assert.equal(result.result.tools[0].name, "calculate_sum")
})

test("ask auto-uses MCP tools for openai-compatible profiles", async () => {
  const agent = createAgent({ fetch: createOpenAiToolCallingMockFetch() })

  agent.saveMcpServer("example", {
    id: "example",
    name: "Example MCP",
    transport: "streamable-http",
    url: "http://localhost:8000/mcp",
    headers: {},
    enabled: true
  })

  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai-compatible",
    providerType: "openai-compatible",
    baseURL: "https://api.openai.com/v1",
    apiKey: "test-key",
    model: "gpt-4.1-mini",
    enabledMcpServers: ["example"]
  })
  agent.setActiveProfile("demo")

  const response = await agent.ask("What is 2 + 3 + 5?")
  assert.equal(response.text, "The sum is 10.")
})

test("ask auto-uses registered local tools", async () => {
  const agent = createAgent({
    fetch: createOpenAiToolCallingMockFetch("clientagentjs_local__calculate_sum")
  })

  agent.registerTool("calculate_sum", ({ numbers }) => {
    return {
      total: numbers.reduce((acc, value) => acc + Number(value || 0), 0)
    }
  })

  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai-compatible",
    providerType: "openai-compatible",
    baseURL: "https://api.openai.com/v1",
    apiKey: "test-key",
    model: "gpt-4.1-mini"
  })
  agent.setActiveProfile("demo")

  const response = await agent.ask("What is 2 + 3 + 5?")
  assert.equal(response.text, "The sum is 10.")
})

test("anthropic-native ask auto-uses registered local tools", async () => {
  const agent = createAgent({
    fetch: createAnthropicToolCallingMockFetch("clientagentjs_local__calculate_sum")
  })

  agent.registerTool("calculate_sum", ({ numbers }) => {
    return {
      total: numbers.reduce((acc, value) => acc + Number(value || 0), 0)
    }
  })
  agent.saveProfile("claude", {
    id: "claude",
    name: "Claude",
    provider: "anthropic",
    providerType: "anthropic-native",
    apiKey: "test-key",
    model: "claude-sonnet-4-20250514"
  })
  agent.setActiveProfile("claude")

  const response = await agent.ask("Hello Claude")
  assert.equal(response.text, "The sum is 10.")
})

test("google-native ask returns text", async () => {
  const agent = createAgent({ fetch: createGoogleMockFetch("gemini ok") })

  agent.saveProfile("gemini", {
    id: "gemini",
    name: "Gemini",
    provider: "google",
    providerType: "google-native",
    apiKey: "google-test-key",
    model: "gemini-2.5-flash"
  })
  agent.setActiveProfile("gemini")

  const response = await agent.ask("Hello Gemini")
  assert.equal(response.text, "gemini ok")
})

test("google-native stream yields chunks", async () => {
  const agent = createAgent({ fetch: createGoogleMockFetch("stream gemini") })

  agent.saveProfile("gemini", {
    id: "gemini",
    name: "Gemini",
    provider: "google",
    providerType: "google-native",
    apiKey: "google-test-key",
    model: "gemini-2.5-flash"
  })
  agent.setActiveProfile("gemini")

  let merged = ""
  for await (const part of agent.stream("Hello Gemini")) {
    merged += part.text
  }

  assert.equal(merged, "stream gemini")
})

test("google-native profiles reject configured tools", async () => {
  const agent = createAgent({ fetch: createGoogleMockFetch("gemini ok") })

  agent.registerTool("calculate_sum", () => 10)
  agent.saveProfile("gemini", {
    id: "gemini",
    name: "Gemini",
    provider: "google",
    providerType: "google-native",
    apiKey: "google-test-key",
    model: "gemini-2.5-flash"
  })
  agent.setActiveProfile("gemini")

  await assert.rejects(agent.ask("Hello Gemini"), /google-native provider does not support local tools or MCP servers yet\./i)
})

test("importProfiles requires explicit user confirmation before replacing data", () => {
  const agent = createAgent({ fetch: createMockFetch() })
  const originalConfirm = globalThis.confirm
  let confirmMessage = null

  globalThis.confirm = (message) => {
    confirmMessage = message
    return true
  }

  try {
    const imported = agent.importProfiles(
      JSON.stringify({
        profiles: {
          imported: {
            id: "imported",
            name: "Imported",
            provider: "openai",
            model: "gpt-4.1-mini"
          }
        },
        activeProfile: "imported",
        mcpServers: {}
      })
    )

    assert.equal(imported, true)
    assert.match(confirmMessage || "", /replace all current profiles and MCP server settings/i)
    assert.equal(agent.getActiveProfile()?.id, "imported")
  } finally {
    globalThis.confirm = originalConfirm
  }
})

test("importProfiles aborts when user declines the warning", () => {
  const agent = createAgent({ fetch: createMockFetch() })
  const originalConfirm = globalThis.confirm

  agent.saveProfile("existing", {
    id: "existing",
    name: "Existing",
    provider: "openai",
    model: "gpt-4.1-mini"
  })
  agent.setActiveProfile("existing")

  globalThis.confirm = () => false

  try {
    const imported = agent.importProfiles(
      JSON.stringify({
        profiles: {
          imported: {
            id: "imported",
            name: "Imported",
            provider: "openai",
            model: "gpt-4.1-mini"
          }
        },
        activeProfile: "imported",
        mcpServers: {}
      })
    )

    assert.equal(imported, false)
    assert.equal(agent.getActiveProfile()?.id, "existing")
    assert.equal(agent.loadProfile("imported"), null)
  } finally {
    globalThis.confirm = originalConfirm
  }
})
