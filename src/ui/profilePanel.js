const FALLBACK_CSS = `
  :where(.client-agent-js-profile-overlay) {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :where(.client-agent-js-profile-dlg) {
    width: min(680px, 95vw);
    max-height: 85vh;
    overflow: auto;
    background: #fff;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    font-family: sans-serif;
  }

  :where(.client-agent-js-profile-dlg h2) {
    margin: 0 0 12px;
  }

  :where(.client-agent-js-profile-dlg .caj-error) {
    color: #b00020;
    min-height: 20px;
    margin: 0 0 8px;
  }

  :where(.client-agent-js-profile-dlg .caj-feedback) {
    font-size: 13px;
    align-self: center;
  }

  :where(.client-agent-js-profile-dlg .caj-feedback--success) {
    color: #0a7a2f;
  }

  :where(.client-agent-js-profile-dlg .caj-feedback--error) {
    color: #b00020;
  }

  :where(.client-agent-js-profile-dlg .caj-select-label) {
    display: block;
    margin-bottom: 10px;
  }

  :where(.client-agent-js-profile-dlg .caj-select-text) {
    font-size: 12px;
    margin-bottom: 4px;
  }

  :where(.client-agent-js-profile-dlg select),
  :where(.client-agent-js-profile-dlg input),
  :where(.client-agent-js-profile-dlg textarea) {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
  }

  :where(.client-agent-js-profile-dlg textarea) {
    min-height: 80px;
  }

  :where(.client-agent-js-profile-dlg .caj-field) {
    display: block;
    margin-bottom: 8px;
  }

  :where(.client-agent-js-profile-dlg .caj-field-label) {
    font-size: 12px;
    margin-bottom: 4px;
  }

  :where(.client-agent-js-profile-dlg .caj-advanced) {
    margin-top: 10px;
  }

  :where(.client-agent-js-profile-dlg .caj-advanced summary) {
    cursor: pointer;
    font-weight: 600;
    margin-bottom: 8px;
  }

  :where(.client-agent-js-profile-dlg .caj-advanced-content) {
    margin-top: 10px;
  }

  :where(.client-agent-js-profile-dlg .caj-controls) {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  :where(.client-agent-js-profile-dlg .caj-input-readonly) {
    background: #f3f6fc;
    color: #53617d;
  }

  :where(.client-agent-js-profile-dlg .caj-password-wrapper) {
    display: flex;
    gap: 4px;
  }

  :where(.client-agent-js-profile-dlg .caj-password-toggle) {
    padding: 8px 12px;
    cursor: pointer;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  :where(.client-agent-js-profile-dlg .caj-dialog-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  :where(.client-agent-js-profile-dlg .caj-dialog-header h2) {
    margin: 0;
  }

  :where(.client-agent-js-profile-dlg .caj-close-btn) {
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 8px;
    color: #666;
    border-radius: 4px;
  }

  :where(.client-agent-js-profile-dlg .caj-close-btn:hover) {
    background: #f0f0f0;
    color: #000;
  }
`

function injectFallbackStyles(doc) {
  const style = doc.createElement("style")
  style.textContent = FALLBACK_CSS
  doc.head.appendChild(style)
}

function requireDocument() {
  if (typeof document === "undefined") {
    throw new Error("UI panels are only available in browser environments.")
  }

  return document
}

function createOverlay(doc) {
  const overlay = doc.createElement("div")
  overlay.className = "client-agent-js-profile-overlay"
  return overlay
}

function createDialog(doc, title, dialogClass, onClose) {
  const dialog = doc.createElement("div")
  dialog.className = ["client-agent-js-profile-dlg", dialogClass].filter(Boolean).join(" ")

  const header = doc.createElement("div")
  header.className = "caj-dialog-header"

  const heading = doc.createElement("h2")
  heading.textContent = title

  const closeBtn = doc.createElement("button")
  closeBtn.className = "caj-close-btn"
  closeBtn.textContent = "×"
  closeBtn.setAttribute("aria-label", "Close")
  closeBtn.onclick = onClose

  header.appendChild(heading)
  header.appendChild(closeBtn)
  dialog.appendChild(header)
  return dialog
}

const UI_TRANSLATIONS = {
  en: {
    dialogs: {
      profilesTitle: "Model Profiles",
      mcpTitle: "MCP Servers"
    },
    common: {
      advancedOptions: "Advanced options",
      save: "Save",
      delete: "Delete",
      close: "Close",
      cancel: "Cancel",
      saved: "Saved ✓",
      customSuffix: "custom",
      activeSuffix: "active",
      deleteConfirmTitle: "This action cannot be undone.",
      confirmDeleteProfile: "Delete this profile?",
      confirmDeleteMcpServer: "Delete this MCP server?",
      noSelectionToDelete: "Select an item before deleting.",
      noSelectionToActivate: "Select or type a profile id first."
    },
    profiles: {
      existingProfiles: "Existing profiles",
      noProfiles: "No profiles saved yet.",
      selectProfile: "Select a profile...",
      profileId: "Profile ID",
      name: "Name",
      model: "Model",
      provider: "Provider",
      providerType: "Provider Type",
      apiKey: "API Key",
      baseUrl: "Base URL",
      temperature: "Temperature",
      maxTokens: "Max Tokens",
      enabledMcpServers: "Enabled MCP IDs (comma separated)",
      systemPrompt: "System Prompt",
      setActive: "Set active",
      failedToSave: "Failed to save profile.",
      failedToActivate: "Failed to set active profile.",
      profileIdRequired: "Profile id is required.",
      invalidHeadersJson: ""
    },
    mcp: {
      existingServers: "Existing MCP servers",
      noServers: "No MCP servers saved yet.",
      selectServer: "Select an MCP server...",
      mcpId: "MCP ID",
      name: "Name",
      transport: "Transport",
      url: "URL",
      headersJson: "Headers JSON",
      testServer: "Test server",
      serverAlive: "Server alive ✓",
      failedToSave: "Failed to save MCP server.",
      failedToTest: "MCP server test failed.",
      mcpIdRequired: "MCP id is required.",
      mcpIdRequiredToTest: "MCP id is required to test the server.",
      invalidHeadersJson: "Headers JSON must be a valid object."
    },
    providers: {
      openai: "OpenAI",
      anthropic: "Anthropic (Claude API)",
      google: "Google (Gemini API)",
      "openai-compatible": "OpenAI compatible (manual baseURL)",
      openrouter: "OpenRouter",
      together: "Together AI",
      deepseek: "DeepSeek",
      groq: "Groq",
      fireworks: "Fireworks AI",
      perplexity: "Perplexity",
      mistral: "Mistral",
      cohere: "Cohere",
      anyscale: "Anyscale",
      novita: "Novita AI",
      hyperbolic: "Hyperbolic",
      siliconflow: "SiliconFlow",
      "cloudflare-workers-ai": "Cloudflare Workers AI",
      "azure-openai": "Azure OpenAI",
      tokenmix: "TokenMix.ai",
      krater: "Krater API",
      ollama: "Ollama (local)",
      "lm-studio": "LM Studio (local)"
    },
    providerTypes: {
      "openai-compatible": "OpenAI-compatible",
      "anthropic-native": "Anthropic-native",
      "google-native": "Google-native"
    }
  }
}

function getUiLocale(doc) {
  return "en"
}

function getUiText(doc) {
  return UI_TRANSLATIONS[getUiLocale(doc)] || UI_TRANSLATIONS.en
}

function closeOverlay(overlay) {
  overlay.remove()
}

function confirmAction(message) {
  if (typeof globalThis.confirm !== "function") {
    return true
  }

  return globalThis.confirm(message)
}

function createField(doc, labelText, key, value) {
  const wrapper = doc.createElement("label")
  wrapper.className = "caj-field"

  const label = doc.createElement("div")
  label.className = "caj-field-label"
  label.textContent = labelText

  const input = doc.createElement("input")
  input.name = key
  input.value = value == null ? "" : String(value)

  wrapper.appendChild(label)
  wrapper.appendChild(input)
  return wrapper
}

function createPasswordField(doc, labelText, key, value) {
  const wrapper = doc.createElement("label")
  wrapper.className = "caj-field"

  const label = doc.createElement("div")
  label.className = "caj-field-label"
  label.textContent = labelText

  const inputWrapper = doc.createElement("div")
  inputWrapper.className = "caj-password-wrapper"

  const input = doc.createElement("input")
  input.type = "password"
  input.name = key
  input.value = value == null ? "" : String(value)
  input.style.flex = "1"

  const toggleBtn = doc.createElement("button")
  toggleBtn.type = "button"
  toggleBtn.className = "caj-password-toggle"
  toggleBtn.textContent = "👁"
  toggleBtn.onclick = (e) => {
    e.preventDefault()
    if (input.type === "password") {
      input.type = "text"
      toggleBtn.textContent = "🙈"
    } else {
      input.type = "password"
      toggleBtn.textContent = "👁"
    }
  }

  inputWrapper.appendChild(input)
  inputWrapper.appendChild(toggleBtn)

  wrapper.appendChild(label)
  wrapper.appendChild(inputWrapper)
  return wrapper
}

function createSelectField(doc, labelText, key, options, value) {
  const wrapper = doc.createElement("label")
  wrapper.className = "caj-field"

  const label = doc.createElement("div")
  label.className = "caj-field-label"
  label.textContent = labelText

  const select = doc.createElement("select")
  select.name = key

  for (const optionConfig of options) {
    const option = doc.createElement("option")
    option.value = optionConfig.value
    option.textContent = optionConfig.label
    option.disabled = Boolean(optionConfig.disabled)
    select.appendChild(option)
  }

  if (value != null && value !== "") {
    select.value = String(value)
  }

  wrapper.appendChild(label)
  wrapper.appendChild(select)
  return wrapper
}

function createArea(doc, labelText, key, value) {
  const wrapper = doc.createElement("label")
  wrapper.className = "caj-field"

  const label = doc.createElement("div")
  label.className = "caj-field-label"
  label.textContent = labelText

  const input = doc.createElement("textarea")
  input.name = key
  input.value = value == null ? "" : String(value)

  wrapper.appendChild(label)
  wrapper.appendChild(input)
  return wrapper
}

const DEFAULT_PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  google: "https://generativelanguage.googleapis.com/v1beta",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  perplexity: "https://api.perplexity.ai",
  mistral: "https://api.mistral.ai/v1",
  cohere: "https://api.cohere.com/v1",
  anyscale: "https://api.endpoints.anyscale.com/v1",
  novita: "https://api.novita.ai/v3/openai",
  hyperbolic: "https://api.hyperbolic.xyz/v1",
  siliconflow: "https://api.siliconflow.cn/v1",
  "cloudflare-workers-ai": "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1",
  "azure-openai": "https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}",
  tokenmix: "https://api.tokenmix.ai/v1",
  krater: "https://api.krater.ai/v1",
  ollama: "http://localhost:11434/v1",
  "lm-studio": "http://localhost:1234/v1"
}

const DEFAULT_PROVIDER_TYPE = "openai-compatible"

function ensureSelectHasValue(select, value, doc) {
  const normalized = String(value || "").trim()
  if (!normalized) {
    return
  }

  const hasOption = [...select.options].some((option) => option.value === normalized)
  if (!hasOption) {
    const option = doc.createElement("option")
    option.value = normalized
    const text = getUiText(doc)
    option.textContent = `${normalized} (${text.common.customSuffix})`
    select.appendChild(option)
  }
}

function readFormData(form) {
  const formData = new FormData(form)
  const enabledMcpServers = String(formData.get("enabledMcpServers") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    id: String(formData.get("id") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    provider: String(formData.get("provider") || "").trim(),
    providerType: String(formData.get("providerType") || DEFAULT_PROVIDER_TYPE).trim() || DEFAULT_PROVIDER_TYPE,
    apiKey: String(formData.get("apiKey") || ""),
    baseURL: String(formData.get("baseURL") || "").trim() || null,
    model: String(formData.get("model") || "").trim(),
    systemPrompt: String(formData.get("systemPrompt") || ""),
    temperature: formData.get("temperature") === "" ? null : Number(formData.get("temperature")),
    maxTokens: formData.get("maxTokens") === "" ? null : Number(formData.get("maxTokens")),
    enabledMcpServers
  }
}

export function openConfigPanel({ agent, dialogClass }) {
  const doc = requireDocument()
  injectFallbackStyles(doc)

  const text = getUiText(doc)
  const overlay = createOverlay(doc)
  const dialog = createDialog(doc, text.dialogs.profilesTitle, dialogClass, () => closeOverlay(overlay))
  const list = doc.createElement("div")
  const form = doc.createElement("form")

  const error = doc.createElement("p")
  error.className = "caj-error"

  const saveFeedback = doc.createElement("span")
  saveFeedback.className = "caj-feedback"

  const profileSelectLabel = doc.createElement("label")
  profileSelectLabel.className = "caj-select-label"

  const profileSelectText = doc.createElement("div")
  profileSelectText.className = "caj-select-text"
  profileSelectText.textContent = text.profiles.existingProfiles

  const profileSelect = doc.createElement("select")
  profileSelectLabel.appendChild(profileSelectText)
  profileSelectLabel.appendChild(profileSelect)
  list.appendChild(profileSelectLabel)

  const providerOptions = [
    { value: "openai", label: text.providers.openai },
    { value: "anthropic", label: text.providers.anthropic },
    { value: "google", label: text.providers.google },
    { value: "openai-compatible", label: text.providers["openai-compatible"] },
    { value: "openrouter", label: text.providers.openrouter },
    { value: "together", label: text.providers.together },
    { value: "deepseek", label: text.providers.deepseek },
    { value: "groq", label: text.providers.groq },
    { value: "fireworks", label: text.providers.fireworks },
    { value: "perplexity", label: text.providers.perplexity },
    { value: "mistral", label: text.providers.mistral },
    { value: "cohere", label: text.providers.cohere },
    { value: "anyscale", label: text.providers.anyscale },
    { value: "novita", label: text.providers.novita },
    { value: "hyperbolic", label: text.providers.hyperbolic },
    { value: "siliconflow", label: text.providers.siliconflow },
    { value: "cloudflare-workers-ai", label: text.providers["cloudflare-workers-ai"] },
    { value: "azure-openai", label: text.providers["azure-openai"] },
    { value: "tokenmix", label: text.providers.tokenmix },
    { value: "krater", label: text.providers.krater },
    { value: "ollama", label: text.providers.ollama },
    { value: "lm-studio", label: text.providers["lm-studio"] }
  ]

  const providerTypeOptions = [
    { value: DEFAULT_PROVIDER_TYPE, label: text.providerTypes["openai-compatible"] },
    { value: "anthropic-native", label: text.providerTypes["anthropic-native"] },
    { value: "google-native", label: text.providerTypes["google-native"] }
  ]

  const fields = [
    [text.profiles.profileId, "id"],
    [text.profiles.name, "name"],
    [text.profiles.model, "model"]
  ]

  const advancedFields = [
    [text.profiles.baseUrl, "baseURL"],
    [text.profiles.apiKey, "apiKey"],
    [text.profiles.temperature, "temperature"],
    [text.profiles.maxTokens, "maxTokens"],
    [text.profiles.enabledMcpServers, "enabledMcpServers"]
  ]

  for (const [label, key] of fields) {
    if (key === "model") {
      form.appendChild(createSelectField(doc, text.profiles.provider, "provider", providerOptions, "openai"))
    }

    form.appendChild(createField(doc, label, key, ""))
  }

  const advancedDetails = doc.createElement("details")
  advancedDetails.className = "caj-advanced"

  const advancedSummary = doc.createElement("summary")
  advancedSummary.textContent = text.common.advancedOptions
  advancedDetails.appendChild(advancedSummary)

  const advancedContent = doc.createElement("div")
  advancedContent.className = "caj-advanced-content"

  advancedContent.appendChild(
    createSelectField(doc, text.profiles.providerType, "providerType", providerTypeOptions, DEFAULT_PROVIDER_TYPE)
  )

  for (const [label, key] of advancedFields) {
    if (key === "apiKey") {
      advancedContent.appendChild(createPasswordField(doc, label, key, ""))
    } else {
      advancedContent.appendChild(createField(doc, label, key, ""))
    }
  }

  advancedContent.appendChild(createArea(doc, text.profiles.systemPrompt, "systemPrompt", ""))
  advancedDetails.appendChild(advancedContent)
  form.appendChild(advancedDetails)

  const controls = doc.createElement("div")
  controls.className = "caj-controls"

  const saveButton = doc.createElement("button")
  saveButton.type = "submit"
  saveButton.textContent = text.common.save

  saveFeedback.textContent = ""

  const activateButton = doc.createElement("button")
  activateButton.type = "button"
  activateButton.textContent = text.profiles.setActive

  const deleteButton = doc.createElement("button")
  deleteButton.type = "button"
  deleteButton.textContent = text.common.delete

  const closeButton = doc.createElement("button")
  closeButton.type = "button"
  closeButton.textContent = text.common.close

  controls.appendChild(saveButton)
  controls.appendChild(saveFeedback)
  controls.appendChild(activateButton)
  controls.appendChild(deleteButton)
  controls.appendChild(closeButton)

  function fillFormFromProfile(profile) {
    ensureSelectHasValue(form.elements.provider, profile.provider, doc)
    ensureSelectHasValue(form.elements.providerType, profile.providerType || DEFAULT_PROVIDER_TYPE, doc)

    form.elements.id.value = profile.id
    form.elements.name.value = profile.name
    form.elements.provider.value = profile.provider
    form.elements.providerType.value = profile.providerType || DEFAULT_PROVIDER_TYPE
    form.elements.model.value = profile.model
    form.elements.apiKey.value = profile.apiKey || ""
    form.elements.baseURL.value = profile.baseURL || ""
    form.elements.systemPrompt.value = profile.systemPrompt || ""
    form.elements.temperature.value = profile.temperature ?? ""
    form.elements.maxTokens.value = profile.maxTokens ?? ""
    form.elements.enabledMcpServers.value = (profile.enabledMcpServers || []).join(",")
  }

  function resetProfileForm() {
    form.elements.id.value = ""
    form.elements.name.value = ""
    form.elements.provider.value = "openai"
    form.elements.providerType.value = DEFAULT_PROVIDER_TYPE
    form.elements.model.value = ""
    form.elements.apiKey.value = ""
    form.elements.baseURL.value = ""
    form.elements.systemPrompt.value = ""
    form.elements.temperature.value = ""
    form.elements.maxTokens.value = ""
    form.elements.enabledMcpServers.value = ""
  }

  function syncDefaultBaseUrlFromProvider() {
    const provider = String(form.elements.provider.value || "").trim()
    const defaultBaseUrl = DEFAULT_PROVIDER_BASE_URLS[provider] || ""
    const currentBaseUrl = String(form.elements.baseURL.value || "").trim()
    const knownDefaults = new Set(Object.values(DEFAULT_PROVIDER_BASE_URLS))

    if (provider === "openai-compatible") {
      if (!currentBaseUrl || knownDefaults.has(currentBaseUrl)) {
        form.elements.baseURL.value = ""
      }
    } else if (!currentBaseUrl || knownDefaults.has(currentBaseUrl)) {
      form.elements.baseURL.value = defaultBaseUrl
    }

    if (provider === "anthropic") {
      form.elements.providerType.value = "anthropic-native"
      return
    }

    if (provider === "google") {
      form.elements.providerType.value = "google-native"
      return
    }

    form.elements.providerType.value = DEFAULT_PROVIDER_TYPE
  }

  const renderProfiles = () => {
    const active = agent.getActiveProfile()
    const entries = agent.listProfiles()
    profileSelect.innerHTML = ""

    const placeholder = doc.createElement("option")
    placeholder.value = ""
    placeholder.textContent = entries.length === 0 ? text.profiles.noProfiles : text.profiles.selectProfile
    profileSelect.appendChild(placeholder)

    for (const profile of entries) {
      const option = doc.createElement("option")
      option.value = profile.id
      option.textContent = `${profile.id} - ${profile.name}${active?.id === profile.id ? ` (${text.common.activeSuffix})` : ""}`
      profileSelect.appendChild(option)
    }

    if (active?.id) {
      profileSelect.value = active.id
      const activeProfile = entries.find((profile) => profile.id === active.id) || active
      if (activeProfile) {
        fillFormFromProfile(activeProfile)
      }
    } else {
      profileSelect.value = ""
      resetProfileForm()
    }
  }

  profileSelect.addEventListener("change", () => {
    const id = String(profileSelect.value || "").trim()
    if (!id) {
      resetProfileForm()
      return
    }

    const profile = agent.loadProfile(id)
    if (!profile) {
      return
    }

    fillFormFromProfile(profile)
  })

  form.elements.provider.addEventListener("change", () => {
    syncDefaultBaseUrlFromProvider()
  })

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    error.textContent = ""
    saveFeedback.textContent = ""
    saveFeedback.className = "caj-feedback"

    try {
      const profile = readFormData(form)
      agent.saveProfile(profile.id, profile)
      renderProfiles()
      saveFeedback.className = "caj-feedback caj-feedback--success"
      saveFeedback.textContent = text.common.saved
      setTimeout(() => {
        if (saveFeedback.textContent === text.common.saved) {
          saveFeedback.textContent = ""
          saveFeedback.className = "caj-feedback"
        }
      }, 1800)
    } catch (panelError) {
      error.textContent = panelError instanceof Error ? panelError.message : text.profiles.failedToSave
    }
  })

  activateButton.onclick = () => {
    error.textContent = ""

    try {
      const id = String(form.elements.id.value || "").trim()
      if (!id) {
        error.textContent = text.common.noSelectionToActivate
        return
      }
      agent.setActiveProfile(id)
      renderProfiles()
    } catch (panelError) {
      error.textContent = panelError instanceof Error ? panelError.message : text.profiles.failedToActivate
    }
  }

  deleteButton.onclick = () => {
    error.textContent = ""

    const id = String(form.elements.id.value || "").trim()
    if (!id) {
      error.textContent = text.common.noSelectionToDelete
      return
    }

    if (!confirmAction(`${text.common.confirmDeleteProfile}\n\n${text.common.deleteConfirmTitle}`)) {
      return
    }

    agent.deleteProfile(id)
    renderProfiles()
    resetProfileForm()
  }

  closeButton.onclick = () => {
    closeOverlay(overlay)
  }

  form.appendChild(error)
  form.appendChild(controls)
  dialog.appendChild(list)
  dialog.appendChild(form)
  overlay.appendChild(dialog)
  doc.body.appendChild(overlay)

  renderProfiles()
}

export function openMcpPanel({ agent, dialogClass }) {
  const doc = requireDocument()
  injectFallbackStyles(doc)

  const text = getUiText(doc)
  const overlay = createOverlay(doc)
  const dialog = createDialog(doc, text.dialogs.mcpTitle, dialogClass, () => closeOverlay(overlay))
  const list = doc.createElement("div")
  const form = doc.createElement("form")

  const error = doc.createElement("p")
  error.className = "caj-error"

  const feedback = doc.createElement("span")
  feedback.className = "caj-feedback"
  feedback.textContent = ""

  const mcpSelectLabel = doc.createElement("label")
  mcpSelectLabel.className = "caj-select-label"

  const mcpSelectText = doc.createElement("div")
  mcpSelectText.className = "caj-select-text"
  mcpSelectText.textContent = text.mcp.existingServers

  const mcpSelect = doc.createElement("select")
  mcpSelectLabel.appendChild(mcpSelectText)
  mcpSelectLabel.appendChild(mcpSelect)
  list.appendChild(mcpSelectLabel)

  form.appendChild(createField(doc, text.mcp.mcpId, "id", ""))
  form.appendChild(createField(doc, text.mcp.name, "name", ""))
  form.appendChild(createField(doc, text.mcp.transport, "transport", "streamable-http"))
  form.appendChild(createField(doc, text.mcp.url, "url", ""))
  form.elements.transport.readOnly = true
  form.elements.transport.className += " caj-input-readonly"

  const advancedDetails = doc.createElement("details")
  advancedDetails.className = "caj-advanced"

  const advancedSummary = doc.createElement("summary")
  advancedSummary.textContent = text.common.advancedOptions
  advancedDetails.appendChild(advancedSummary)

  const advancedContent = doc.createElement("div")
  advancedContent.className = "caj-advanced-content"
  advancedContent.appendChild(createArea(doc, text.mcp.headersJson, "headers", "{}"))
  advancedDetails.appendChild(advancedContent)
  form.appendChild(advancedDetails)

  const controls = doc.createElement("div")
  controls.className = "caj-controls"

  const saveButton = doc.createElement("button")
  saveButton.type = "submit"
  saveButton.textContent = text.common.save

  const testButton = doc.createElement("button")
  testButton.type = "button"
  testButton.textContent = text.mcp.testServer

  const deleteButton = doc.createElement("button")
  deleteButton.type = "button"
  deleteButton.textContent = text.common.delete

  const closeButton = doc.createElement("button")
  closeButton.type = "button"
  closeButton.textContent = text.common.close

  controls.appendChild(saveButton)
  controls.appendChild(testButton)
  controls.appendChild(feedback)
  controls.appendChild(deleteButton)
  controls.appendChild(closeButton)

  function fillFormFromServer(server) {
    form.elements.id.value = server.id
    form.elements.name.value = server.name
    form.elements.transport.value = server.transport || "streamable-http"
    form.elements.url.value = server.url
    form.elements.headers.value = JSON.stringify(server.headers || {}, null, 2)
  }

  const renderServers = () => {
    const entries = agent.listMcpServers()
    mcpSelect.innerHTML = ""

    const placeholder = doc.createElement("option")
    placeholder.value = ""
    placeholder.textContent = entries.length === 0 ? text.mcp.noServers : text.mcp.selectServer
    mcpSelect.appendChild(placeholder)

    for (const server of entries) {
      const option = doc.createElement("option")
      option.value = server.id
      option.textContent = `${server.id} - ${server.name}`
      mcpSelect.appendChild(option)
    }
  }

  mcpSelect.addEventListener("change", () => {
    const id = String(mcpSelect.value || "").trim()
    if (!id) {
      return
    }

    const server = agent.loadMcpServer(id)
    if (!server) {
      return
    }

    fillFormFromServer(server)
  })

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    error.textContent = ""
    feedback.textContent = ""
    feedback.className = "caj-feedback"

    try {
      const formData = new FormData(form)
      const headersRaw = String(formData.get("headers") || "{}").trim()
      const headers = headersRaw ? JSON.parse(headersRaw) : {}
      if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
        throw new Error(text.mcp.invalidHeadersJson)
      }

      agent.saveMcpServer(String(formData.get("id") || ""), {
        name: String(formData.get("name") || ""),
        transport: "streamable-http",
        url: String(formData.get("url") || ""),
        headers,
        enabled: true
      })

      renderServers()
      mcpSelect.value = String(formData.get("id") || "").trim()
      feedback.className = "caj-feedback caj-feedback--success"
      feedback.textContent = text.common.saved
      setTimeout(() => {
        if (feedback.textContent === text.common.saved) {
          feedback.textContent = ""
          feedback.className = "caj-feedback"
        }
      }, 1800)
    } catch (panelError) {
      error.textContent = panelError instanceof Error ? panelError.message : text.mcp.failedToSave
    }
  })

  testButton.onclick = async () => {
    error.textContent = ""
    feedback.textContent = ""
    feedback.className = "caj-feedback"

    const id = String(form.elements.id.value || "").trim()
    if (!id) {
      error.textContent = text.mcp.mcpIdRequiredToTest
      return
    }

    try {
      await agent.initializeMcp(id)
      feedback.className = "caj-feedback caj-feedback--success"
      feedback.textContent = text.mcp.serverAlive
      setTimeout(() => {
        if (feedback.textContent === text.mcp.serverAlive) {
          feedback.textContent = ""
          feedback.className = "caj-feedback"
        }
      }, 2400)
    } catch (panelError) {
      feedback.className = "caj-feedback caj-feedback--error"
      feedback.textContent = ""
      error.textContent = panelError instanceof Error ? panelError.message : text.mcp.failedToTest
    }
  }

  deleteButton.onclick = () => {
    error.textContent = ""
    feedback.textContent = ""
    feedback.className = "caj-feedback"

    const id = String(form.elements.id.value || "").trim()
    if (!id) {
      error.textContent = text.common.noSelectionToDelete
      return
    }

    if (!confirmAction(`${text.common.confirmDeleteMcpServer}\n\n${text.common.deleteConfirmTitle}`)) {
      return
    }

    agent.deleteMcpServer(id)
    renderServers()
    mcpSelect.value = ""
    form.reset()
    form.elements.transport.value = "streamable-http"
    form.elements.headers.value = "{}"
  }

  closeButton.onclick = () => {
    closeOverlay(overlay)
  }

  form.appendChild(error)
  form.appendChild(controls)
  dialog.appendChild(list)
  dialog.appendChild(form)
  overlay.appendChild(dialog)
  doc.body.appendChild(overlay)

  renderServers()
}

export function showConfigPanelIfNeeded(agent) {
  if (!agent.isReady()) {
    agent.openConfigPanel()
    return true
  }

  return false
}
