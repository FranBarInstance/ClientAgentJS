import { createOpenAIProvider } from "./openai.js"
import { createAnthropicProvider } from "./anthropic.js"
import { createGoogleProvider } from "./google.js"

export function createProvider({ providerType = "openai-compatible", fetchClient }) {
  if (providerType === "openai-compatible") {
    return createOpenAIProvider({ fetchClient })
  }

  if (providerType === "anthropic-native") {
    return createAnthropicProvider({ fetchClient })
  }

  if (providerType === "google-native") {
    return createGoogleProvider({ fetchClient })
  }

  throw new Error(`Unsupported providerType: ${providerType}`)
}
