<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'

const notif     = useNotificationsStore()
const router    = useRouter()
const open      = ref(false)
const panelRef  = ref(null)

function toggle() {
  open.value = !open.value
  if (open.value) notif.fetchAll()
}

function close() {
  open.value = false
}

function onDocClick(e) {
  if (panelRef.value && !panelRef.value.contains(e.target)) close()
}

async function clickNotification(n) {
  if (!n.read) await notif.markRead(n.id)
  close()
  if (n.link) router.push(n.link)
}

function formatTime(raw) {
  const d    = new Date(raw)
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return Math.floor(diff / 60) + ' min ago'
  if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago'
  return d.toLocaleDateString('en-GB')
}

onMounted(() => {
  notif.startPolling()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  notif.stopPolling()
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="bell" ref="panelRef">
    <button class="bell__btn" :aria-label="'Notifications'" @click="toggle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="notif.unreadCount > 0" class="bell__badge">
        {{ notif.unreadCount > 99 ? '99+' : notif.unreadCount }}
      </span>
    </button>

    <div v-if="open" class="bell__panel">
      <div class="bell__header">
        <span class="bell__panel-title">Notifications</span>
        <button
          v-if="notif.unreadCount > 0"
          class="bell__read-all"
          @click="notif.markAllRead()"
        >Mark all as read</button>
      </div>

      <div class="bell__list">
        <p v-if="!notif.notifications.length" class="bell__empty">
          No notifications
        </p>
        <button
          v-for="n in notif.notifications"
          :key="n.id"
          class="bell__item"
          :class="{ 'bell__item--unread': !n.read }"
          @click="clickNotification(n)"
        >
          <span class="bell__dot" v-if="!n.read" />
          <div class="bell__item-body">
            <p class="bell__item-title">{{ n.title }}</p>
            <p class="bell__item-msg">{{ n.message }}</p>
            <p class="bell__item-time">{{ formatTime(n.createdAt) }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bell { position: relative; }

.bell__btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(79,70,229,.2);
  background: white;
  color: #475569;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.bell__btn:hover { background: rgba(79,70,229,.06); color: #3730a3; }

.bell__badge {
  position: absolute;
  top: -5px; right: -5px;
  min-width: 18px; height: 18px;
  padding: 0 4px;
  background: #ef4444;
  color: #fff;
  font-size: .68rem;
  font-weight: 700;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.bell__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 340px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(15,23,42,.12);
  z-index: 100;
  overflow: hidden;
}

.bell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .9rem 1.1rem .7rem;
  border-bottom: 1px solid #f1f5f9;
}

.bell__panel-title {
  font-weight: 800;
  font-size: .95rem;
  color: #0f172a;
}

.bell__read-all {
  font-size: .78rem;
  color: #6366f1;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.bell__read-all:hover { text-decoration: underline; }

.bell__list {
  max-height: 380px;
  overflow-y: auto;
}

.bell__empty {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: .9rem;
}

.bell__item {
  display: flex;
  align-items: flex-start;
  gap: .65rem;
  width: 100%;
  padding: .8rem 1.1rem;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid #f8fafc;
  transition: background .12s;
}
.bell__item:hover { background: #f8fafc; }
.bell__item--unread { background: rgba(99,102,241,.04); }
.bell__item--unread:hover { background: rgba(99,102,241,.08); }

.bell__dot {
  flex-shrink: 0;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #6366f1;
  margin-top: 6px;
}

.bell__item-body { flex: 1; min-width: 0; }

.bell__item-title {
  margin: 0 0 2px;
  font-weight: 700;
  font-size: .88rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bell__item-msg {
  margin: 0 0 4px;
  font-size: .82rem;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bell__item-time {
  margin: 0;
  font-size: .75rem;
  color: #94a3b8;
}
</style>
