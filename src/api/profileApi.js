import api from '@/api/axios'

const PROFILE_MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

function getMockProfiles() {
  return JSON.parse(localStorage.getItem('mock_profiles') || '{}')
}

function setMockProfiles(profiles) {
  localStorage.setItem('mock_profiles', JSON.stringify(profiles))
}

function getCvKey(userId) {
  return `mock_cv_${userId}`
}

function bytesToBase64(uint8) {
  let out = ''
  for (let i = 0; i < uint8.length; i += 1) {
    out += String.fromCharCode(uint8[i])
  }
  return btoa(out)
}

function maybeRejectMissingProfile(profile) {
  if (profile) return
  const error = new Error('Profile not found')
  error.response = { status: 404 }
  throw error
}

export async function getProfile(userId) {
  if (PROFILE_MOCK_ENABLED) {
    const profiles = getMockProfiles()
    const profile = profiles[userId]
    maybeRejectMissingProfile(profile)
    return profile
  }

  const { data } = await api.get(`/api/profile/${userId}`)
  return data
}

export async function createProfile(payload) {
  if (PROFILE_MOCK_ENABLED) {
    const profiles = getMockProfiles()
    profiles[payload.userId] = { ...payload }
    setMockProfiles(profiles)
    return profiles[payload.userId]
  }

  const { data } = await api.post('/api/profile', payload)
  return data
}

export async function updateProfile(userId, payload) {
  if (PROFILE_MOCK_ENABLED) {
    const profiles = getMockProfiles()
    profiles[userId] = { ...payload, userId }
    setMockProfiles(profiles)
    return profiles[userId]
  }

  const { data } = await api.put(`/api/profile/${userId}`, payload)
  return data
}

export async function uploadCv(userId, file) {
  if (PROFILE_MOCK_ENABLED) {
    const key = getCvKey(userId)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const base64 = bytesToBase64(bytes)
    localStorage.setItem(key, `data:application/pdf;base64,${base64}`)
    return { ok: true }
  }

  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/api/profile/${userId}/cv`, form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export function getCvUrl(userId) {
  if (PROFILE_MOCK_ENABLED) {
    return localStorage.getItem(getCvKey(userId)) || '#'
  }

  const apiUrl = api.defaults.baseURL || 'http://localhost:8080'
  return `${apiUrl}/api/profile/${userId}/cv`
}

export async function deleteCv(userId) {
  if (PROFILE_MOCK_ENABLED) {
    localStorage.removeItem(getCvKey(userId))
    return { ok: true }
  }

  const { data } = await api.delete(`/api/profile/${userId}/cv`)
  return data
}
