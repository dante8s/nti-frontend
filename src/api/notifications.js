import api from './axios'

export const notificationsApi = {
  getAll:       ()   => api.get('/api/notifications'),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  markRead:     (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead:  ()   => api.patch('/api/notifications/read-all'),
}
