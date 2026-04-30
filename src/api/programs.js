import api from './axios'

const MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

const mockPrograms = [
  {
    id: 1,
    type: 'A',
    title: 'Incubation A',
    shortDescription: 'Грантова інкубаційна програма для стартапів',
    description: 'Подача ідеї, відбір та менторська підтримка.',
  },
  {
    id: 2,
    type: 'B',
    title: 'Practice B',
    shortDescription: 'Жива практика з реальними задачами компаній',
    description: 'Командна розробка під керівництвом ментора.',
  },
]

const mockCalls = [
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

function ok(data) {
  return Promise.resolve({ data })
}

export const programsApi = {
  // Публічні — без токена
  getAll: () => (MOCK_ENABLED ? ok(mockPrograms) : api.get('/api/public/programs')),

  getAllByType: (type) =>
    MOCK_ENABLED
      ? ok(mockPrograms.filter((p) => p.type.toLowerCase() === String(type).toLowerCase()))
      : api.get(`/api/public/programs-${type.toLowerCase()}`),

  getOne: (id) =>
    MOCK_ENABLED
      ? ok(mockPrograms.find((p) => p.id === Number(id)) || null)
      : api.get(`/api/public/programs/${id}`),

  getOneByType: (id, type) =>
    MOCK_ENABLED
      ? ok(
          mockPrograms.find(
            (p) => p.id === Number(id) && p.type.toLowerCase() === String(type).toLowerCase(),
          ) || null,
        )
      : api.get(`/api/public/programs-${type.toLowerCase()}/${id}`),

  getCallsByProgram: (programId) =>
    MOCK_ENABLED
      ? ok(mockCalls.filter((c) => c.programId === Number(programId)))
      : api.get(`/api/public/programs/${programId}/calls`),

  getAllOpenCalls: () =>
    MOCK_ENABLED ? ok(mockCalls.filter((c) => c.status === 'OPEN')) : api.get('/api/public/calls'),

  getCall: (id) =>
    MOCK_ENABLED ? ok(mockCalls.find((c) => c.id === Number(id)) || null) : api.get(`/api/public/calls/${id}`),

  // Тільки ADMIN
  create: (data) => api.post('/api/admin/programs', data),

  update: (id, data) => api.put(`/api/admin/programs/${id}`, data),

  createCall: (programId, data) => api.post(`/api/admin/programs/${programId}/calls`, data),

  closeCall: (id) => api.patch(`/api/admin/calls/${id}/close`),
}
