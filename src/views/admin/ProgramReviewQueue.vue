<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>Черга Program B на розгляд</h2>
        <p class="lead">
          Заявки зі статусом PENDING_REVIEW, які очікують рішення адміністратора.
        </p>
      </div>
      <button type="button" class="btn-ghost" :disabled="storeLoading" @click="loadPending">
        Оновити
      </button>
    </div>

    <div v-if="loadError" class="state state--error">
      {{ loadError }}
    </div>
    <div v-else-if="storeLoading && pendingRows.length === 0" class="state">
      Завантаження...
    </div>
    <div v-else-if="pendingRows.length === 0" class="state">
      Черга порожня.
    </div>
    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Program Name</th>
            <th>Organization Name</th>
            <th>Date Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="program in pendingRows" :key="program.id">
            <td class="cell-title">{{ program.name || '—' }}</td>
            <td>
              <router-link
                v-if="organizationDetailLink(program)"
                class="org-link"
                :to="organizationDetailLink(program)"
              >
                {{ organizationName(program) }}
              </router-link>
              <template v-else>
                {{ organizationName(program) }}
              </template>
            </td>
            <td class="muted">{{ formatDt(dateSubmitted(program)) }}</td>
            <td class="actions">
              <button type="button" class="btn-primary" :disabled="storeLoading" @click="openReview(program)">
                Review
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal.show" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>Review Program B</h3>
        <p class="meta">
          {{ modal.program?.name || '—' }}
        </p>
        <div class="details">
          <p>
            <strong>Organization:</strong>
            <router-link
              v-if="organizationDetailLink(modal.program)"
              class="org-link org-link--inline"
              :to="organizationDetailLink(modal.program)"
            >
              {{ organizationName(modal.program) }}
            </router-link>
            <template v-else>
              {{ organizationName(modal.program) }}
            </template>
          </p>
          <p><strong>Submitted:</strong> {{ formatDt(dateSubmitted(modal.program)) }}</p>
          <p><strong>Status:</strong> <ProgramStatusBadge :status="modal.program?.status" /></p>
        </div>

        <label class="field">
          <span>Опис програми</span>
          <textarea :value="modal.program?.description || '—'" rows="4" readonly />
        </label>

        <div v-if="modal.program?.id" class="requirements">
          <p class="requirements__title">
            Program B Requirements
          </p>

          <div v-if="canManageRequirements" class="requirements__upload-grid">
            <label class="requirements__file-btn">
              Upload Specification
              <input
                type="file"
                class="requirements__file-input"
                :disabled="isRequirementActionLoading(modal.program.id)"
                @change="onSpecificationSelected(modal.program, $event)"
              >
            </label>

            <label class="requirements__file-btn">
              Upload Budget
              <input
                type="file"
                class="requirements__file-input"
                :disabled="isRequirementActionLoading(modal.program.id)"
                @change="onBudgetSelected(modal.program, $event)"
              >
            </label>
          </div>

          <p v-if="requirementsByProgram[modal.program.id]?.specificationName" class="requirements__row">
            <span class="requirements__name">
              Specification: {{ requirementsByProgram[modal.program.id].specificationName }}
            </span>
            <span class="requirements__actions">
              <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(modal.program.id)" @click="viewRequirement(modal.program.id, 'specification')">
                View
              </button>
              <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(modal.program.id)" @click="downloadRequirement(modal.program.id, 'specification')">
                Download
              </button>
            </span>
          </p>

          <p v-if="requirementsByProgram[modal.program.id]?.budgetName" class="requirements__row">
            <span class="requirements__name">
              Budget: {{ requirementsByProgram[modal.program.id].budgetName }}
            </span>
            <span class="requirements__actions">
              <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(modal.program.id)" @click="viewRequirement(modal.program.id, 'budget')">
                View
              </button>
              <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(modal.program.id)" @click="downloadRequirement(modal.program.id, 'budget')">
                Download
              </button>
            </span>
          </p>

          <p
            v-if="!requirementsByProgram[modal.program.id]?.specificationName && !requirementsByProgram[modal.program.id]?.budgetName"
            class="meta"
          >
            No requirement files uploaded yet.
          </p>
        </div>

        <div v-if="existingAdminComment" class="current-comment">
          <p class="current-comment__title">
            Current Comment
          </p>
          <p class="current-comment__body">
            {{ existingAdminComment }}
          </p>
        </div>

        <label class="field">
          <span>adminComment</span>
          <textarea
            v-model.trim="modal.adminComment"
            rows="4"
            placeholder="Коментар для організації (необов'язково)"
          />
        </label>

        <p v-if="actionError" class="error-text">
          {{ actionError }}
        </p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" :disabled="submitting" @click="closeModal">
            Закрити
          </button>
          <button type="button" class="btn-primary" :disabled="submitting" @click="submitReview('APPROVED')">
            Approve
          </button>
          <button type="button" class="btn-warn" :disabled="submitting" @click="submitReview('NEEDS_REVISION')">
            Return for Revision
          </button>
          <button type="button" class="btn-danger" :disabled="submitting" @click="submitReview('REJECTED')">
            Reject
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useProgramStore } from '@/stores/program'
import { useOrganizationStore } from '@/stores/organization'
import { useAuthStore } from '@/stores/auth'
import ProgramStatusBadge from '@/components/ProgramStatusBadge.vue'
import { apiErrorMessage } from '@/utils/apiError'

const programStore = useProgramStore()
const orgStore = useOrganizationStore()
const authStore = useAuthStore()
const { pendingPrograms, loading: storeLoading } = storeToRefs(programStore)

const loadError = ref('')
const actionError = ref('')
const submitting = ref(false)
const requirementsByProgram = ref({})
const requirementsLoadingByProgram = ref({})

const modal = reactive({
  show: false,
  program: null,
  adminComment: '',
})

const pendingRows = computed(() =>
  (pendingPrograms.value || [])
    .filter((program) => program?.status === 'PENDING_REVIEW')
    .sort((a, b) => new Date(dateSubmitted(b) || 0) - new Date(dateSubmitted(a) || 0)),
)

const existingAdminComment = computed(() => {
  const c = modal.program?.adminComment
  if (c == null || typeof c !== 'string') return ''
  return c.trim()
})
const canManageRequirements = computed(() =>
  (authStore.roles || []).some((role) => ['FIRM', 'ADMIN', 'SUPER_ADMIN'].includes(role)),
)

onMounted(loadPending)

async function loadPending() {
  loadError.value = ''
  try {
    await programStore.getPendingReview()
  } catch (error) {
    loadError.value = apiErrorMessage(error, 'Не вдалося завантажити чергу на розгляд')
  }
}

async function openReview(program) {
  modal.program = program
  modal.adminComment = ''
  actionError.value = ''
  await loadProgramRequirements(program?.id)
  modal.show = true
}

function closeModal() {
  modal.show = false
  modal.program = null
  modal.adminComment = ''
  actionError.value = ''
}

async function submitReview(status) {
  if (!modal.program?.id) return
  submitting.value = true
  actionError.value = ''
  try {
    await programStore.reviewProgram(modal.program.id, {
      status,
      adminComment: modal.adminComment || null,
    })
    closeModal()
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'Не вдалося виконати review')
  } finally {
    submitting.value = false
  }
}

function organizationName(program) {
  return (
    program?.organizationName
    || program?.organization?.name
    || program?.organizationTitle
    || '—'
  )
}

function organizationDetailLink(program) {
  const id = program?.organizationId ?? program?.organization?.id
  if (id == null || id === '') return null
  return { name: 'OrganizationDetails', params: { id: String(id) } }
}

/** Date shown in “Date Submitted” — use DTO updatedAt. */
function dateSubmitted(program) {
  return program?.updatedAt || null
}

function formatDt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadProgramRequirements(programId) {
  if (!programId) return
  try {
    const data = await orgStore.fetchRequirements(programId)
    requirementsByProgram.value = { ...requirementsByProgram.value, [programId]: data || {} }
  } catch {
    requirementsByProgram.value = { ...requirementsByProgram.value, [programId]: {} }
  }
}

function isRequirementActionLoading(programId) {
  return !!requirementsLoadingByProgram.value[programId]
}

function setRequirementActionLoading(programId, isLoading) {
  requirementsLoadingByProgram.value = {
    ...requirementsLoadingByProgram.value,
    [programId]: isLoading,
  }
}

async function onSpecificationSelected(program, event) {
  const file = event?.target?.files?.[0]
  if (!program?.id || !file) return
  setRequirementActionLoading(program.id, true)
  try {
    const updated = await orgStore.uploadSpecFile(program.id, file)
    requirementsByProgram.value = { ...requirementsByProgram.value, [program.id]: updated || {} }
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'Failed to upload specification')
  } finally {
    event.target.value = ''
    setRequirementActionLoading(program.id, false)
  }
}

async function onBudgetSelected(program, event) {
  const file = event?.target?.files?.[0]
  if (!program?.id || !file) return
  setRequirementActionLoading(program.id, true)
  try {
    const updated = await orgStore.uploadBudgetFile(program.id, file)
    requirementsByProgram.value = { ...requirementsByProgram.value, [program.id]: updated || {} }
  } catch (error) {
    actionError.value = apiErrorMessage(error, 'Failed to upload budget')
  } finally {
    event.target.value = ''
    setRequirementActionLoading(program.id, false)
  }
}

function filenameFromContentDisposition(contentDisposition, fallback) {
  if (!contentDisposition) return fallback
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]
  return fallback
}

async function openRequirement(programId, fileType, inline) {
  if (!programId) return
  setRequirementActionLoading(programId, true)
  actionError.value = ''
  try {
    const response = fileType === 'specification'
      ? await orgStore.downloadSpecificationFile(programId, inline)
      : await orgStore.downloadBudgetFile(programId, inline)

    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: response.headers?.['content-type'] || 'application/octet-stream' })
    const objectUrl = URL.createObjectURL(blob)

    if (inline) {
      window.open(objectUrl, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
      return
    }

    const fallback = `${fileType}-${programId}`
    const filename = filenameFromContentDisposition(response.headers?.['content-disposition'], fallback)
    const link = document.createElement('a')
    link.style.display = 'none'
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    actionError.value = apiErrorMessage(error, `Failed to ${inline ? 'view' : 'download'} ${fileType}`)
  } finally {
    setRequirementActionLoading(programId, false)
  }
}

async function viewRequirement(programId, fileType) {
  await openRequirement(programId, fileType, true)
}

async function downloadRequirement(programId, fileType) {
  await openRequirement(programId, fileType, false)
}
</script>

<style scoped>
.page {
  width: 100%;
}

.page-head {
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.page-head h2 {
  margin: 0 0 0.4rem;
}

.lead {
  margin: 0;
  color: #475569;
  line-height: 1.6;
  max-width: 52rem;
}

.state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
}

.state--error,
.error-text {
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

.cell-title {
  font-weight: 600;
}

.muted {
  color: #64748b;
  white-space: nowrap;
}

.actions {
  text-align: right;
}

.btn-primary,
.btn-secondary,
.btn-ghost,
.btn-warn,
.btn-danger {
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  border: none;
  background: #4f46e5;
  color: white;
  padding: 0.52rem 0.9rem;
}

.btn-secondary {
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
  padding: 0.52rem 0.9rem;
}

.btn-ghost {
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
  padding: 0.52rem 0.9rem;
}

.btn-warn {
  border: none;
  background: #d97706;
  color: white;
  padding: 0.52rem 0.9rem;
}

.btn-danger {
  border: none;
  background: #dc2626;
  color: white;
  padding: 0.52rem 0.9rem;
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-ghost:disabled,
.btn-warn:disabled,
.btn-danger:disabled {
  opacity: 0.6;
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
  max-width: 680px;
  background: white;
  border-radius: 16px;
  padding: 1.4rem;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.modal h3 {
  margin: 0 0 0.35rem;
}

.meta {
  margin: 0 0 0.8rem;
  color: #64748b;
}

.details {
  margin-bottom: 0.8rem;
  color: #334155;
}

.details p {
  margin: 0.25rem 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.8rem 0;
}

.field textarea {
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font: inherit;
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.org-link {
  color: #4f46e5;
  font-weight: 600;
  text-decoration: none;
}

.org-link:hover {
  text-decoration: underline;
}

.org-link--inline {
  margin-left: 0.35rem;
}

.current-comment {
  margin: 0.8rem 0;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.current-comment__title {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.current-comment__body {
  margin: 0;
  color: #334155;
  line-height: 1.5;
  white-space: pre-wrap;
}

.requirements {
  margin: 0.8rem 0;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.65rem;
  background: #f8fafc;
}

.requirements__title {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
}

.requirements__upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.55rem;
}

.requirements__file-btn {
  border: 1px solid rgba(79, 70, 229, 0.25);
  background: #fff;
  color: #4338ca;
  border-radius: 10px;
  padding: 0.4rem 0.75rem;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;
}

.requirements__file-input {
  display: none;
}

.requirements__row {
  margin: 0.35rem 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.requirements__name {
  font-size: 0.84rem;
  color: #334155;
  word-break: break-word;
}

.requirements__actions {
  display: flex;
  gap: 0.4rem;
}
</style>
