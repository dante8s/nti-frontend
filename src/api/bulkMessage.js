import api from './axios'

export const previewBulkMessage = (data) =>
  api.post('/api/admin/bulk-message/preview', data)

export const sendBulkMessage = (data) =>
  api.post('/api/admin/bulk-message', data)
