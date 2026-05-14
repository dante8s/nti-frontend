import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'
import { authApi } from '@/api/auth'

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
    const response = await api.post('/api/auth/register', data)
    return response.data
  }

  async function login(email, password, captchaToken) {
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

  async function completeInvite(inviteToken, name, password) {
    await api.post('/api/auth/complete-invite', {
      inviteToken,
      name,
      password,
    })
  }

  async function completeOrgMemberInvite(inviteToken, name, password) {
    await authApi.completeOrgInvite({
      inviteToken,
      name,
      password,
    })
  }

  function logout() {
    token.value = null
    user.value = null
    sessionHydrated.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  /** Після зміни roles у localStorage (наприклад, після оновлення сесії). */
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
    completeInvite,
    completeOrgMemberInvite,
  }
})
