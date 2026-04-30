import api from './axios'

const MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

const CRITERIA_KEY = 'mock_eval_criteria'
const APPS_KEY = 'mock_eval_applications'
const SCORES_KEY = 'mock_eval_scores'

function ok(data) {
  return Promise.resolve({ data })
}

function getItems(key) {
  return JSON.parse(localStorage.getItem(key) || '[]')
}

function setItems(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function ensureSeedData() {
  if (!getItems(CRITERIA_KEY).length) {
    setItems(CRITERIA_KEY, [
      { id: 1, name: 'Innovation potential', weightPercent: 30, maxScore: 10 },
      { id: 2, name: 'Technical feasibility', weightPercent: 30, maxScore: 10 },
      { id: 3, name: 'Team readiness', weightPercent: 20, maxScore: 10 },
      { id: 4, name: 'Market value', weightPercent: 20, maxScore: 10 },
    ])
  }

  if (!getItems(APPS_KEY).length) {
    setItems(APPS_KEY, [
      { id: 1001, status: 'SUBMITTED', applicantId: 501, callId: 201 },
      { id: 1002, status: 'IN_REVIEW', applicantId: 502, callId: 201 },
      { id: 1003, status: 'SUBMITTED', applicantId: 503, callId: 101 },
    ])
  }
}

export const evaluationApi = {
  getCriteria: (callId) => {
    if (!MOCK_ENABLED) return api.get(`/api/evaluation/calls/${callId}/criteria`)
    ensureSeedData()
    return ok(getItems(CRITERIA_KEY))
  },

  getQueue: (callId) => {
    if (!MOCK_ENABLED) return api.get('/api/evaluation/queue', { params: { callId } })
    ensureSeedData()
    const apps = getItems(APPS_KEY).filter((item) => item.callId === Number(callId))
    return ok(apps)
  },

  submitScore: (payload) => {
    if (!MOCK_ENABLED) return api.post('/api/evaluation/scores', payload)

    const scores = getItems(SCORES_KEY)
    const next = {
      id: Date.now(),
      applicationId: Number(payload.applicationId),
      evaluatorId: Number(payload.evaluatorId),
      criteriaId: Number(payload.criteriaId),
      score: Number(payload.score),
      comment: payload.comment || '',
      createdAt: new Date().toISOString(),
    }
    scores.push(next)
    setItems(SCORES_KEY, scores)
    return ok(next)
  },

  getAverage: (applicationId) => {
    if (!MOCK_ENABLED) return api.get(`/api/evaluation/applications/${applicationId}/average`)

    const scores = getItems(SCORES_KEY).filter((item) => item.applicationId === Number(applicationId))
    if (!scores.length) return ok({ simpleAverage: null, weightedAverage: null })

    const criteria = getItems(CRITERIA_KEY)
    const simpleAverage = scores.reduce((acc, item) => acc + item.score, 0) / scores.length
    let weightedSum = 0
    let weightSum = 0
    for (const item of scores) {
      const c = criteria.find((x) => x.id === item.criteriaId)
      const w = c?.weightPercent || 0
      weightedSum += item.score * w
      weightSum += w
    }
    const weightedAverage = weightSum ? weightedSum / weightSum : null
    return ok({
      simpleAverage: Number(simpleAverage.toFixed(2)),
      weightedAverage: weightedAverage == null ? null : Number(weightedAverage.toFixed(2)),
    })
  },

  getCompletion: (applicationId, evaluatorId, callId) => {
    if (!MOCK_ENABLED) {
      return api.get('/api/evaluation/completion', {
        params: { applicationId, evaluatorId, callId },
      })
    }

    const criteria = getItems(CRITERIA_KEY)
    const scores = getItems(SCORES_KEY).filter(
      (item) => item.applicationId === Number(applicationId) && item.evaluatorId === Number(evaluatorId),
    )
    return ok({
      complete: scores.length >= criteria.length,
      scoredCriteria: scores.length,
      totalCriteria: criteria.length,
    })
  },
}
