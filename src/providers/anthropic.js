const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com"
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01"
const DEFAULT_MAX_TOKENS = 1024

function getBaseUrl(profile) {
  const base = String(profile.baseURL || DEFAULT_ANTHROPIC_BASE_URL).trim()
  if (!base) {
    throw new Error("Anthropic baseURL is required.")
  }

  return base.replace(/\/$/, "")
}

function getMessagesEndpoint(baseUrl) {
  if (baseUrl.endsWith("/v1")) {
    return `${baseUrl}/messages`
  }

  return `${baseUrl}/v1/messages`
}

function buildUserContent(prompt, context) {
  const cleanPrompt = String(prompt || "").trim()
  if (!context) {
    return cleanPrompt
  }

  return `${cleanPrompt}\n\n[Context]\n${String(context)}`
}

function buildMessages({ prompt, context, historyMessages }) {
  const messages = []

  if (Array.isArray(historyMessages)) {
    for (const message of historyMessages) {
      if (!message || typeof message.role !== "string" || typeof message.content !== "string") {
        continue
      }

      if (message.role === "system") {
        continue
      }

      if (message.role !== "user" && message.role !== "assistant") {
        continue
      }

      messages.push({
        role: message.role,
        content: message.content
      })
    }
  }

  messages.push({
    role: "user",
    content: buildUserContent(prompt, context)
  })

  return messages
}

function buildPayload({ profile, prompt, context, historyMessages, stream }) {
  const payload = {
    model: profile.model,
    max_tokens: Number.isFinite(profile.maxTokens) ? profile.maxTokens : DEFAULT_MAX_TOKENS,
    messages: buildMessages({ prompt, context, historyMessages }),
    stream: Boolean(stream)
  }

  if (profile.systemPrompt && String(profile.systemPrompt).trim()) {
    payload.system = String(profile.systemPrompt).trim()
  }

  if (Number.isFinite(profile.temperature)) {
    payload.temperature = profile.temperature
  }

  return payload
}

function buildPayloadFromMessages({ profile, messages, stream, tools }) {
  const payload = {
    model: profile.model,
    max_tokens: Number.isFinite(profile.maxTokens) ? profile.maxTokens : DEFAULT_MAX_TOKENS,
    messages,
    stream: Boolean(stream)
  }

  if (profile.systemPrompt && String(profile.systemPrompt).trim()) {
    payload.system = String(profile.systemPrompt).trim()
  }

  if (Number.isFinite(profile.temperature)) {
    payload.temperature = profile.temperature
  }

  if (Array.isArray(tools) && tools.length > 0) {
    payload.tools = tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.inputSchema || { type: "object" }
    }))
    payload.tool_choice = { type: "auto" }
  }

  return payload
}

function extractTextFromContent(content) {
  if (!Array.isArray(content)) {
    return ""
  }

  return content
    .map((item) => {
      if (!item || typeof item !== "object") {
        return ""
      }

      if (item.type === "text" && typeof item.text === "string") {
        return item.text
      }

      return ""
    })
    .join("")
}

function extractDeltaTextFromEvent(event) {
  if (!event || typeof event !== "object") {
    return ""
  }

  if (event.type === "content_block_delta") {
    const delta = event.delta
    if (delta && typeof delta.text === "string") {
      return delta.text
    }
  }

  return ""
}

export function createAnthropicProvider({ fetchClient }) {
  return {
    async ask({ profile, prompt, context, historyMessages, signal, mcp }) {
      if (!profile.apiKey || !String(profile.apiKey).trim()) {
        throw new Error("Anthropic apiKey is required.")
      }

      const baseUrl = getBaseUrl(profile)
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": String(profile.apiKey),
        "anthropic-version": DEFAULT_ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true"
      }

      const tools = mcp ? await mcp.listTools() : []
      if (!Array.isArray(tools) || tools.length === 0) {
        const response = await fetchClient.requestJson({
          url: getMessagesEndpoint(baseUrl),
          method: "POST",
          headers,
          body: JSON.stringify(
            buildPayload({
              profile,
              prompt,
              context,
              historyMessages,
              stream: false
            })
          ),
          signal
        })

        return {
          text: extractTextFromContent(response?.content),
          raw: response
        }
      }

      const messages = buildMessages({ prompt, context, historyMessages })
      const maxIterations = 8

      for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        const response = await fetchClient.requestJson({
          url: getMessagesEndpoint(baseUrl),
          method: "POST",
          headers,
          body: JSON.stringify(
            buildPayloadFromMessages({
              profile,
              messages,
              stream: false,
              tools
            })
          ),
          signal
        })

        const content = Array.isArray(response?.content) ? response.content : []
        const toolUses = content.filter((block) => block?.type === "tool_use")

        if (toolUses.length === 0) {
          return {
            text: extractTextFromContent(content),
            raw: response
          }
        }

        messages.push({
          role: "assistant",
          content
        })

        messages.push({
          role: "user",
          content: await Promise.all(
            toolUses.map(async (toolUse) => {
              const result = await mcp.callTool(toolUse.name, toolUse.input || {})
              return {
                type: "tool_result",
                tool_use_id: String(toolUse.id || ""),
                content: typeof result === "string" ? result : JSON.stringify(result)
              }
            })
          )
        })
      }

      throw new Error("Anthropic tool execution exceeded the maximum number of iterations.")
    },

    async *stream({ profile, prompt, context, historyMessages, signal, mcp }) {
      if (!profile.apiKey || !String(profile.apiKey).trim()) {
        throw new Error("Anthropic apiKey is required.")
      }

      const tools = mcp ? await mcp.listTools() : []
      if (Array.isArray(tools) && tools.length > 0) {
        const response = await this.ask({ profile, prompt, context, historyMessages, signal, mcp })
        if (response.text) {
          yield {
            text: response.text,
            delta: response.text,
            raw: response.raw
          }
        }
        return
      }

      const baseUrl = getBaseUrl(profile)

      for await (const event of fetchClient.streamSSE({
        url: getMessagesEndpoint(baseUrl),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "x-api-key": String(profile.apiKey),
          "anthropic-version": DEFAULT_ANTHROPIC_VERSION,
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(
          buildPayload({
            profile,
            prompt,
            context,
            historyMessages,
            stream: true
          })
        ),
        signal
      })) {
        const deltaText = extractDeltaTextFromEvent(event)
        if (!deltaText) {
          continue
        }

        yield {
          text: deltaText,
          delta: deltaText,
          raw: event
        }
      }
    }
  }
}
