import test from "node:test"
import assert from "node:assert/strict"

test("dist bundle exports createAgent", async () => {
  const module = await import("../dist/clientagentjs.esm.js")

  assert.equal(typeof module.createAgent, "function")
})
