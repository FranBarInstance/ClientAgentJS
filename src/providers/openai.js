const DEFAULT_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  deepseek: "https://api.deepseek.com/v1",
  ollama: "http://localhost:11434/v1",
  groq: "https://api.groq.com/openai/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  perplexity: "https://api.perplexity.ai",
  mistral: "https://api.mistral.ai/v1",
  cohere: "https://api.cohere.com/v1",
  anyscale: "https://api.endpoints.anyscale.com/v1",
  novita: "https://api.novita.ai/v3/openai",
  hyperbolic: "https://api.hyperbolic.xyz/v1",
  siliconflow: "https://api.siliconflow.cn/v1",
  "cloudflare-workers-ai": "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1",
  "azure-openai": "https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}",
  tokenmix: "https://api.tokenmix.ai/v1",
  krater: "https://api.krater.ai/v1",
  "lm-studio": "http://localhost:1234/v1"
}

function getBaseUrl(profile) {
  if (profile.baseURL) {
    return profile.baseURL.replace(/\/$/, "")
  }

  const provider = String(profile.provider || "").trim()
  if (provider === "openai-compatible") {
    throw new Error(
      "Base URL is required for provider 'openai-compatible'. Set profile.baseURL or choose a predefined provider."
    )
  }

  const providerBaseUrl = DEFAULT_BASE_URLS[provider]
  if (providerBaseUrl) {
    return providerBaseUrl
  }

  throw new Error(
    `Unknown provider '${provider || "unknown"}'. Set profile.baseURL or choose a predefined provider.`
  )
}

function buildUserContent(prompt, context) {
  const cleanPrompt = String(prompt || "").trim()
  if (!context) {
    return cleanPrompt
  }

  return `${cleanPrompt}\n\n[Context]\n${String(context)}`
}

function buildMessages({ profile, prompt, context, historyMessages }) {
  const messages = []

  if (profile.systemPrompt && profile.systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: profile.systemPrompt.trim()
    })
  }

  if (Array.isArray(historyMessages)) {
    for (const message of historyMessages) {
      if (message && typeof message.role === "string" && typeof message.content === "string") {
        messages.push({ role: message.role, content: message.content })
      }
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
    messages: buildMessages({ profile, prompt, context, historyMessages }),
    stream: Boolean(stream)
  }

  if (Number.isFinite(profile.temperature)) {
    payload.temperature = profile.temperature
  }

  if (Number.isFinite(profile.maxTokens)) {
    payload.max_tokens = profile.maxTokens
  }

  return payload
}

function buildPayloadFromMessages({ profile, messages, stream, tools }) {
  const payload = {
    model: profile.model,
    messages,
    stream: Boolean(stream)
  }

  if (Number.isFinite(profile.temperature)) {
    payload.temperature = profile.temperature
  }

  if (Number.isFinite(profile.maxTokens)) {
    payload.max_tokens = profile.maxTokens
  }

  if (Array.isArray(tools) && tools.length > 0) {
    payload.tools = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || "",
        parameters: tool.inputSchema || { type: "object" }
      }
    }))
    payload.tool_choice = "auto"
  }

  return payload
}

function extractTextFromResponse(response) {
  const content = response?.choices?.[0]?.message?.content

  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item
        }

        if (item && typeof item.text === "string") {
          return item.text
        }

        return ""
      })
      .join("")
  }

  return ""
}

function parseToolArguments(rawArguments) {
  if (!rawArguments || typeof rawArguments !== "string") {
    return {}
  }

  try {
    const parsed = JSON.parse(rawArguments)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function stringifyToolResult(result) {
  if (result == null) {
    return ""
  }

  if (typeof result === "string") {
    return result
  }

  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}

export function createOpenAIProvider({ fetchClient }) {
  async function askImpl({ profile, prompt, context, historyMessages, signal, mcp }) {
    const headers = {
      "Content-Type": "application/json"
    }

    if (profile.apiKey) {
      headers.Authorization = `Bearer ${profile.apiKey}`
    }

    const tools = mcp ? await mcp.listTools() : []
    if (!Array.isArray(tools) || tools.length === 0) {
      const payload = buildPayload({
        profile,
        prompt,
        context,
        historyMessages,
        stream: false
      })

      const response = await fetchClient.requestJson({
        url: `${getBaseUrl(profile)}/chat/completions`,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal
      })

      return {
        text: extractTextFromResponse(response),
        raw: response
      }
    }

    const messages = buildMessages({ profile, prompt, context, historyMessages })
    const maxIterations = 8

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const payload = buildPayloadFromMessages({
        profile,
        messages,
        stream: false,
        tools
      })

      const response = await fetchClient.requestJson({
        url: `${getBaseUrl(profile)}/chat/completions`,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal
      })

      const modelMessage = response?.choices?.[0]?.message || {}
      const toolCalls = Array.isArray(modelMessage.tool_calls) ? modelMessage.tool_calls : []

      if (toolCalls.length === 0) {
        return {
          text: extractTextFromResponse(response),
          raw: response
        }
      }

      messages.push({
        role: "assistant",
        content: typeof modelMessage.content === "string" ? modelMessage.content : "",
        tool_calls: toolCalls
      })

      for (const toolCall of toolCalls) {
        const callId = String(toolCall?.id || `tool-call-${Date.now()}`)
        const toolName = String(toolCall?.function?.name || "").trim()
        const toolArgs = parseToolArguments(toolCall?.function?.arguments)
        const toolResult = await mcp.callTool(toolName, toolArgs)

        messages.push({
          role: "tool",
          tool_call_id: callId,
          content: stringifyToolResult(toolResult)
        })
      }
    }

    throw new Error("Maximum MCP tool-call iterations reached without a final response.")
  }

  async function* streamImpl({ profile, prompt, context, historyMessages, signal, mcp }) {
    if (mcp) {
      const tools = await mcp.listTools()
      if (Array.isArray(tools) && tools.length > 0) {
        const response = await askImpl({ profile, prompt, context, historyMessages, signal, mcp })
        if (response.text) {
          yield {
            text: response.text,
            delta: response.text,
            raw: response.raw
          }
        }
        return
      }
    }

    const payload = buildPayload({
      profile,
      prompt,
      context,
      historyMessages,
      stream: true
    })

    const headers = {
      "Content-Type": "application/json"
    }

    if (profile.apiKey) {
      headers.Authorization = `Bearer ${profile.apiKey}`
    }

    for await (const event of fetchClient.streamSSE({
      url: `${getBaseUrl(profile)}/chat/completions`,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal
    })) {
        const delta = event?.choices?.[0]?.delta?.content
        if (!delta) {
          continue
        }

        yield {
          text: delta,
          delta,
          raw: event
        }
      }
  }

  return {
    ask: askImpl,
    stream: streamImpl
  }
}
