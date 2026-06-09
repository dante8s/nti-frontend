import api from './axios'

export const evaluationsApi = {
  submitScore: (data) => api.post('/api/evaluations/score', data),
  getScores: (appId) => api.get(`/api/evaluations/${appId}/scores`),
  getMineScores: (appId, evaluatorId) =>
    api.get(`/api/evaluations/${appId}/mine`, { params: { evaluatorId } }),
  getAverage: (appId) => api.get(`/api/evaluations/${appId}/average`),
  checkComplete: (appId, evaluatorId, callId) =>
    api.get(`/api/evaluations/${appId}/complete`, { params: { appId, evaluatorId, callId } }),
  getCriteria: (callId) => api.get(`/api/evaluations/criteria/${callId}`),
  getApplicationQueue: (callId) => api.get(`/api/evaluations/calls/${callId}/applications`),
}
