import api from './axios'

export const profileApi = {
  getMe: () => api.get('/api/profile/me'),
  getById: (userId) => api.get(`/api/profile/${userId}`),
  createMe: (data) => api.post('/api/profile/me', data),
  updateMe: (data) => api.put('/api/profile/me', data),
  uploadCv: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/profile/me/cv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteCv: () => api.delete('/api/profile/me/cv'),
  getEligibility: () => api.get('/api/profile/me/call-application-eligibility'),
}
