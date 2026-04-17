const DEFAULT_GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

function getBaseUrl(profile) {
  const base = String(profile.baseURL || DEFAULT_GOOGLE_BASE_URL).trim()
  if (!base) {
    throw new Error("Google baseURL is required.")
  }

  return base.replace(/\/$/, "")
}

function getModelPath(model) {
  const normalized = String(model || "").trim()
  if (!normalized) {
    throw new Error("Google model is required.")
  }

  return normalized.startsWith("models/") ? normalized : `models/${normalized}`
}

function buildUserText(prompt, context) {
  const cleanPrompt = String(prompt || "").trim()
  if (!context) {
    return cleanPrompt
  }

  return `${cleanPrompt}\n\n[Context]\n${String(context)}`
}

function mapHistoryRole(role) {
  if (role === "assistant") {
    return "model"
  }

  return "user"
}

function buildContents({ prompt, context, historyMessages }) {
  const contents = []

  if (Array.isArray(historyMessages)) {
    for (const message of historyMessages) {
      if (!message || typeof message.role !== "string" || typeof message.content !== "string") {
        continue
      }

      if (message.role !== "user" && message.role !== "assistant") {
        continue
      }

      contents.push({
        role: mapHistoryRole(message.role),
        parts: [{ text: message.content }]
      })
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: buildUserText(prompt, context) }]
  })

  return contents
}

function buildPayload({ profile, prompt, context, historyMessages }) {
  const payload = {
    contents: buildContents({ prompt, context, historyMessages })
  }

  if (profile.systemPrompt && String(profile.systemPrompt).trim()) {
    payload.system_instruction = {
      parts: [{ text: String(profile.systemPrompt).trim() }]
    }
  }

  const generationConfig = {}
  if (Number.isFinite(profile.temperature)) {
    generationConfig.temperature = profile.temperature
  }

  if (Number.isFinite(profile.maxTokens)) {
    generationConfig.maxOutputTokens = profile.maxTokens
  }

  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig
  }

  return payload
}

function extractTextFromCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    return ""
  }

  return candidates
    .flatMap((candidate) => {
      const parts = candidate?.content?.parts
      return Array.isArray(parts) ? parts : []
    })
    .map((part) => {
      if (part && typeof part.text === "string") {
        return part.text
      }

      return ""
    })
    .join("")
}

function getGenerateContentEndpoint(profile) {
  return `${getBaseUrl(profile)}/${getModelPath(profile.model)}:generateContent`
}

function getStreamGenerateContentEndpoint(profile) {
  return `${getBaseUrl(profile)}/${getModelPath(profile.model)}:streamGenerateContent?alt=sse`
}

export function createGoogleProvider({ fetchClient }) {
  function createHeaders(profile) {
    if (!profile.apiKey || !String(profile.apiKey).trim()) {
      throw new Error("Google apiKey is required.")
    }

    return {
      "Content-Type": "application/json",
      "x-goog-api-key": String(profile.apiKey).trim()
    }
  }

  return {
    async ask({ profile, prompt, context, historyMessages, signal, mcp }) {
      if (mcp) {
        throw new Error("Google (Gemini) provider does not support local tools or MCP servers yet.")
      }

      const response = await fetchClient.requestJson({
        url: getGenerateContentEndpoint(profile),
        method: "POST",
        headers: createHeaders(profile),
        body: JSON.stringify(
          buildPayload({
            profile,
            prompt,
            context,
            historyMessages
          })
        ),
        signal
      })

      return {
        text: extractTextFromCandidates(response?.candidates),
        raw: response
      }
    },

    async *stream({ profile, prompt, context, historyMessages, signal, mcp }) {
      if (mcp) {
        throw new Error("Google (Gemini) provider does not support local tools or MCP servers yet.")
      }

      for await (const event of fetchClient.streamSSE({
        url: getStreamGenerateContentEndpoint(profile),
        method: "POST",
        headers: {
          ...createHeaders(profile),
          Accept: "text/event-stream"
        },
        body: JSON.stringify(
          buildPayload({
            profile,
            prompt,
            context,
            historyMessages
          })
        ),
        signal
      })) {
        const deltaText = extractTextFromCandidates(event?.candidates)
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
