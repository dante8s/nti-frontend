import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mentorshipsApi } from '@/api/mentorships'

export const MentorshipStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
})

function normalizeLocalDate(value) {
  if (!value) return value
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  return value
}

function normalizeConsultationPayload(payload = {}) {
  return {
    ...payload,
    consultationDate: normalizeLocalDate(payload.consultationDate),
  }
}

export const useMentorshipStore = defineStore('mentorship', () => {
  const mentorships = ref([])
  const myMentorships = ref([])
  const publicMentors = ref([])
  const mentorshipsByApplication = ref({})
  const currentMentorship = ref(null)
  const consultationsByMentorship = ref({})
  const consultationsLoading = ref(false)
  const consultationsError = ref(null)

  function upsertMentorshipInList(listRef, mentorship) {
    if (!mentorship?.id) return
    const idx = listRef.value.findIndex((m) => m?.id === mentorship.id)
    if (idx === -1) listRef.value = [mentorship, ...listRef.value]
    else listRef.value.splice(idx, 1, mentorship)
  }

  async function create(data) {
    const response = await mentorshipsApi.create(data)
    currentMentorship.value = response.data
    upsertMentorshipInList(mentorships, response.data)
    upsertMentorshipInList(myMentorships, response.data)
    return response.data
  }

  async function getMyMentorships() {
    const response = await mentorshipsApi.getMy()
    myMentorships.value = response.data
    return response.data
  }

  // Backwards-compatible alias (older naming)
  const getMy = getMyMentorships

  async function getOne(id) {
    const response = await mentorshipsApi.getOne(id)
    currentMentorship.value = response.data
    upsertMentorshipInList(mentorships, response.data)
    upsertMentorshipInList(myMentorships, response.data)
    return response.data
  }

  async function changeStatus(id, status) {
    const response = await mentorshipsApi.changeStatus(id, status)
    currentMentorship.value = response.data
    upsertMentorshipInList(mentorships, response.data)
    upsertMentorshipInList(myMentorships, response.data)
    return response.data
  }

  // Naming aligned with backend controller/service intent:
  // "close" means ACTIVE -> COMPLETED/CANCELLED (admin-only server-side).
  const closeMentorship = changeStatus

  async function getPublicMentors() {
    const response = await mentorshipsApi.getPublicMentors()
    publicMentors.value = response.data
    return response.data
  }

  async function getAll() {
    const response = await mentorshipsApi.getAll()
    mentorships.value = response.data
    return response.data
  }

  async function getByApplication(applicationId) {
    const response = await mentorshipsApi.getByApplication(applicationId)
    mentorshipsByApplication.value = {
      ...mentorshipsByApplication.value,
      [applicationId]: response.data || [],
    }
    return mentorshipsByApplication.value[applicationId]
  }

  async function getConsultations(mentorshipId) {
    consultationsLoading.value = true
    consultationsError.value = null
    try {
      const response = await mentorshipsApi.getConsultations(mentorshipId)
      consultationsByMentorship.value = {
        ...consultationsByMentorship.value,
        [String(mentorshipId)]: response.data || [],
      }
      return consultationsByMentorship.value[String(mentorshipId)]
    } catch (error) {
      consultationsError.value = error
      throw error
    } finally {
      consultationsLoading.value = false
    }
  }

  async function createConsultation(payload) {
    const normalizedPayload = normalizeConsultationPayload(payload)
    const response = await mentorshipsApi.createConsultation(normalizedPayload)
    const mentorshipId = normalizedPayload?.mentorshipId ?? response.data?.mentorshipId
    if (mentorshipId) {
      const key = String(mentorshipId)
      consultationsByMentorship.value = {
        ...consultationsByMentorship.value,
        [key]: [...(consultationsByMentorship.value[key] || []), response.data],
      }
    }
    return response.data
  }

  async function updateConsultation(id, payload) {
    const normalizedPayload = normalizeConsultationPayload(payload)
    const response = await mentorshipsApi.updateConsultation(id, normalizedPayload)
    const mentorshipId = normalizedPayload?.mentorshipId ?? response.data?.mentorshipId
    if (mentorshipId) {
      const key = String(mentorshipId)
      const list = consultationsByMentorship.value[key] || []
      const idx = list.findIndex((consultation) => consultation?.id === id)
      if (idx >= 0) {
        const next = [...list]
        next.splice(idx, 1, response.data)
        consultationsByMentorship.value = {
          ...consultationsByMentorship.value,
          [key]: next,
        }
      }
    }
    return response.data
  }

  async function deleteConsultation(id, mentorshipId) {
    await mentorshipsApi.deleteConsultation(id)
    if (mentorshipId) {
      const key = String(mentorshipId)
      consultationsByMentorship.value = {
        ...consultationsByMentorship.value,
        [key]: (consultationsByMentorship.value[key] || []).filter(
          (consultation) => consultation?.id !== id,
        ),
      }
    }
  }

  return {
    // Enums (usable in UI logic)
    MentorshipStatus,

    // State
    mentorships,
    myMentorships,
    publicMentors,
    mentorshipsByApplication,
    currentMentorship,
    consultationsByMentorship,
    consultationsLoading,
    consultationsError,

    // Actions (mapped to API)
    create,
    getMyMentorships,
    getMy,
    getOne,
    changeStatus,
    closeMentorship,
    getPublicMentors,
    getAll,
    getByApplication,
    getConsultations,
    createConsultation,
    updateConsultation,
    deleteConsultation,
  }
})

