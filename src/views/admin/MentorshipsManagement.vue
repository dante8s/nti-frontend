<template>
  <div class="page">
    <p class="lead">
      Усі менторства (для адміністраторів). Тут можна закривати активні менторства.
    </p>

    <div class="toolbar">
      <input
        v-model="search"
        type="search"
        class="search"
        placeholder="Пошук за ментором, статусом, заявкою…"
        aria-label="Пошук"
      >
      <button type="button" class="btn-sm" :disabled="loading" @click="openAssign">
        Assign Mentorship
      </button>
      <button type="button" class="btn-refresh" :disabled="loading" @click="load">
        Оновити
      </button>
    </div>

    <div v-if="loading" class="state">
      Завантаження…
    </div>
    <div v-else-if="error" class="state state--error">
      {{ error }}
    </div>
    <div v-else-if="filtered.length === 0" class="state">
      Нічого не знайдено.
    </div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Mentorship ID</th>
            <th>Mentor</th>
            <th>Status</th>
            <th>Application</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filtered" :key="row.id">
            <td class="mono">
              {{ row.id }}
            </td>
            <td>
              <div class="cell-title">
                {{ row.mentorName || '—' }}
              </div>
            </td>
            <td>
              <span class="pill" :class="pillClass(row.status)">{{ row.status }}</span>
            </td>
            <td>
              <router-link class="link-view-app" :to="`/applications/${row.applicationId}`">
                View application
              </router-link>
            </td>
            <td class="actions">
              <div class="row-actions">
                <select
                  v-model="nextStatus[row.id]"
                  class="select"
                  :disabled="savingRowId === row.id || row.status !== MentorshipStatus.ACTIVE"
                >
                  <option disabled value="">
                    Close as…
                  </option>
                  <option :value="MentorshipStatus.COMPLETED">
                    COMPLETED
                  </option>
                  <option :value="MentorshipStatus.CANCELLED">
                    CANCELLED
                  </option>
                </select>
                <button
                  type="button"
                  class="btn-sm"
                  :disabled="row.status !== MentorshipStatus.ACTIVE || !nextStatus[row.id] || savingRowId === row.id"
                  @click="close(row)"
                >
                  {{ savingRowId === row.id ? 'Збереження…' : 'Change Status' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="assign.show" class="modal-overlay" @click.self="assign.show = false">
      <div class="modal">
        <h3>Assign mentorship</h3>
        <p class="modal-meta">
          Choose application and mentor.
        </p>

        <p v-if="assign.error" class="modal-hint modal-hint--error">
          {{ assign.error }}
        </p>

        <label class="field">
          <span>Application</span>
          <select v-model="assign.applicationId" :disabled="assign.saving">
            <option disabled value="">
              Select application…
            </option>
            <option v-for="app in applications" :key="app.id" :value="String(app.id)">
              #{{ app.id }} — {{ app.programName }} ({{ app.callTitle }})
            </option>
          </select>
        </label>

        <label class="field">
          <span>Mentor</span>
          <select v-model="assign.mentorUserId" :disabled="assign.saving">
            <option disabled value="">
              Select mentor…
            </option>
            <option v-for="m in publicMentors" :key="m.id" :value="String(m.id)">
              {{ m.name }}
            </option>
          </select>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" :disabled="assign.saving" @click="assign.show = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="assign.saving || !assign.applicationId || !assign.mentorUserId"
            @click="submitAssign"
          >
            {{ assign.saving ? 'Assigning…' : 'Assign' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { applicationsApi } from '@/api/applications'
import { MentorshipStatus, useMentorshipStore } from '@/stores/mentorship'

const mentorshipStore = useMentorshipStore()
const { mentorships, publicMentors } = storeToRefs(mentorshipStore)

const loading = ref(true)
const error = ref('')
const search = ref('')
const savingRowId = ref(null)
const applications = ref([])

const nextStatus = reactive({})

const assign = reactive({
  show: false,
  applicationId: '',
  mentorUserId: '',
  saving: false,
  error: '',
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success',
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = mentorships.value || []
  if (!q) return list
  return list.filter((m) => {
    const blob = [m?.id, m?.mentorName, m?.applicationId, m?.status].join(' ').toLowerCase()
    return blob.includes(q)
  })
})

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([
      mentorshipStore.getAll(),
      mentorshipStore.getPublicMentors(),
      loadApplications(),
    ])
    for (const m of mentorships.value || []) {
      if (m?.id && nextStatus[m.id] === undefined) nextStatus[m.id] = ''
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Не вдалося завантажити менторства'
  } finally {
    loading.value = false
  }
}

async function loadApplications() {
  const res = await applicationsApi.getAll()
  applications.value = res.data || []
}

function pillClass(status) {
  const map = {
    ACTIVE: 'pill--info',
    COMPLETED: 'pill--ok',
    CANCELLED: 'pill--bad',
  }
  return map[status] || 'pill--muted'
}

async function close(row) {
  if (!row?.id) return
  const status = nextStatus[row.id]
  if (!status || status === MentorshipStatus.ACTIVE) return

  savingRowId.value = row.id
  try {
    await mentorshipStore.closeMentorship(row.id, status)
    showToast('Статус оновлено', 'success')
    nextStatus[row.id] = ''
  } catch (e) {
    const msg = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Помилка оновлення статусу'
    showToast(msg, 'error')
  } finally {
    savingRowId.value = null
  }
}

function openAssign() {
  assign.show = true
  assign.applicationId = ''
  assign.mentorUserId = ''
  assign.error = ''
}

async function submitAssign() {
  if (!assign.applicationId || !assign.mentorUserId) return
  assign.saving = true
  assign.error = ''
  try {
    await mentorshipStore.create({
      applicationId: Number(assign.applicationId),
      mentorUserId: Number(assign.mentorUserId),
    })
    assign.show = false
    showToast('Менторство призначено', 'success')
  } catch (e) {
    assign.error = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Не вдалося призначити менторство'
  } finally {
    assign.saving = false
  }
}

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 3200)
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

.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search {
  flex: 1;
  min-width: 200px;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.95);
}

.btn-refresh {
  padding: 0.65rem 1.1rem;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: white;
  font-weight: 600;
  color: #4338ca;
  cursor: pointer;
}

.btn-refresh:hover {
  background: rgba(79, 70, 229, 0.06);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-view-app {
  color: #4338ca;
  font-weight: 600;
  text-decoration: none;
}

.link-view-app:hover {
  text-decoration: underline;
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

.pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
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

.row-actions {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
}

.select {
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.22);
  background: white;
  font: inherit;
  font-size: 0.85rem;
}

.btn-sm {
  padding: 0.45rem 0.85rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-sm:hover {
  background: #4338ca;
}

.btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.modal h3 {
  margin: 0 0 0.35rem;
}

.modal-meta {
  margin: 0 0 1rem;
  color: #64748b;
  font-size: 0.9rem;
}

.modal-hint {
  margin: 0 0 1rem;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.88rem;
}

.modal-hint--error {
  background: #fee2e2;
  color: #991b1b;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 1rem 0;
  font-size: 0.88rem;
  color: #334155;
}

.field select {
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.06);
}

.btn-primary {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 0.65rem 1.15rem;
  border-radius: 12px;
  font-size: 0.88rem;
  z-index: 120;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
}

.toast.success {
  background: #059669;
  color: white;
}

.toast.error {
  background: #dc2626;
  color: white;
}
</style>

