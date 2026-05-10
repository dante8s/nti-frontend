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
    return ['RESUME_A', 'TECHNICAL_ARCH', 'ROADMAP', 'BUDGET', 'RISK_ANALYSIS', 'MONETIZATION']
  }
  return ['RESUME_B', 'MOTIVATION', 'SOLUTION_PROPOSAL', 'IMPLEMENTATION']
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
  /** Тіло лише { callId } — сумісно з бекендом. */
  create: (data) => {
    if (!MOCK_ENABLED) {
      return api.post('/api/applications', { callId: data.callId })
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
      formData: data.formData || null,
      payload: data,
    }
    items.unshift(item)
    setMockApps(items)
    return mockResponse({
      id: item.id,
      callId: item.callId,
      callTitle: item.callTitle,
      programName: item.programName,
      programType: item.programType === 'A' ? 'PROGRAM_A' : 'PROGRAM_B',
      status: item.status,
      adminComment: item.adminComment,
      formData: item.formData,
      createdAt: item.updatedAt,
      updatedAt: item.updatedAt,
    })
  },

  /** Аліаси для ApplicationFormA/B (логіка як у origin/main). */
  createDraft(callId) {
    return this.create({ callId })
  },
  updateDraft(id, formData) {
    return this.update(id, formData)
  },

  getMyByCall: (callId) => {
    if (!MOCK_ENABLED) {
      return api.get(`/api/applications/my/by-call/${callId}`)
    }
    const user = getCurrentUser()
    const one = getMockApps().find(
      (a) => a.userId === (user?.id || 0) && Number(a.callId) === Number(callId),
    )
    if (!one) {
      return Promise.reject({ response: { status: 404 } })
    }
    return mockResponse({
      id: one.id,
      callId: one.callId,
      callTitle: one.callTitle,
      programName: one.programName,
      programType: one.programType === 'A' ? 'PROGRAM_A' : 'PROGRAM_B',
      status: one.status,
      adminComment: one.adminComment || '',
      formData: one.formData || null,
      createdAt: one.updatedAt,
      updatedAt: one.updatedAt,
    })
  },

  update: (id, formData) => {
    const body =
      typeof formData === 'string' ? { formData } : { formData: JSON.stringify(formData) }
    if (!MOCK_ENABLED) {
      return api.put(`/api/applications/${id}`, body)
    }
    const items = getMockApps()
    const idx = items.findIndex((a) => a.id === Number(id))
    if (idx < 0) return Promise.reject(new Error('not found'))
    items[idx].formData = body.formData
    items[idx].payload = { ...items[idx].payload, formData: body.formData }
    items[idx].updatedAt = nowIso()
    setMockApps(items)
    const one = items[idx]
    return mockResponse({
      id: one.id,
      callId: one.callId,
      callTitle: one.callTitle,
      programName: one.programName,
      programType: one.programType === 'A' ? 'PROGRAM_A' : 'PROGRAM_B',
      status: one.status,
      adminComment: one.adminComment || '',
      formData: one.formData,
      createdAt: one.updatedAt,
      updatedAt: one.updatedAt,
    })
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

  /** Alias для екранів команди (getOne). */
  getById: (id) => {
    if (!MOCK_ENABLED) return api.get(`/api/applications/${id}`)
    const one = getMockApps().find((a) => a.id === Number(id)) || null
    return mockResponse(one)
  },

  getDocumentStatus: (applicationId) => {
    if (!MOCK_ENABLED) {
      return api.get(`/api/applications/${applicationId}/documents/status`)
    }
    const app = getMockApps().find((a) => a.id === Number(applicationId))
    if (!app) return mockResponse([])
    const types = requiredDocumentTypes(app.programType)
    const atts = app.payload?.attachments || []
    const rows = types.map((t) => {
      const att = atts.find((x) => x.type === t)
      return {
        documentType: t,
        label: t,
        description: '',
        uploaded: !!att,
        fileName: att?.fileName,
        documentId: att ? 1 : null,
      }
    })
    return mockResponse(rows)
  },

  /**
   * Blob документа: inline (перегляд PDF) або attachment (зберегти файл).
   */
  fetchDocumentBlob: (applicationId, documentType, disposition = 'inline') => {
    if (!MOCK_ENABLED) {
      return api.get(`/api/applications/${applicationId}/documents/${documentType}`, {
        params: { disposition },
        responseType: 'blob',
      })
    }
    const app = getMockApps().find((a) => a.id === Number(applicationId))
    if (!app) {
      return Promise.reject({
        response: { status: 404, data: { message: 'Заявку не знайдено' } },
      })
    }
    const att = (app.payload?.attachments || []).find((x) => x.type === documentType)
    if (!att) {
      return Promise.reject({
        response: { status: 404, data: { message: 'Файл не знайдено' } },
      })
    }
    const name = att.fileName || `${documentType}.pdf`
    const mime = att.mimeType || 'application/octet-stream'
    const blob = new Blob(
      [`[mock] ${documentType}\nОригінал: ${name}\n`],
      { type: mime },
    )
    return Promise.resolve({
      data: blob,
      headers: {
        'content-disposition': `attachment; filename="${encodeURIComponent(name)}"`,
        'content-type': mime,
      },
      status: 200,
    })
  },

  /**
   * Завантажити файл на диск (комісія, адмін, студент).
   */
  downloadDocument: (applicationId, documentType) =>
    applicationsApi.fetchDocumentBlob(applicationId, documentType, 'attachment'),

  uploadDocument: (applicationId, documentType, file, onProgress) => {
    if (!MOCK_ENABLED) {
      const fd = new FormData()
      fd.append('file', file)
      return api.post(`/api/applications/${applicationId}/documents/${documentType}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.lengthComputable) {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      })
    }
    return new Promise((resolve, reject) => {
      if (onProgress) onProgress(30)
      const apps = getMockApps()
      const idx = apps.findIndex((a) => a.id === Number(applicationId))
      if (idx < 0) {
        reject(new Error('Application not found'))
        return
      }
      const payload = apps[idx].payload || {}
      const prev = Array.isArray(payload.attachments) ? payload.attachments : []
      const next = [
        ...prev.filter((x) => x.type !== documentType),
        {
          type: documentType,
          fileName: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
        },
      ]
      apps[idx].payload = { ...payload, attachments: next }
      apps[idx].updatedAt = nowIso()
      setMockApps(apps)
      if (onProgress) onProgress(100)
      setTimeout(() => resolve(mockResponse({ ok: true })), 40)
    })
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
