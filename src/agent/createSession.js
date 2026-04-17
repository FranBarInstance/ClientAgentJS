import { createConversationMemory } from "../memory/conversationMemory.js"

function mergeContext(agentsInstructions, context) {
  const instructions = String(agentsInstructions || "").trim()
  const extraContext = String(context || "").trim()

  if (!instructions) {
    return context
  }

  if (!extraContext) {
    return `[AGENTS.md]\n${instructions}`
  }

  return `${extraContext}\n\n[AGENTS.md]\n${instructions}`
}

export function createSession({ askWithHistory, streamWithHistory, loadAgentsInstructions = null }) {
  const memory = createConversationMemory()

  return {
    async ask(prompt, options = {}) {
      const agentsInstructions =
        typeof loadAgentsInstructions === "function" ? await loadAgentsInstructions() : ""
      const historyMessages = memory.getMessages()
      const response = await askWithHistory(
        prompt,
        {
          ...options,
          context: mergeContext(agentsInstructions, options.context)
        },
        historyMessages
      )

      memory.addMessage("user", String(prompt || ""))
      memory.addMessage("assistant", response.text)

      return response
    },

    async *stream(prompt, options = {}) {
      const agentsInstructions =
        typeof loadAgentsInstructions === "function" ? await loadAgentsInstructions() : ""
      const historyMessages = memory.getMessages()
      let fullText = ""

      for await (const chunk of streamWithHistory(
        prompt,
        {
          ...options,
          context: mergeContext(agentsInstructions, options.context)
        },
        historyMessages
      )) {
        fullText += chunk.text
        yield chunk
      }

      memory.addMessage("user", String(prompt || ""))
      memory.addMessage("assistant", fullText)
    },

    clear() {
      memory.clear()
    },

    getHistory() {
      return memory.getMessages()
    }
  }
}
