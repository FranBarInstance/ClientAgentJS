import test from "node:test"
import assert from "node:assert/strict"

import { createAgent } from "../src/index.js"

function createAbortableFetch() {
  return async (_url, options) => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 25)
      options.signal?.addEventListener("abort", () => {
        clearTimeout(timer)
        reject(options.signal.reason || new Error("aborted"))
      })
    })

    return {
      ok: true,
      async json() {
        return {
          choices: [{ message: { content: "late response" } }]
        }
      }
    }
  }
}

function createAbortableStreamFetch() {
  return async (_url, options) => {
    const encoder = new TextEncoder()

    return {
      ok: true,
      body: new ReadableStream({
        start(controller) {
          const first = setTimeout(() => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "a" } }] })}\n\n`))
          }, 5)

          const second = setTimeout(() => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "b" } }] })}\n\n`))
            controller.close()
          }, 30)

          options.signal?.addEventListener("abort", () => {
            clearTimeout(first)
            clearTimeout(second)
            controller.error(options.signal.reason || new Error("aborted"))
          })
        }
      })
    }
  }
}

function installBrowserStorage() {
  const createStorage = () => {
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

  const originalLocal = globalThis.localStorage
  const originalSession = globalThis.sessionStorage
  globalThis.localStorage = createStorage()
  globalThis.sessionStorage = createStorage()

  return () => {
    globalThis.localStorage = originalLocal
    globalThis.sessionStorage = originalSession
  }
}

function saveBasicProfile(agent) {
  agent.saveProfile("demo", {
    id: "demo",
    name: "Demo",
    provider: "openai",
    model: "gpt-4.1-mini"
  })
  agent.setActiveProfile("demo")
}

test("ask throws a descriptive error when no active profile is configured", async () => {
  const agent = createAgent({
    fetch: async () => {
      throw new Error("should not be called")
    }
  })

  await assert.rejects(agent.ask("hello"), /active profile must be configured/i)
})

test("ask respects AbortSignal cancellation", async () => {
  const agent = createAgent({ fetch: createAbortableFetch() })
  saveBasicProfile(agent)

  const controller = new AbortController()
  const pending = agent.ask("hello", { signal: controller.signal })
  controller.abort(new Error("Cancelled from test"))

  await assert.rejects(pending, /Cancelled from test|aborted/i)
})

test("stream respects AbortSignal cancellation", async () => {
  const agent = createAgent({ fetch: createAbortableStreamFetch() })
  saveBasicProfile(agent)

  const controller = new AbortController()
  const chunks = []

  await assert.rejects(
    (async () => {
      for await (const chunk of agent.stream("hello", { signal: controller.signal })) {
        chunks.push(chunk.text)
        controller.abort(new Error("Stop stream"))
      }
    })(),
    /Stop stream|aborted/i
  )

  assert.deepEqual(chunks, ["a"])
})

test("session clear removes stored conversation history", async () => {
  const agent = createAgent({
    fetch: async () => ({
      ok: true,
      async json() {
        return {
          choices: [{ message: { content: "ok" } }]
        }
      }
    })
  })
  saveBasicProfile(agent)

  const session = agent.createSession()
  await session.ask("first")
  assert.equal(session.getHistory().length > 0, true)

  session.clear()
  assert.deepEqual(session.getHistory(), [])
})

test("storage migration keeps profiles and MCP servers", () => {
  const restoreStorage = installBrowserStorage()

  try {
    const agent = createAgent({
      fetch: async () => ({
        ok: true,
        async json() {
          return { choices: [{ message: { content: "ok" } }] }
        }
      })
    })

    agent.saveProfile("demo", {
      id: "demo",
      name: "Demo",
      provider: "openai",
      model: "gpt-4.1-mini"
    })
    agent.saveMcpServer("docs", {
      id: "docs",
      name: "Docs",
      url: "https://example.com/mcp"
    })
    agent.setActiveProfile("demo")

    const nextType = agent.setStorageType("local")
    assert.equal(nextType, "local")
    assert.equal(agent.getActiveProfile()?.id, "demo")
    assert.equal(agent.loadMcpServer("docs")?.id, "docs")
  } finally {
    restoreStorage()
  }
})

test("corrupted persisted profile and MCP entries are sanitized on load", () => {
  const restoreStorage = installBrowserStorage()

  try {
    globalThis.sessionStorage.setItem(
      "clientagentjs:profiles",
      JSON.stringify({
        bad: { id: "bad", name: "", provider: "openai", model: "" },
        good: { id: "good", name: "Good", provider: "openai", model: "gpt-4.1-mini" }
      })
    )
    globalThis.sessionStorage.setItem("clientagentjs:activeProfile", "good")
    globalThis.sessionStorage.setItem(
      "clientagentjs:mcpServers",
      JSON.stringify({
        broken: { id: "broken", name: "", url: "" },
        docs: { id: "docs", name: "Docs", url: "https://example.com/mcp" }
      })
    )

    const agent = createAgent({
      fetch: async () => ({
        ok: true,
        async json() {
          return { choices: [{ message: { content: "ok" } }] }
        }
      })
    })

    assert.deepEqual(
      agent.listProfiles().map((profile) => profile.id),
      ["good"]
    )
    assert.deepEqual(
      agent.listMcpServers().map((server) => server.id),
      ["docs"]
    )
    assert.equal(agent.getActiveProfile()?.id, "good")
  } finally {
    restoreStorage()
  }
})

test("runTool propagates missing-tool errors descriptively", async () => {
  const agent = createAgent({
    fetch: async () => ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: "ok" } }] }
      }
    })
  })

  await assert.rejects(agent.runTool("missing", {}), /Tool not found: missing/)
})
