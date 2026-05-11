import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mentorshipsApi } from '@/api/mentorships'

export const MentorshipStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
})

export const useMentorshipStore = defineStore('mentorship', () => {
  const mentorships = ref([])
  const myMentorships = ref([])
  const publicMentors = ref([])
  const mentorshipsByApplication = ref({})
  const currentMentorship = ref(null)

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

  return {
    // Enums (usable in UI logic)
    MentorshipStatus,

    // State
    mentorships,
    myMentorships,
    publicMentors,
    mentorshipsByApplication,
    currentMentorship,

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
  }
})

