import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

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
      name: data.name,
      email: data.email,
      roles: data.roles ?? [],
      emailVerified: data.emailVerified,
      onboardingCompleted: data.onboardingCompleted,
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(user.value))
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
    logout,
    forgotPassword,
    resetPassword,
  }
})
