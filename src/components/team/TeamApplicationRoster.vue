<script setup>
import { computed } from 'vue'

const props = defineProps({
  members: {
    type: Array,
    default: () => [],
  },
})

const statusOrder = {
  ACCEPTED: 0,
  PENDING: 1,
  DECLINED: 2,
  REMOVED: 3,
}

function roleLabel(role) {
  if (role === 'LEADER')
    return 'Лідер'
  if (role === 'MEMBER')
    return 'Учасник'
  return role || '—'
}

function statusLabel(status) {
  const map = {
    ACCEPTED: 'Прийнято',
    PENDING: 'Запрошення',
    DECLINED: 'Відхилено',
    REMOVED: 'Вилучено',
  }
  return map[status] || status || '—'
}

const sortedMembers = computed(() => {
  const list = [...(props.members || [])]
  return list.sort((a, b) => {
    const sa = statusOrder[a.inviteStatus] ?? 9
    const sb = statusOrder[b.inviteStatus] ?? 9
    if (sa !== sb)
      return sa - sb
    const ra = a.role === 'LEADER' ? 0 : 1
    const rb = b.role === 'LEADER' ? 0 : 1
    if (ra !== rb)
      return ra - rb
    const na = (a.memberDisplayName || `Користувач #${a.userId}`).toLowerCase()
    const nb = (b.memberDisplayName || `Користувач #${b.userId}`).toLowerCase()
    return na.localeCompare(nb, 'uk')
  })
})

const acceptedCount = computed(() =>
  sortedMembers.value.filter((m) => m.inviteStatus === 'ACCEPTED').length,
)

const hasRows = computed(() => sortedMembers.value.length > 0)
</script>

<template>
  <div v-if="hasRows" class="team-roster">
    <p class="roster-lead">
      Склад команди: <strong>{{ acceptedCount }}</strong>
      {{ acceptedCount === 1 ? 'прийнятий учасник' : 'прийнятих учасників' }}
      <span v-if="sortedMembers.some((m) => m.inviteStatus !== 'ACCEPTED')" class="roster-note">
        (усі записи зі статусами — нижче)
      </span>
    </p>
    <ul class="roster-list" role="list">
      <li v-for="m in sortedMembers" :key="m.id" class="roster-row">
        <div class="roster-main">
          <span class="roster-name">{{ m.memberDisplayName || `Користувач #${m.userId}` }}</span>
          <span class="roster-meta">{{ roleLabel(m.role) }} · {{ statusLabel(m.inviteStatus) }}</span>
        </div>
        <router-link
          v-if="m.inviteStatus === 'ACCEPTED'"
          class="roster-link"
          :to="{ name: 'member-profile', params: { userId: String(m.userId) } }"
        >
          Переглянути профіль
        </router-link>
        <span v-else class="roster-no-link" title="Профіль доступний після підтвердження запрошення">
          —
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.team-roster {
  margin: 0.75rem 0 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.roster-lead {
  margin: 0 0 0.65rem;
  font-size: 0.875rem;
  color: #334155;
  line-height: 1.45;
}

.roster-note {
  color: #64748b;
  font-weight: 400;
  font-size: 0.8rem;
}

.roster-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.roster-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.45rem 0;
  border-bottom: 1px solid #e9eef5;
  font-size: 0.875rem;
}

.roster-row:last-child {
  border-bottom: none;
}

.roster-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.roster-name {
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
}

.roster-meta {
  font-size: 0.78rem;
  color: #64748b;
}

.roster-link {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
  white-space: nowrap;
}

.roster-link:hover {
  text-decoration: underline;
}

.roster-no-link {
  font-size: 0.78rem;
  color: #94a3b8;
  flex-shrink: 0;
}
</style>
