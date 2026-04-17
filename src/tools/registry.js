export function createToolRegistry() {
  const tools = new Map()

  return {
    registerTool(name, handler) {
      const normalizedName = String(name || "").trim()
      if (!normalizedName) {
        throw new Error("Tool name is required.")
      }

      if (typeof handler !== "function") {
        throw new Error("Tool handler must be a function.")
      }

      tools.set(normalizedName, handler)
    },

    unregisterTool(name) {
      tools.delete(String(name || "").trim())
    },

    listTools() {
      return [...tools.keys()].sort((a, b) => a.localeCompare(b))
    },

    async runTool(name, input) {
      const normalizedName = String(name || "").trim()
      const handler = tools.get(normalizedName)

      if (!handler) {
        throw new Error(`Tool not found: ${normalizedName}`)
      }

      return handler(input)
    }
  }
}
