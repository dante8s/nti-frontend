import api from './axios'

export const mentorshipsApi = {
  // Authenticated (CRUD-ish)
  create: (data) => api.post('/api/mentorships', data),

  getMy: () => api.get('/api/mentorships/my'),

  getOne: (id) => api.get(`/api/mentorships/${id}`),

  changeStatus: (id, status) =>
    api.patch(`/api/mentorships/${id}/status`, null, { params: { status } }),

  // Public
  getPublicMentors: () => api.get('/api/public/mentors'),

  // Admin/general list
  getAll: () => api.get('/api/mentorships'),

  getByApplication: (applicationId) =>
    api.get(`/api/mentorships/by-application/${applicationId}`),
}

