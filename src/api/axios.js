import axios from 'axios'

const explicit = import.meta.env.VITE_API_BASE_URL
const API_BASE_URL =
  explicit !== undefined && String(explicit).trim() !== ''
    ? String(explicit).trim()
    : import.meta.env.DEV
      ? ''
      : 'http://localhost:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
})

function stripContentType(config) {
  const h = config.headers
  if (!h) return
  delete h['Content-Type']
  if (typeof h.delete === 'function')
    h.delete('Content-Type')
}

function shouldSendJsonBody(data) {
  if (data == null || data === '')
    return false
  if (data instanceof FormData || data instanceof URLSearchParams)
    return false
  if (data instanceof Blob || data instanceof ArrayBuffer)
    return false
  if (ArrayBuffer.isView(data))
    return false
  return typeof data === 'object'
}

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    stripContentType(config)
  } else if (shouldSendJsonBody(config.data)) {
    config.headers['Content-Type'] = 'application/json'
  } else {
    stripContentType(config)
  }

  const token = localStorage.getItem('token')
  if (token)
    config.headers.Authorization = `Bearer ${token}`

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
