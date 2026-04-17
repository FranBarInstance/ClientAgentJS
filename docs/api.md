## Initialization

### ESM (Standard)

```js
import { createAgent } from 'clientagentjs';
const agent = createAgent();
```

### Global (Legacy/Simple)

Include the script in your HTML:
```html
<script src="dist/clientagentjs.global.js"></script>
```

Then access it via the global variable:
```js
const agent = ClientAgent.createAgent();
```

## `agent.ask(prompt, options?)`

Sends a single request using the active profile and resolves to a response object.

### Parameters

```js
await agent.ask("Summarize this text", {
  context: "Optional extra context",
  signal: abortController.signal
})
```

- `prompt`: required non-empty string
- `options.context`: optional string with extra context injected into the user message
- `options.signal`: optional `AbortSignal`

### Response shape

```js
{
  text: "Assistant response text",
  raw: { /* provider response payload */ }
}
```

- `text`: normalized assistant text extracted from the provider response
- `raw`: original provider payload returned by the provider adapter

### Error behavior

`ask()` throws when:

- there is no active profile with the minimum required fields
- the prompt is empty
- the request is aborted
- the provider returns a non-OK HTTP response
- the provider adapter rejects the request

## `agent.stream(prompt, options?)`

Sends a streaming request using the active profile and returns an `AsyncIterable`.

### Parameters

```js
for await (const chunk of agent.stream("Write a headline", {
  context: "Optional extra context",
  signal: abortController.signal
})) {
  console.log(chunk.text)
}
```

- `prompt`: required non-empty string
- `options.context`: optional string with extra context injected into the user message
- `options.signal`: optional `AbortSignal`

### Chunk shape

```js
{
  text: "Next visible text delta",
  delta: "Next visible text delta",
  raw: { /* provider event payload */ }
}
```

- `text`: normalized text emitted for the current chunk
- `delta`: same value as `text` for streaming adapters that expose deltas
- `raw`: original event payload from the provider adapter

### Completion behavior

- the iterator yields zero or more chunk objects
- concatenating all `chunk.text` values produces the full streamed text
- provider-specific non-text events may be ignored by the adapter

### Error behavior

`stream()` throws when:

- there is no active profile with the minimum required fields
- the prompt is empty
- the request is aborted
- the provider returns a non-OK HTTP response
- the provider adapter rejects the request

## Session methods

`session.ask()` and `session.stream()` follow the same response contracts as `agent.ask()` and `agent.stream()`, with conversation history automatically injected from the session memory.

Additional session methods:

```js
session.getHistory()
session.clear()
```

- `getHistory()`: returns the current in-memory conversation as an array of `{ role, content }`
- `clear()`: removes the stored session history

## Local tools

The public local tool methods are:

```js
agent.registerTool(name, handler)
agent.unregisterTool(name)
agent.listTools()
agent.runTool(name, input)
```

- `name`: required non-empty string
- `handler`: required function
- `input`: one plain object passed to the tool handler

Tool handlers may return plain JSON-compatible data or strings. When a compatible provider uses the tool through model tool-calling, the return value is serialized and injected back into the conversation.

## Event contract

When `createAgent({ onEvent })` is used, the agent may emit:

- `request:start`
- `request:end`
- `request:error`
- `token`
- `storage:changed`
- `profile:saved`
- `profile:deleted`
- `profile:cleared`
- `profile:active`
- `profile:imported`
- `mcp:saved`
- `mcp:deleted`
- `mcp:cleared`

The event payload depends on the operation, but always follows this outer shape:

```js
{
  type: "request:start",
  payload: { /* event-specific payload */ }
}
```

## UI Module (Optional)

The library provides a built-in configuration panel exported from `src/ui/profilePanel.js`.

### `openConfigPanel({ agent, dialogClass? })`

Opens the profile management dialog.

- `agent`: the agent instance
- `dialogClass`: optional string to add a custom CSS class to the dialog container

### `openMcpPanel({ agent, dialogClass? })`

Opens the MCP server management dialog.

### Customizing Styles

The UI uses `:where()` selectors for its default styling, meaning they have **zero specificity**. You can override any style by simply defining the class in your own CSS:

```css
/* Example: change the look of the profile dialog */
.client-agent-js-profile-dlg {
  background: #1e1e1e;
  color: white;
  border: 1px solid #333;
}
```

Main classes available for customization:
- `.client-agent-js-profile-overlay`
- `.client-agent-js-profile-dlg`
- `.caj-field`
- `.caj-controls`
- `.caj-error`
- `.caj-feedback`
