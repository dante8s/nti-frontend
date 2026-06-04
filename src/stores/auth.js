import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'
import { authApi } from '@/api/auth'

/**
 * Сесія в браузері (однаково для всіх у команді — нічого руками не копіюють):
 * - localStorage `token` — JWT після успішного логіну
 * - localStorage `user` — JSON: id, name, email, roles, …
 * Ключі задає тільки цей стор; іншим достатньо залогінитись на своєму ПК.
 */
function normalizeRoles(roles) {
  if (roles == null) return []
  if (Array.isArray(roles)) return [...roles]
  if (typeof roles === 'object') return Object.values(roles)
  return []
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => user.value?.roles?.[0] || null)
  const roles = computed(() => user.value?.roles || [])

  async function register(data) {
    const response = await api.post('/api/auth/register', data)
    return response.data
  }

  /** Підтягує id та ролі з API (завжди оновлює id — важливо для запрошень у команду). */
  async function hydrateUserFromSession() {
    if (!token.value) return null
    const current = user.value
    try {
      const { data } = await authApi.getSessionBrief()
      const nextRoles = normalizeRoles(data.roles)
      const merged = {
        ...(current || {}),
        id: data.userId ?? data.id ?? current?.id ?? null,
        name: data.name ?? current?.name ?? '',
        email: data.email ?? current?.email ?? '',
        roles: nextRoles.length ? nextRoles : (current?.roles || []),
        accountStatus: data.accountStatus ?? current?.accountStatus,
        emailVerified: data.emailVerified ?? current?.emailVerified,
        onboardingCompleted: data.onboardingCompleted ?? current?.onboardingCompleted,
      }
      user.value = merged
      localStorage.setItem('user', JSON.stringify(merged))
      return merged.id
    } catch {
      return current?.id ?? null
    }
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
    user.value = {
      id: data.id ?? data.userId ?? null,
      name: data.name,
      email: data.email,
      roles: normalizeRoles(data.roles),
      accountStatus: data.accountStatus,
      emailVerified: data.emailVerified,
      onboardingCompleted: data.onboardingCompleted,
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(user.value))
    if (user.value.id == null || user.value.id === '') await hydrateUserFromSession()
    return data
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
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    token,
    user,
    isLoggedIn,
    role,
    roles,
    register,
    login,
    hydrateUserFromSession,
    logout,
    forgotPassword,
    resetPassword,
    completeInvite,
    completeOrgMemberInvite,
  }
})
