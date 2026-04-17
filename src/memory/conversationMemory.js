export function createConversationMemory() {
  const messages = []

  return {
    getMessages() {
      return messages.map((message) => ({ ...message }))
    },
    addMessage(role, content) {
      messages.push({ role, content })
    },
    clear() {
      messages.length = 0
    }
  }
}
