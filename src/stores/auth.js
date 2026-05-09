import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

const AUTH_MOCK_ENABLED = import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true'

function createMockToken() {
  return `mock-token-${Date.now()}`
}

function buildStoredUser(data = {}) {
  return {
    id: data.userId ?? data.id ?? null,
    name: data.name,
    email: data.email,
    roles: data.roles ?? [],
    accountStatus: data.accountStatus ?? null,
    emailVerified: data.emailVerified,
    onboardingCompleted: data.onboardingCompleted,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  /** Після першого заходу в /app — підтягнули id і ролі з GET /api/profile/me/session (student profile API) */
  const sessionHydrated = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => user.value?.roles?.[0] || null)
  const roles = computed(() => user.value?.roles || [])

  async function register(data) {
    if (AUTH_MOCK_ENABLED) {
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
      const hasUser = mockUsers.some((u) => u.email === data.email)
      if (hasUser) {
        throw new Error('Користувач з таким email вже існує (mock)')
      }

      const newUser = {
        id: Date.now(),
        name: data.name,
        email: data.email,
        password: data.password,
        roles: data.roles?.length ? data.roles : ['STUDENT'],
      }
      mockUsers.push(newUser)
      localStorage.setItem('mock_users', JSON.stringify(mockUsers))
      return 'Реєстрація успішна (mock). Тепер увійдіть у акаунт.'
    }

    const response = await api.post('/api/auth/register', data)
    return response.data
  }

  async function login(email, password, captchaToken) {
    if (AUTH_MOCK_ENABLED) {
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
      const found = mockUsers.find((u) => u.email === email && u.password === password)
      if (!found) {
        throw new Error('Невірний email або пароль (mock)')
      }

      const data = {
        token: createMockToken(),
        userId: Number(found.id),
        name: found.name,
        email: found.email,
        roles: found.roles ?? ['STUDENT'],
        emailVerified: true,
        onboardingCompleted: true,
      }
      token.value = data.token
      user.value = buildStoredUser(data)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(user.value))
      sessionHydrated.value = true
      return data
    }

    const response = await api.post('/api/auth/login', {
      email,
      password,
      captchaToken,
      'g-recaptcha-response': captchaToken,
    })
    const data = response.data
    token.value = data.token
    user.value = buildStoredUser(data)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(user.value))
    sessionHydrated.value = false
    await hydrateSession()
    return data
  }

  async function hydrateSession() {
    if (AUTH_MOCK_ENABLED) {
      sessionHydrated.value = true
      return
    }
    if (!token.value) {
      sessionHydrated.value = true
      return
    }
    try {
      const { data } = await api.get('/api/profile/me/session')
      user.value = buildStoredUser({
        userId: data.userId,
        name: data.name,
        email: data.email,
        roles: data.roles ?? [],
        accountStatus: data.accountStatus,
        emailVerified: data.emailVerified,
        onboardingCompleted: data.onboardingCompleted,
      })
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch {
      // залишаємо попередній user з localStorage; id може залишитись порожнім
    } finally {
      sessionHydrated.value = true
    }
  }

  async function forgotPassword(email) {
    await api.post('/api/auth/forgot-password', { email })
  }

  async function resetPassword(token, newPassword) {
    await api.post('/api/auth/reset-password', {
      token,
      newPassword,
    })
  }

  function logout() {
    token.value = null
    user.value = null
    sessionHydrated.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  /** Після зміни roles у localStorage (mock: після створення команди). */
  function refreshUserFromStorage() {
    user.value = JSON.parse(localStorage.getItem('user') || 'null')
  }

  return {
    token,
    user,
    sessionHydrated,
    isLoggedIn,
    role,
    roles,
    register,
    login,
    hydrateSession,
    logout,
    forgotPassword,
    resetPassword,
    refreshUserFromStorage,
  }
})
