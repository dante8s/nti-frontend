import api from './axios'

export const exportMyData = () =>
  api.get('/api/gdpr/export', { responseType: 'blob' })

export const getMyData = () =>
  api.get('/api/gdpr/export')

export const deleteMyAccount = (password) =>
  api.delete('/api/gdpr/account', { data: { password } })
