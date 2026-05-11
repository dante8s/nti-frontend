import api from './axios'

export const programsApi = {
  // Публічні — без токена
  getAll: () => api.get('/api/public/programs'),

  getAllByType: (type) => api.get(`/api/public/programs-${type.toLowerCase()}`),

  getOne: (id) => api.get(`/api/public/programs/${id}`),

  getOneByType: (id, type) => api.get(`/api/public/programs-${type.toLowerCase()}/${id}`),

  fetchProgramA: (id) => api.get(`/api/public/programs-a/${id}`),

  fetchProgramB: (id) => api.get(`/api/public/programs-b/${id}`),

  getCallsByProgram: (programId) => api.get(`/api/public/programs/${programId}/calls`),

  getAllOpenCalls: () => api.get('/api/public/calls'),

  getCall: (id) => api.get(`/api/public/calls/${id}`),

  getAllCallsByProgram: (programId) => api.get(`/api/calls?programId=${programId}`),

  getByProgram: (programId) => api.get(`/api/calls?programId=${programId}`),

  // Тільки ADMIN
  create: (data) => api.post('/api/admin/programs', data),
const MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

const PROGRAMS_KEY = 'mock_programs'
const CALLS_KEY = 'mock_calls'

function ok(data) {
  return Promise.resolve({ data })
}

function normalizeType(type) {
  if (!type) return 'A'
  const t = String(type).toUpperCase()
  if (t === 'A' || t === 'PROGRAM_A') return 'A'
  if (t === 'B' || t === 'PROGRAM_B') return 'B'
  return 'A'
}

function getPrograms() {
  const items = JSON.parse(localStorage.getItem(PROGRAMS_KEY) || '[]')
  if (!items.length) {
    const seed = [
      {
        id: 1,
        type: 'A',
        name: 'Incubation A',
        shortDescription: 'Грантова інкубаційна програма для стартапів',
        description: 'Подача ідеї, відбір та менторська підтримка.',
        isActive: true,
      },
      {
        id: 2,
        type: 'B',
        name: 'Practice B',
        shortDescription: 'Жива практика з реальними задачами компаній',
        description: 'Командна розробка під керівництвом ментора.',
        isActive: true,
      },
    ]
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(seed))
    return seed
  }
  return items.map((item) => ({
    ...item,
    type: normalizeType(item.type),
    name: item.name || item.title || 'Program',
    isActive: item.isActive !== false,
  }))
}

function setPrograms(items) {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(items))
}

function getCalls() {
  const items = JSON.parse(localStorage.getItem(CALLS_KEY) || '[]')
  if (!items.length) {
    const seed = [
      {
        id: 101,
        programId: 1,
        title: 'Spring 2026 A Call',
        deadline: '2026-06-15T23:59:59.000Z',
        status: 'OPEN',
      },
      {
        id: 201,
        programId: 2,
        title: 'Spring 2026 B Call',
        deadline: '2026-06-22T23:59:59.000Z',
        status: 'OPEN',
      },
    ]
    localStorage.setItem(CALLS_KEY, JSON.stringify(seed))
    return seed
  }
  return items
}

function setCalls(items) {
  localStorage.setItem(CALLS_KEY, JSON.stringify(items))
}

export const programsApi = {
  // Публічні — без токена
  getAll: () => (MOCK_ENABLED ? ok(getPrograms().filter((p) => p.isActive !== false)) : api.get('/api/public/programs')),

  getAllByType: (type) =>
    MOCK_ENABLED
      ? ok(
          getPrograms().filter(
            (p) => normalizeType(p.type) === normalizeType(type),
          ),
        )
      : api.get(`/api/public/programs-${type.toLowerCase()}`),

  getOne: (id) =>
    MOCK_ENABLED
      ? ok(getPrograms().find((p) => p.id === Number(id)) || null)
      : api.get(`/api/public/programs/${id}`),

  getOneByType: (id, type) =>
    MOCK_ENABLED
      ? ok(
          getPrograms().find(
            (p) => p.id === Number(id) && normalizeType(p.type) === normalizeType(type),
          ) || null,
        )
      : api.get(`/api/public/programs-${type.toLowerCase()}/${id}`),

  getCallsByProgram: (programId) =>
    MOCK_ENABLED
      ? ok(getCalls().filter((c) => c.programId === Number(programId)))
      : api.get(`/api/public/programs/${programId}/calls`),

  getAllOpenCalls: () =>
    MOCK_ENABLED ? ok(getCalls().filter((c) => c.status === 'OPEN')) : api.get('/api/public/calls'),

  getCall: (id) =>
    MOCK_ENABLED ? ok(getCalls().find((c) => c.id === Number(id)) || null) : api.get(`/api/public/calls/${id}`),

  // Тільки ADMIN
  create: (data) => {
    if (!MOCK_ENABLED) return api.post('/api/admin/programs', data)
    const programs = getPrograms()
    const created = {
      id: Date.now(),
      name: data.name,
      title: data.name,
      description: data.description || '',
      type: normalizeType(data.type),
      isActive: data.isActive !== false,
    }
    programs.unshift(created)
    setPrograms(programs)
    return ok(created)
  },

  update: (id, data) => {
    if (!MOCK_ENABLED) return api.put(`/api/admin/programs/${id}`, data)
    const programs = getPrograms()
    const idx = programs.findIndex((p) => p.id === Number(id))
    if (idx >= 0) {
      programs[idx] = {
        ...programs[idx],
        ...data,
        name: data.name || programs[idx].name,
        title: data.name || programs[idx].title,
        type: normalizeType(data.type || programs[idx].type),
      }
      setPrograms(programs)
      return ok(programs[idx])
    }
    return ok(null)
  },

  createCall: (programId, data) => {
    if (!MOCK_ENABLED) return api.post(`/api/admin/programs/${programId}/calls`, data)
    const calls = getCalls()
    const created = {
      id: Date.now(),
      programId: Number(programId),
      title: data.title,
      deadline: data.deadline,
      evaluationCriteria: data.evaluationCriteria || null,
      status: 'OPEN',
    }
    calls.unshift(created)
    setCalls(calls)
    return ok(created)
  },

  closeCall: (id) => {
    if (!MOCK_ENABLED) return api.patch(`/api/admin/calls/${id}/close`)
    const calls = getCalls()
    const idx = calls.findIndex((c) => c.id === Number(id))
    if (idx >= 0) {
      calls[idx].status = 'CLOSED'
      setCalls(calls)
      return ok(calls[idx])
    }
    return ok(null)
  },
}
