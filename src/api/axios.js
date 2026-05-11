import axios from 'axios'

// Dev: empty base URL → same-origin requests; Vite proxies /api → backend (vite.config.js).
// Set VITE_API_BASE_URL only to call the API directly (then match server.port and CORS app.frontend-url).
const explicit = import.meta.env.VITE_API_BASE_URL
const API_BASE_URL =
  explicit !== undefined && String(explicit).trim() !== ''
    ? String(explicit).trim()
    : import.meta.env.DEV
      ? ''
      : 'http://localhost:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Автоматично додає токен до кожного запиту
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Якщо 401 — виганяємо на логін
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
