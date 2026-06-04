import api from './axios'

/** Тіло для Spring: вкладені сутності з id. */
function buildEvaluationScoreBody(payload) {
  return {
    application: { id: Number(payload.applicationId) },
    evaluator: { id: Number(payload.evaluatorId) },
    criteria: { id: Number(payload.criteriaId) },
    score: Number(payload.score),
    comment: payload.comment ?? null,
    recommendation: payload.recommendation ?? null,
  }
}

export const evaluationApi = {
  getCriteria: (callId) => api.get(`/api/evaluations/criteria/${callId}`),

  getQueue: (callId) => api.get(`/api/evaluations/calls/${callId}/applications`),

  submitScore: (payload) =>
    api.post('/api/evaluations/score', buildEvaluationScoreBody(payload)),

  getScores: (applicationId) => api.get(`/api/evaluations/${applicationId}/scores`),

  getMyScores: (applicationId, evaluatorId) =>
    api.get(`/api/evaluations/${applicationId}/mine`, {
      params: { evaluatorId },
    }),

  getAverage: (applicationId) => api.get(`/api/evaluations/${applicationId}/average`),

  getCompletion: (applicationId, evaluatorId, callId) =>
    api.get(`/api/evaluations/${applicationId}/complete`, {
      params: { evaluatorId, callId },
    }),
}
