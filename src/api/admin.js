import api from './axios'

export const adminApi = {
  // All users awaiting approval
  getPendingUsers: () => api.get('/api/auth/admin/users/pending'),

  // All users
  getAllUsers: () => api.get('/api/auth/admin/users'),

  // Approve user
  approveUser: (id) => api.post(`/api/auth/admin/users/${id}/approve`),

  // Reject user
  rejectUser: (id, reason) =>
    api.post(`/api/auth/admin/users/${id}/reject`, null, { params: { reason } }),

  // Suspend user
  suspendUser: (id, reason) =>
    api.post(`/api/auth/admin/users/${id}/suspend`, null, { params: { reason } }),

  // Add role
  addRole: (id, role) =>
    api.post(`/api/auth/admin/users/${id}/roles/add`, null, { params: { role } }),

  // Remove role
  removeRole: (id, role) =>
    api.post(`/api/auth/admin/users/${id}/roles/remove`, null, { params: { role } }),

  // Invite mentor
  inviteMentor: (email) => api.post('/api/auth/admin/invite-mentor', { email }),

  // All users for Product Owner assignment (ADMIN or SUPER_ADMIN)
  getUsersForPO: () => api.get('/api/admin/users/for-po-assignment'),

  // Completed project reports
  getReports: () => api.get('/api/admin/reports'),
  exportReportCsv: (id) => api.get(`/api/admin/reports/${id}/export`, { responseType: 'blob' }),
  exportAllReportsCsv: () => api.get('/api/admin/reports/export', { responseType: 'blob' }),
}
