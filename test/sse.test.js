import { test, describe, mock } from "node:test"
import assert from "node:assert/strict"
import { createFetchClient } from "../src/transport/fetchClient.js"

describe("fetchClient streamSSE", () => {
  test("handles partial chunks correctly", async () => {
    // We simulate a stream that provides incomplete SSE lines
    // First chunk: "data: {\"fo"
    // Second chunk: "o\": \"bar\"}\n\n"
    async function* mockStream() {
      yield new TextEncoder().encode("data: {\"fo")
      yield new TextEncoder().encode("o\": \"bar\"}\n\n")
    }

    const mockBody = {
      getReader() {
        const iterator = mockStream()
        return {
          async read() {
            return iterator.next()
          }
        }
      }
    }

    const fetchFn = mock.fn(async () => {
      return {
        ok: true,
        body: mockBody
      }
    })

    const client = createFetchClient({ fetchFn })

    const events = []
    for await (const event of client.streamSSE({ url: "http://example.com" })) {
      events.push(event)
    }

    assert.deepEqual(events, [{ foo: "bar" }])
  })

  test("ignores invalid JSON payloads without breaking stream", async () => {
    async function* mockStream() {
      yield new TextEncoder().encode("data: {\"incomplete\"\n\n")
      yield new TextEncoder().encode("data: {\"valid\": true}\n\n")
    }

    const mockBody = {
      getReader() {
        const iterator = mockStream()
        return {
          async read() {
            return iterator.next()
          }
        }
      }
    }

    const fetchFn = mock.fn(async () => {
      return {
        ok: true,
        body: mockBody
      }
    })

    const client = createFetchClient({ fetchFn })

    const events = []
    for await (const event of client.streamSSE({ url: "http://example.com" })) {
      events.push(event)
    }

    assert.deepEqual(events, [{ valid: true }])
  })
})
