# Form Assistance Example

Focused browser example for the main product use case in the specification: adding AI help on top of an existing form.

## What it demonstrates

- attaching AI actions to normal form fields
- generating text directly into existing inputs
- using `ask()` and `stream()` as field-level helpers
- injecting relevant form state as request context
- letting the end user configure their own provider profile

## Run

Build the library first:

```bash
npm run build
```

Serve the repository root with a static server and open:

- `examples/form-assistance/index.html`

Example:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/examples/form-assistance/`

## Suggested flow

1. Click `Create Ollama Demo Profile` if you have Ollama at `http://localhost:11434/v1`.
2. Or click `Open Profile Panel` and create your own active profile.
3. Use any `Generate with AI` or `Stream` button next to a field.
4. Review how the generated text goes directly into the matching form control.

---

See license: [ClientAgentJS](https://github.com/FranBarInstance/ClientAgentJS)
