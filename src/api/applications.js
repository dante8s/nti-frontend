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

function requiredDocumentTypes(programType) {
  if (programType === 'A') {
    return ['EXEC_SUMMARY', 'TECH_ARCH', 'ROADMAP', 'BUDGET', 'RISK_ANALYSIS', 'MONETIZATION']
  }
  return ['TEAM_CV', 'MOTIVATION_LETTER', 'SOLUTION_PROPOSAL']
}

function getAttachmentTypes(payload) {
  return (payload?.attachments || []).map((item) => item.type)
}

function canTransition(current, next) {
  if (current === 'SUBMITTED' && next === 'IN_REVIEW') return true
  if (current === 'IN_REVIEW' && ['APPROVED', 'REJECTED', 'NEEDS_REVISION'].includes(next)) return true
  return false
}

export const applicationsApi = {
  create: (data) => {
    if (!MOCK_ENABLED) {
      return api.post('/api/applications', data)
    }

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
      const app = items[idx]
      const required = requiredDocumentTypes(app.programType)
      const present = getAttachmentTypes(app.payload)
      const missing = required.filter((x) => !present.includes(x))
      if (missing.length) {
        return Promise.reject({
          response: {
            data: {
              message: `Не вистачає обов'язкових документів: ${missing.join(', ')}`,
              missingDocuments: missing,
            },
          },
        })
      }
      if (app.status !== 'DRAFT' && app.status !== 'NEEDS_REVISION') {
        return Promise.reject({
          response: {
            data: {
              message: `Надсилання доступне тільки для DRAFT/NEEDS_REVISION. Поточний статус: ${app.status}`,
            },
          },
        })
      }
      app.status = 'SUBMITTED'
      app.updatedAt = nowIso()
      setMockApps(items)
      return mockResponse(app)
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
  getAll: () => {
    if (!MOCK_ENABLED) return api.get('/api/admin/applications')
    return mockResponse(getMockApps())
  },

  changeStatus: (id, status, comment) => {
    if (!MOCK_ENABLED) {
      return api.patch(`/api/admin/applications/${id}/status`, {
        status,
        comment,
      })
    }

    const apps = getMockApps()
    const idx = apps.findIndex((item) => item.id === Number(id))
    if (idx < 0) return mockResponse(null)

    const current = apps[idx].status
    if (!canTransition(current, status)) {
      return Promise.reject({
        response: {
          data: {
            message: `Недозволений перехід статусу: ${current} -> ${status}`,
          },
        },
      })
    }

    apps[idx].status = status
    apps[idx].adminComment = comment || ''
    apps[idx].updatedAt = nowIso()

    const actor = getCurrentUser()
    const actorRoles = actor?.roles || []
    const bySuperAdmin = actorRoles.includes('SUPER_ADMIN')
    if (status === 'APPROVED') {
      apps[idx].onboarding = {
        status: 'PENDING_ASSIGNMENT',
        approvedAt: nowIso(),
        approvedBy: bySuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
        steps: [
          { key: 'mentor', label: 'Призначити ментора', done: false },
          { key: 'kickoff', label: 'Запланувати kickoff', done: false },
          { key: 'milestones', label: 'Створити етапи проєкту', done: false },
        ],
      }
    }

    setMockApps(apps)
    return mockResponse(apps[idx])
  },
}
