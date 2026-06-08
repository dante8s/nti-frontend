import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsApi } from '@/api/notifications'

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0)
  const notifications = ref([])
  let pollInterval = null

  async function fetchUnreadCount() {
    try {
      const { data } = await notificationsApi.getUnreadCount()
      unreadCount.value = data.count
    } catch {
      // silent — user may not be logged in yet
    }
  }

  async function fetchAll() {
    try {
      const { data } = await notificationsApi.getAll()
      notifications.value = data
      unreadCount.value = data.filter(n => !n.read).length
    } catch {
      notifications.value = []
    }
  }

  async function markRead(id) {
    await notificationsApi.markRead(id)
    const n = notifications.value.find(n => n.id === id)
    if (n && !n.read) {
      n.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllRead() {
    await notificationsApi.markAllRead()
    notifications.value.forEach(n => (n.read = true))
    unreadCount.value = 0
  }

  function startPolling() {
    fetchUnreadCount()
    pollInterval = setInterval(fetchUnreadCount, 30_000)
  }

  function stopPolling() {
    if (pollInterval) clearInterval(pollInterval)
  }

  return { unreadCount, notifications, fetchAll, markRead, markAllRead, startPolling, stopPolling }
})
