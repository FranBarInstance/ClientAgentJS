const DEFAULT_PROVIDER_TYPE = "openai-compatible"

function safeParseObject(raw) {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item) => typeof item === "string" && item.trim().length > 0)
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeProfile(id, profile) {
  if (!profile || typeof profile !== "object") {
    throw new Error("Profile must be an object.")
  }

  const normalizedId = String(id || profile.id || "").trim()
  const name = String(profile.name || "").trim()
  const provider = String(profile.provider || "").trim()
  const model = String(profile.model || "").trim()

  if (!normalizedId) {
    throw new Error("Profile id is required.")
  }

  if (!name) {
    throw new Error("Profile name is required.")
  }

  if (!provider) {
    throw new Error("Profile provider is required.")
  }

  if (!model) {
    throw new Error("Profile model is required.")
  }

  const createdAt = profile.createdAt || nowIso()

  return {
    id: normalizedId,
    name,
    provider,
    providerType: String(profile.providerType || DEFAULT_PROVIDER_TYPE),
    apiKey: profile.apiKey == null ? "" : String(profile.apiKey),
    baseURL: profile.baseURL == null || profile.baseURL === "" ? null : String(profile.baseURL),
    model,
    systemPrompt: profile.systemPrompt == null ? "" : String(profile.systemPrompt),
    temperature: toNumberOrNull(profile.temperature),
    maxTokens: toNumberOrNull(profile.maxTokens),
    enabledMcpServers: normalizeStringArray(profile.enabledMcpServers),
    createdAt,
    updatedAt: nowIso()
  }
}

function sanitizeProfilesMap(profilesMap) {
  const input = profilesMap && typeof profilesMap === "object" && !Array.isArray(profilesMap) ? profilesMap : {}
  const normalizedMap = {}

  for (const [id, profile] of Object.entries(input)) {
    try {
      const normalizedProfile = normalizeProfile(id, profile)
      normalizedMap[normalizedProfile.id] = normalizedProfile
    } catch {
      // Ignore invalid persisted entries and keep the rest of the storage readable.
    }
  }

  return normalizedMap
}

export function createProfileStorage({ storage, storageKey }) {
  const profilesKey = `${storageKey}:profiles`
  const activeProfileKey = `${storageKey}:activeProfile`

  function readProfilesMap() {
    return sanitizeProfilesMap(safeParseObject(storage.getItem(profilesKey)))
  }

  function writeProfilesMap(profilesMap) {
    storage.setItem(profilesKey, JSON.stringify(profilesMap))
  }

  function getActiveProfileId() {
    const raw = storage.getItem(activeProfileKey)
    if (!raw || typeof raw !== "string") {
      return null
    }

    const id = raw.trim()
    if (!id) {
      return null
    }

    const profiles = readProfilesMap()
    if (!profiles[id]) {
      return null
    }

    return id
  }

  function setActiveProfile(id) {
    if (id == null || String(id).trim() === "") {
      storage.removeItem(activeProfileKey)
      return null
    }

    const normalizedId = String(id).trim()
    const profiles = readProfilesMap()

    if (!profiles[normalizedId]) {
      throw new Error(`Profile not found: ${normalizedId}`)
    }

    storage.setItem(activeProfileKey, normalizedId)
    return normalizedId
  }

  return {
    saveProfile(id, profile) {
      const profiles = readProfilesMap()
      const normalizedProfile = normalizeProfile(id, profile)
      profiles[normalizedProfile.id] = normalizedProfile
      writeProfilesMap(profiles)
      return { ...normalizedProfile }
    },

    loadProfile(id) {
      if (!id) {
        return null
      }

      const profiles = readProfilesMap()
      const profile = profiles[String(id)]
      return profile ? { ...profile } : null
    },

    listProfiles() {
      const profiles = readProfilesMap()
      return Object.values(profiles)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((profile) => ({ ...profile }))
    },

    deleteProfile(id) {
      const normalizedId = String(id || "").trim()
      if (!normalizedId) {
        return false
      }

      const profiles = readProfilesMap()
      if (!profiles[normalizedId]) {
        return false
      }

      delete profiles[normalizedId]
      writeProfilesMap(profiles)

      if (getActiveProfileId() === normalizedId) {
        storage.removeItem(activeProfileKey)
      }

      return true
    },

    clearProfiles() {
      storage.removeItem(profilesKey)
      storage.removeItem(activeProfileKey)
    },

    setActiveProfile,

    getActiveProfile() {
      const id = getActiveProfileId()
      if (!id) {
        return null
      }

      const profiles = readProfilesMap()
      const profile = profiles[id]
      return profile ? { ...profile } : null
    },

    getActiveProfileId,

    exportData() {
      return {
        profiles: readProfilesMap(),
        activeProfile: getActiveProfileId()
      }
    },

    importData({ profiles, activeProfile }) {
      const normalizedMap = sanitizeProfilesMap(profiles)

      writeProfilesMap(normalizedMap)

      if (activeProfile && normalizedMap[activeProfile]) {
        storage.setItem(activeProfileKey, activeProfile)
      } else {
        storage.removeItem(activeProfileKey)
      }
    }
  }
}
