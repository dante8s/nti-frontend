<template>
  <div class="page">
    <p class="lead">
      Усі подані заявки. Змінюйте статус відповідно до етапів розгляду — студент отримає лист на email.
    </p>

    <div class="toolbar">
      <input
        v-model="search"
        type="search"
        class="search"
        placeholder="Пошук за програмою, викликом, статусом…"
        aria-label="Пошук"
      >
      <button type="button" class="btn-refresh" @click="load">
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
            <th>ID</th>
            <th>Програма</th>
            <th>Виклик</th>
            <th>Статус</th>
            <th>Оновлено</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filtered"
            :key="row.id"
            class="table__row"
            @click="openApplication(row.id)"
          >
            <td class="mono">
              #{{ row.id }}
            </td>
            <td>
              <div class="cell-title">
                {{ row.programName }}
              </div>
              <div class="cell-meta">
                {{ row.programType === 'PROGRAM_A' || row.programType === 'A' ? 'Програма A' : 'Програма B' }}
              </div>
            </td>
            <td>{{ row.callTitle }}</td>
            <td>
              <span class="pill" :class="pillClass(row.status)">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="muted">
              {{ formatDt(row.updatedAt) }}
            </td>
            <td class="actions">
              <button
                type="button"
                class="btn-sm"
                @click.stop="openStatus(row)"
              >
                Змінити статус
              </button>
              <!-- <button
                v-if="programDetailRoute(row)"
                type="button"
                class="btn-sm btn-sm--ghost"
                @click.stop="openProgramProposal(row)"
              >
                Open Program Proposal
              </button> -->
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal.show" class="modal-overlay" @click.self="modal.show = false">
      <div class="modal">
        <h3>Заявка #{{ modal.row?.id }}</h3>
        <p class="modal-meta">
          {{ modal.row?.programName }} · {{ modal.row?.callTitle }}
        </p>

        <p>
          Поточний статус:
          <strong>{{ statusLabel(modal.row?.status) }}</strong>
        </p>

        <p v-if="!modal.allowed.length" class="modal-hint">
          Для цього статусу немає дій адміністратора (наприклад, чернетка або очікування дій студента).
        </p>
        <label v-else class="field">
          <span>Новий статус</span>
          <select v-model="modal.nextStatus">
            <option disabled value="">
              Оберіть…
            </option>
            <option v-for="s in modal.allowed" :key="s" :value="s">
              {{ statusLabel(s) }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>Коментар для студента (необов’язково)</span>
          <textarea v-model="modal.comment" rows="3" placeholder="Наприклад, уточнення щодо документів" />
        </label>

        <div class="mentorship">
          <div class="mentorship__head">
            <h4 class="mentorship__title">Mentorship</h4>
            <button type="button" class="btn-sm btn-sm--ghost" @click="openAssignMentor">
              Assign Mentor
            </button>
          </div>

          <div v-if="mentorshipsFor(modal.row?.id).length === 0" class="mentorship__empty">
            No mentorship records for this application.
          </div>
          <div v-else class="mentorship__table-wrap">
            <table class="mentorship__table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in mentorshipsFor(modal.row?.id)" :key="m.id">
                  <td class="cell-title">{{ m.mentorName || '—' }}</td>
                  <td>
                    <span class="pill pill--muted">{{ m.status || '—' }}</span>
                  </td>
                  <td class="muted">
                    {{ formatMentorshipDt(m.startDate || m.createdAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mentorship">
          <div class="mentorship__head">
            <h4 class="mentorship__title">Consultation Notes</h4>
          </div>
          <div v-if="notesFor(modal.row?.id).length === 0" class="mentorship__empty">
            No consultation notes for this application.
          </div>
          <div v-else class="mentorship__table-wrap">
            <table class="mentorship__table">
              <thead>
                <tr>
                  <th>Note</th>
                  <th>Author</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="n in notesFor(modal.row?.id)" :key="n.id">
                  <td>{{ n.content || '—' }}</td>
                  <td>{{ n.createdByName || '—' }}</td>
                  <td class="muted">{{ formatDt(n.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="modal.show = false">
            Скасувати
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!modal.allowed.length || !modal.nextStatus || saving"
            @click="submitStatus"
          >
            {{ saving ? 'Збереження…' : 'Зберегти' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="assign.show" class="modal-overlay" @click.self="assign.show = false">
      <div class="modal">
        <h3>Assign mentor</h3>
        <p class="modal-meta">
          Application #{{ modal.row?.id }}
        </p>

        <div v-if="assign.error" class="modal-hint modal-hint--error">
          {{ assign.error }}
        </div>

        <label class="field">
          <span>Mentor</span>
          <select v-model="assign.mentorUserId" :disabled="assign.saving">
            <option disabled value="">
              Select mentor…
            </option>
            <option v-for="m in (publicMentors || [])" :key="m.id" :value="String(m.id)">
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
            :disabled="assign.saving || !assign.mentorUserId"
            @click="submitAssignMentor"
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
import { useRouter } from 'vue-router'
import { applicationsApi } from '@/api/applications'
import { adminAllowedNextStatuses, statusLabel } from '@/utils/applicationStatus'
import { useAuthStore } from '@/stores/auth'
import { useMentorshipStore } from '@/stores/mentorship'
import { useNoteStore } from '@/stores/note'

const list = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const saving = ref(false)
const auth = useAuthStore()
const router = useRouter()

const mentorshipStore = useMentorshipStore()
const { mentorshipsByApplication, publicMentors } = storeToRefs(mentorshipStore)
const noteStore = useNoteStore()
const { notesByApplication } = storeToRefs(noteStore)

const modal = reactive({
  show: false,
  row: null,
  nextStatus: '',
  comment: '',
  allowed: [],
})

const assign = reactive({
  show: false,
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
  if (!q) return list.value
  return list.value.filter((r) => {
    const blob = [
      r.id,
      r.programName,
      r.callTitle,
      r.status,
      r.programType,
    ].join(' ').toLowerCase()
    return blob.includes(q)
  })
})

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await applicationsApi.getAll()
    list.value = res.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Не вдалося завантажити заявки'
  } finally {
    loading.value = false
  }
}

function pillClass(status) {
  const map = {
    DRAFT: 'pill--muted',
    SUBMITTED: 'pill--info',
    IN_REVIEW: 'pill--warn',
    NEEDS_REVISION: 'pill--orange',
    APPROVED: 'pill--ok',
    REJECTED: 'pill--bad',
  }
  return map[status] || 'pill--muted'
}

function formatDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openStatus(row) {
  modal.row = row
  modal.comment = ''
  modal.allowed = adminAllowedNextStatuses(row.status)
  modal.nextStatus = modal.allowed[0] || ''
  modal.show = true
  mentorshipStore.getByApplication(row.id)
  noteStore.fetchNotesByApplication(row.id)
}

async function submitStatus() {
  if (!modal.row || !modal.nextStatus) return
  saving.value = true
  try {
    await applicationsApi.changeStatus(
      modal.row.id,
      modal.nextStatus,
      modal.comment?.trim() || null,
    )
    const isSuperAdmin = (auth.user?.roles || []).includes('SUPER_ADMIN')
    if (modal.nextStatus === 'APPROVED' && isSuperAdmin) {
      showToast('Схвалено SUPER_ADMIN: запущено онбординг проєкту', 'success')
    } else {
      showToast('Статус оновлено', 'success')
    }
    modal.show = false
    await load()
  } catch (e) {
    const msg = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Недозволений перехід або помилка сервера'
    showToast(msg, 'error')
  } finally {
    saving.value = false
  }
}

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 3200)
}

function mentorshipsFor(applicationId) {
  return mentorshipsByApplication.value?.[applicationId] || []
}

function formatMentorshipDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function openAssignMentor() {
  if (!modal.row?.id) return
  assign.show = true
  assign.mentorUserId = ''
  assign.error = ''
  try {
    if (!publicMentors.value?.length) await mentorshipStore.getPublicMentors()
  } catch (e) {
    assign.error = e.response?.data?.message || 'Failed to load mentors.'
  }
}

async function submitAssignMentor() {
  if (!modal.row?.id || !assign.mentorUserId) return
  assign.saving = true
  assign.error = ''
  try {
    await mentorshipStore.create({
      mentorUserId: Number(assign.mentorUserId),
      applicationId: modal.row.id,
    })
    await mentorshipStore.getByApplication(modal.row.id)
    assign.show = false
    showToast('Ментор призначений', 'success')
  } catch (e) {
    assign.error = e.response?.data?.message
      || (typeof e.response?.data === 'string' ? e.response.data : null)
      || 'Failed to assign mentor.'
  } finally {
    assign.saving = false
  }
}

function notesFor(applicationId) {
  const raw = notesByApplication.value?.[String(applicationId)] || []
  return [...raw].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
}

function openApplication(id) {
  router.push(`/applications/${id}`)
}

function programDetailRoute(row) {
  const programId = row?.call?.program?.id ?? row?.programId
  const rawType = row?.call?.program?.type || row?.programType || ''
  if (!programId || !rawType) return null
  const type = String(rawType).includes('A') ? 'a' : 'b'
  return { name: 'program-detail', params: { type, id: String(programId) } }
}

function openProgramProposal(row) {
  const route = programDetailRoute(row)
  if (!route) return
  router.push(route)
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

.table__row {
  cursor: pointer;
}

.table__row:hover {
  background: rgba(79, 70, 229, 0.04);
}

.mono {
  font-variant-numeric: tabular-nums;
  color: #64748b;
}

.cell-title {
  font-weight: 600;
  color: #0f172a;
}

.cell-meta {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-top: 0.15rem;
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

.pill--warn {
  background: #fef3c7;
  color: #92400e;
}

.pill--orange {
  background: #ffedd5;
  color: #9a3412;
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
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  flex-wrap: wrap;
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

.btn-sm--ghost {
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
}

.btn-sm--ghost:hover {
  background: rgba(79, 70, 229, 0.14);
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
  max-width: 440px;
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

.mentorship {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.mentorship__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.mentorship__title {
  margin: 0;
  font-size: 0.95rem;
  color: #0f172a;
}

.mentorship__empty {
  color: #64748b;
  font-size: 0.88rem;
}

.mentorship__table-wrap {
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
}

.mentorship__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.mentorship__table th,
.mentorship__table td {
  padding: 0.65rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.mentorship__table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  background: rgba(79, 70, 229, 0.04);
}

.mentorship__table td:first-child {
  max-width: 360px;
  white-space: pre-wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 1rem 0;
  font-size: 0.88rem;
  color: #334155;
}

.field select,
.field textarea {
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

.btn-primary {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary:hover {
  background: rgba(79, 70, 229, 0.06);
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
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
