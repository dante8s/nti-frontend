import api from './axios'

export const reportingApi = {
  getStats: () => api.get('/api/reporting/stats'),

  getStudentDashboard: () => api.get('/api/reporting/dashboard/student'),

  getFirmDashboard: () => api.get('/api/reporting/dashboard/firm'),

  getPrCheck: (callId) => api.get(`/api/reporting/pr-check/${callId}`),

  /** Експорт заявок за фільтром: csv | xlsx | pdf | docx */
  exportApplications: (params, format) =>
    api.get('/api/reporting/export', {
      params: { ...params, format },
      responseType: 'blob',
    }),

  /** Excel з оцінками по конкретному виклику. */
  exportEvaluationWorkbook: (callId) =>
    api.get(`/api/reporting/export/${callId}`, { responseType: 'blob' }),
}
