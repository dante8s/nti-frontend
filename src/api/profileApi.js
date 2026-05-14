import api from '@/api/axios'

export async function getProfile(userId) {
  const endpoint = userId ? `/api/profile/${userId}` : '/api/profile/me'
  const { data } = await api.get(endpoint)
  return data
}

export async function createProfile(payload) {
  const { data } = await api.post('/api/profile/me', payload)
  return data
}

export async function updateProfile(userId, payload) {
  const endpoint = userId ? `/api/profile/${userId}` : '/api/profile/me'
  const { data } = await api.put(endpoint, payload)
  return data
}

export async function uploadCv(userId, file) {
  const form = new FormData()
  form.append('file', file)
  const endpoint = userId ? `/api/profile/${userId}/cv` : '/api/profile/me/cv'
  const { data } = await api.post(endpoint, form)
  return data
}

export function getCvUrl(userId) {
  const apiUrl = api.defaults.baseURL || 'http://localhost:8081'
  if (userId) return `${apiUrl}/api/profile/${userId}/cv`
  return `${apiUrl}/api/profile/me/cv`
}

export async function deleteCv(userId) {
  const endpoint = userId ? `/api/profile/${userId}/cv` : '/api/profile/me/cv'
  const { data } = await api.delete(endpoint)
  return data
}

/** JPEG / PNG / WebP, до 3 MB (обмеження бекенду). */
export async function uploadProfilePhoto(userId, file) {
  const form = new FormData()
  form.append('file', file)
  const endpoint = userId ? `/api/profile/${userId}/photo` : '/api/profile/me/photo'
  const { data } = await api.post(endpoint, form)
  return data
}

export async function deleteProfilePhoto(userId) {
  const endpoint = userId ? `/api/profile/${userId}/photo` : '/api/profile/me/photo'
  const { data } = await api.delete(endpoint)
  return data
}

export function fetchProfilePhotoBlob(userId) {
  const endpoint = userId ? `/api/profile/${userId}/photo` : '/api/profile/me/photo'
  return api.get(endpoint, { responseType: 'blob' })
}

/** Підказка з бекенду: профіль + лідерство для переходу до заявки на виклик. */
export async function getCallApplicationEligibility() {
  const { data } = await api.get('/api/profile/me/call-application-eligibility')
  return data
}
