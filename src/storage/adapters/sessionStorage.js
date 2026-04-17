function createInMemoryStorage() {
  const map = new Map()

  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
    removeItem(key) {
      map.delete(key)
    }
  }
}

export function createSessionStorageAdapter() {
  if (typeof globalThis !== "undefined" && globalThis.sessionStorage) {
    return globalThis.sessionStorage
  }

  return createInMemoryStorage()
}
