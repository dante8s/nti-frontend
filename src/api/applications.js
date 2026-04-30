import api from './axios'

const MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

function getMockApps() {
  return JSON.parse(localStorage.getItem('mock_applications') || '[]')
}

function setMockApps(items) {
  localStorage.setItem('mock_applications', JSON.stringify(items))
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('user') || 'null')
}

function nowIso() {
  return new Date().toISOString()
}

function resolveProgramType(callId) {
  if (String(callId).startsWith('1')) return 'A'
  if (String(callId).startsWith('2')) return 'B'
  return 'A'
}

function mockResponse(data) {
  return Promise.resolve({ data })
}

export const applicationsApi = {
  create: (data) => {
    if (!MOCK_ENABLED) return api.post('/api/applications', data)

    const user = getCurrentUser()
    const items = getMockApps()
    const item = {
      id: Date.now(),
      userId: user?.id || 0,
      callId: data.callId,
      callTitle: resolveProgramType(data.callId) === 'A' ? 'Spring 2026 A Call' : 'Spring 2026 B Call',
      programType: resolveProgramType(data.callId),
      programName: resolveProgramType(data.callId) === 'A' ? 'Incubation A' : 'Practice B',
      status: 'DRAFT',
      adminComment: '',
      updatedAt: nowIso(),
      payload: data,
    }
    items.unshift(item)
    setMockApps(items)
    return mockResponse(item)
  },

  submit: (id) => {
    if (!MOCK_ENABLED) return api.patch(`/api/applications/${id}/submit`)

    const items = getMockApps()
    const idx = items.findIndex((a) => a.id === Number(id))
    if (idx >= 0) {
      items[idx].status = 'SUBMITTED'
      items[idx].updatedAt = nowIso()
      setMockApps(items)
      return mockResponse(items[idx])
    }
    return mockResponse(null)
  },

  getMy: () => {
    if (!MOCK_ENABLED) return api.get('/api/applications/my')
    const user = getCurrentUser()
    const items = getMockApps().filter((a) => a.userId === (user?.id || 0))
    return mockResponse(items)
  },

  getOne: (id) => {
    if (!MOCK_ENABLED) return api.get(`/api/applications/${id}`)
    const one = getMockApps().find((a) => a.id === Number(id)) || null
    return mockResponse(one)
  },

  // ADMIN
  getAll: () => api.get('/api/admin/applications'),

  changeStatus: (id, status, comment) =>
    api.patch(`/api/admin/applications/${id}/status`, {
      status,
      comment,
    }),
}
