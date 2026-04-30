import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notesApi } from '@/api/notes'

export const useNoteStore = defineStore('note', () => {
  const notes = ref([])
  const notesByApplication = ref({})

  function upsertNote(note, applicationId = null) {
    if (!note?.id) return
    const idx = notes.value.findIndex((n) => n?.id === note.id)
    if (idx === -1) notes.value = [note, ...notes.value]
    else notes.value.splice(idx, 1, note)

    const targetAppId = applicationId ?? note?.applicationId
    if (!targetAppId) return
    const key = String(targetAppId)
    const currentList = notesByApplication.value[key] || []
    const appIdx = currentList.findIndex((n) => n?.id === note.id)
    const nextList = [...currentList]
    if (appIdx === -1) nextList.unshift(note)
    else nextList.splice(appIdx, 1, note)
    notesByApplication.value = {
      ...notesByApplication.value,
      [key]: nextList,
    }
  }

  async function fetchNotesByApplication(appId) {
    const response = await notesApi.getByApplication(appId)
    const data = response.data || []
    notes.value = data
    notesByApplication.value = {
      ...notesByApplication.value,
      [String(appId)]: data,
    }
    return notes.value
  }

  async function createNote(data) {
    const response = await notesApi.create(data)
    upsertNote(response.data, data?.applicationId)
    return response.data
  }

  async function updateNote(id, data) {
    const response = await notesApi.update(id, data)
    upsertNote(response.data, data?.applicationId)
    return response.data
  }

  async function deleteNote(id, applicationId = null) {
    await notesApi.delete(id)
    notes.value = notes.value.filter((n) => n?.id !== id)
    if (applicationId) {
      const key = String(applicationId)
      notesByApplication.value = {
        ...notesByApplication.value,
        [key]: (notesByApplication.value[key] || []).filter((n) => n?.id !== id),
      }
    }
  }

  function getNotesForApplication(appId) {
    return notesByApplication.value[String(appId)] || []
  }

  return {
    notes,
    notesByApplication,
    fetchNotesByApplication,
    getNotesForApplication,
    createNote,
    updateNote,
    deleteNote,
  }
})

