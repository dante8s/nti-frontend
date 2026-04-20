import api from './axios'

export const adminApi = {
  // Всі юзери що чекають схвалення
  getPendingUsers: () => api.get('/api/auth/admin/users/pending'),

  // Всі юзери
  getAllUsers: () => api.get('/api/auth/admin/users'),

  // Схвалити юзера
  approveUser: (id) => api.post(`/api/auth/admin/users/${id}/approve`),

  // Відхилити юзера
  rejectUser: (id, reason) =>
    api.post(`/api/auth/admin/users/${id}/reject`, null, { params: { reason } }),

  // Заблокувати юзера
  suspendUser: (id, reason) =>
    api.post(`/api/auth/admin/users/${id}/suspend`, null, { params: { reason } }),

  // Додати роль
  addRole: (id, role) =>
    api.post(`/api/auth/admin/users/${id}/roles/add`, null, { params: { role } }),

  // Забрати роль
  removeRole: (id, role) =>
    api.post(`/api/auth/admin/users/${id}/roles/remove`, null, { params: { role } }),
}
