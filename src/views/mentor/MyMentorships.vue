<template>
  <div class="page">
    <p class="lead">
      Your active mentorships. Track status and jump to the related application.
    </p>

    <div v-if="loading" class="state">
      Loading…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else-if="rows.length === 0" class="state">
      No active mentorships found.
    </div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Application</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td class="mono">
              #{{ row.applicationId ?? '—' }}
            </td>
            <td>
              <span class="pill" :class="pillClass(row.status)">
                {{ row.status || '—' }}
              </span>
            </td>
            <td class="actions">
              <router-link
                v-if="row.applicationId != null"
                class="btn-sm"
                :to="`/applications/${row.applicationId}`"
              >
                View Application
              </router-link>
              <span v-else class="muted">No application</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMentorshipStore } from '@/stores/mentorship'

const mentorshipStore = useMentorshipStore()
const { myMentorships } = storeToRefs(mentorshipStore)

const loading = ref(true)
const error = ref('')

const rows = computed(() => (myMentorships.value || []).map((m) => ({
  id: m?.id,
  applicationId: m?.applicationId ?? null,
  status: m?.status ?? null,
})))

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    await mentorshipStore.getMyMentorships()
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load mentorships.'
  } finally {
    loading.value = false
  }
}

function pillClass(status) {
  const map = {
    ACTIVE: 'pill--info',
    COMPLETED: 'pill--ok',
    CANCELLED: 'pill--bad',
  }
  return map[status] || 'pill--muted'
}
</script>

<style scoped>
.page {
  width: 100%;
}

.lead {
  margin: 0 0 1.25rem;
  color: #475569;
  line-height: 1.6;
  max-width: 52rem;
}

.state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
}

.state--error {
  color: #b91c1c;
}

.table-wrap {
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.06);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th,
.table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  background: rgba(79, 70, 229, 0.04);
}

.mono {
  font-variant-numeric: tabular-nums;
  color: #64748b;
  white-space: nowrap;
}

.cell-title {
  font-weight: 600;
  color: #0f172a;
}

.muted {
  color: #64748b;
  white-space: nowrap;
}

.pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.pill--muted {
  background: #f1f5f9;
  color: #475569;
}

.pill--info {
  background: #e0e7ff;
  color: #3730a3;
}

.pill--ok {
  background: #d1fae5;
  color: #065f46;
}

.pill--bad {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  text-align: right;
  white-space: nowrap;
}

.btn-sm {
  display: inline-flex;
  padding: 0.45rem 0.85rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  text-decoration: none;
}

.btn-sm:hover {
  background: #4338ca;
}
</style>

