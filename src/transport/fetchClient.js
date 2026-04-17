function createAbortControllerPair(signal, timeoutMs) {
  const controller = new AbortController()
  let timeoutId = null

  const abortFromSignal = () => {
    if (!controller.signal.aborted) {
      controller.abort(new Error("The request was aborted."))
    }
  }

  if (signal) {
    if (signal.aborted) {
      abortFromSignal()
    } else {
      signal.addEventListener("abort", abortFromSignal)
    }
  }

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(new Error("The request timed out."))
      }
    }, timeoutMs)
  }

  function cleanup() {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    if (signal) {
      signal.removeEventListener("abort", abortFromSignal)
    }
  }

  return { signal: controller.signal, cleanup }
}

async function handleErrorResponse(response) {
  if (response.ok) {
    return
  }

  let detail = ""
  try {
    const body = await response.json()
    // Common patterns for OpenAI, Anthropic, Google and others
    const message = body?.error?.message || body?.message || (typeof body?.error === "string" ? body.error : "")
    if (message) {
      detail = `: ${message}`
    }
  } catch {
    // Fallback to plain text if JSON parsing fails
    try {
      const text = await response.text()
      if (text && text.length < 256) {
        detail = `: ${text.trim()}`
      }
    } catch {
      // Ignore body read errors
    }
  }

  throw new Error(`Request failed with status ${response.status}${detail}`)
}

async function withRetry(fn, options = {}) {
  const { maxRetries = 2, baseDelayMs = 1000 } = options
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      if (attempt > 0) {
        const delay = baseDelayMs * 2 ** (attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
      return await fn()
    } catch (error) {
      lastError = error

      // 1. Always retry on Network Errors (fetch throws TypeError)
      if (error instanceof TypeError) {
        continue
      }

      // 2. Retry on specific HTTP status codes if it's an API error
      const status = error.status || (error.message?.match(/status (\d+)/)?.[1])
      const retryableStatuses = [429, 500, 502, 503, 504]

      if (status && retryableStatuses.includes(Number(status))) {
        continue
      }

      // 3. Otherwise, don't retry
      throw error
    }
  }

  throw lastError
}

export function createFetchClient({ fetchFn }) {
  if (typeof fetchFn !== "function") {
    throw new Error("A valid fetch function is required.")
  }

  return {
    async requestJson({ url, method = "POST", headers = {}, body, signal, timeoutMs }) {
      const { signal: composedSignal, cleanup } = createAbortControllerPair(signal, timeoutMs)

      try {
        const response = await withRetry(async () => {
          const res = await fetchFn(url, {
            method,
            headers,
            body,
            signal: composedSignal
          })

          if (!res.ok) {
            // We need to handle the error here so withRetry can see it
            try {
              await handleErrorResponse(res)
            } catch (error) {
              error.status = res.status
              throw error
            }
          }
          return res
        })

        return response.json()
      } finally {
        cleanup()
      }
    },

    async *streamSSE({ url, method = "POST", headers = {}, body, signal, timeoutMs }) {
      const { signal: composedSignal, cleanup } = createAbortControllerPair(signal, timeoutMs)

      try {
        const response = await withRetry(async () => {
          const res = await fetchFn(url, {
            method,
            headers,
            body,
            signal: composedSignal
          })

          if (!res.ok) {
            try {
              await handleErrorResponse(res)
            } catch (error) {
              error.status = res.status
              throw error
            }
          }
          return res
        })

        if (!response.body) {
          throw new Error("Streaming is not available in this environment.")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data:")) {
              continue
            }

            const payload = trimmed.slice(5).trim()
            if (!payload || payload === "[DONE]") {
              continue
            }

            try {
              yield JSON.parse(payload)
            } catch {
              // Skip invalid event payloads.
            }
          }
        }
      } finally {
        cleanup()
      }
    }
  }
}
