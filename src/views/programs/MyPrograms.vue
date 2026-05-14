<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>Мої програми B</h2>
        <p class="lead">
          Створюйте, редагуйте та відстежуйте статус ваших пропозицій Program B.
        </p>
      </div>
      <button type="button" class="btn-primary" @click="openCreateForm">
        + Нова пропозиція
      </button>
    </div>

    <div v-if="feedbackMessage" class="notice" :class="feedbackTypeClass">
      {{ feedbackMessage }}
    </div>

    <section class="panel">
      <h3>{{ form.editMode ? 'Редагувати пропозицію' : 'Нова пропозиція' }}</h3>
      <form class="form" @submit.prevent="saveProgram">
        <label class="field">
          <span>Назва</span>
          <input v-model.trim="form.name" type="text" placeholder="Вкажіть назву програми" />
        </label>

        <label class="field">
          <span>Опис</span>
          <textarea
            v-model.trim="form.description"
            rows="4"
            placeholder="Опишіть ідею, цілі та очікуваний результат"
          />
        </label>

        <p v-if="formError" class="error-text">
          {{ formError }}
        </p>

        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="storeLoading">
            {{ form.editMode ? 'Оновити' : 'Створити' }}
          </button>
          <button v-if="form.editMode" type="button" class="btn-ghost" :disabled="storeLoading" @click="resetForm">
            Скасувати редагування
          </button>
        </div>
      </form>
    </section>

    <section class="panel">
      <h3>Програми організації</h3>
      <div v-if="loading" class="state">
        Завантаження...
      </div>
      <div v-else-if="loadError" class="state state--error">
        {{ loadError }}
      </div>
      <div v-else-if="programs.length === 0" class="state">
        Пропозицій ще немає.
      </div>
      <div v-else class="program-list">
        <article v-for="program in programs" :key="program.id" class="program-card">
          <div class="program-card__head">
            <div>
              <h4>{{ program.name || '—' }}</h4>
              <p class="meta">
                Створено: {{ formatDate(program.updatedAt || program.createdAt) }}
              </p>
            </div>
            <ProgramStatusBadge :status="program.status" />
          </div>

          <p class="description">
            {{ program.description || '—' }}
          </p>

          <div
            v-if="(program.status === 'NEEDS_REVISION' || program.status === 'REJECTED') && program.adminComment"
            class="feedback"
          >
            <p class="feedback__title">
              Feedback from Admin
            </p>
            <p class="feedback__text">
              {{ program.adminComment }}
            </p>
          </div>

          <div class="requirements">
            <p class="requirements__title">
              Program B Requirements
            </p>

            <div v-if="canManageRequirements" class="requirements__upload-grid">
              <label class="requirements__file-btn">
                Upload Specification
                <input
                  type="file"
                  class="requirements__file-input"
                  :disabled="isRequirementActionLoading(program.id)"
                  @change="onSpecificationSelected(program, $event)"
                >
              </label>

              <label class="requirements__file-btn">
                Upload Budget
                <input
                  type="file"
                  class="requirements__file-input"
                  :disabled="isRequirementActionLoading(program.id)"
                  @change="onBudgetSelected(program, $event)"
                >
              </label>
            </div>

            <p v-if="requirementsByProgram[program.id]?.specificationName" class="requirements__row">
              <span class="requirements__name">
                Specification: {{ requirementsByProgram[program.id].specificationName }}
              </span>
              <span class="requirements__actions">
                <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(program.id)" @click="viewRequirement(program.id, 'specification')">
                  View
                </button>
                <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(program.id)" @click="downloadRequirement(program.id, 'specification')">
                  Download
                </button>
              </span>
            </p>

            <p v-if="requirementsByProgram[program.id]?.budgetName" class="requirements__row">
              <span class="requirements__name">
                Budget: {{ requirementsByProgram[program.id].budgetName }}
              </span>
              <span class="requirements__actions">
                <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(program.id)" @click="viewRequirement(program.id, 'budget')">
                  View
                </button>
                <button type="button" class="btn-ghost" :disabled="isRequirementActionLoading(program.id)" @click="downloadRequirement(program.id, 'budget')">
                  Download
                </button>
              </span>
            </p>

            <p
              v-if="!requirementsByProgram[program.id]?.specificationName && !requirementsByProgram[program.id]?.budgetName"
              class="meta"
            >
              No requirement files uploaded yet.
            </p>
          </div>

          <div class="program-calls">
            <div class="program-calls__head">
              <p class="program-calls__title">
                Calls
              </p>
              <button
                type="button"
                class="btn-ghost"
                :disabled="storeLoading"
                @click="toggleProgramCalls(program.id)"
              >
                {{ expandedProgramIds[program.id] ? 'Hide Calls' : 'Show Calls' }}
              </button>
            </div>

            <div v-if="expandedProgramIds[program.id]" class="program-calls__body">
              <p v-if="getProgramCalls(program.id).length === 0" class="meta">
                No calls found for this program.
              </p>

              <article
                v-for="call in getProgramCalls(program.id)"
                :key="call.id"
                class="call-card"
              >
                <div class="call-card__head">
                  <div>
                    <p class="call-card__title">
                      {{ call.title || `Call #${call.id}` }}
                    </p>
                    <p class="meta">
                      Deadline: {{ formatDate(call.deadline) }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn-ghost"
                    :disabled="storeLoading"
                    @click="toggleCallApplications(call.id)"
                  >
                    {{ expandedCallIds[call.id] ? 'Hide Applications' : 'Show Applications' }}
                  </button>
                </div>

                <div v-if="expandedCallIds[call.id]" class="call-card__body">
                  <p v-if="getCallApplications(call.id).length === 0" class="meta">
                    No applications for this call.
                  </p>
                  <div v-else class="applications-list">
                    <article
                      v-for="app in getCallApplications(call.id)"
                      :key="app.id"
                      class="application-item"
                    >
                      <div>
                        <p class="application-item__title">
                          {{ app.applicantName || app.studentName || app.userName || `Application #${app.id}` }}
                        </p>
                        <p class="meta">
                          Submitted: {{ formatDate(app.createdAt || app.updatedAt) }}
                        </p>
                        <p class="meta">
                          Status: {{ app.status || '—' }}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="btn-primary"
                        @click="openApplicationDetails(app.id)"
                      >
                        View Application
                      </button>
                    </article>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div class="program-actions">
            <button
              v-if="canEdit(program)"
              type="button"
              class="btn-ghost"
              :disabled="storeLoading"
              @click="openEditForm(program)"
            >
              Редагувати
            </button>

            <button
              v-if="canSubmit(program)"
              type="button"
              class="btn-primary"
              :disabled="storeLoading"
              @click="submitProgramForReview(program)"
            >
              Submit for Review
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useProgramStore } from '@/stores/program'
import { useOrganizationStore } from '@/stores/organization'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/utils/apiError'
import ProgramStatusBadge from '@/components/ProgramStatusBadge.vue'

const programStore = useProgramStore()
const orgStore = useOrganizationStore()
const authStore = useAuthStore()
const router = useRouter()
const {
  myPrograms,
  callsByProgram,
  applicationsByCall,
  loading: storeLoading,
} = storeToRefs(programStore)

const loading = ref(true)
const loadError = ref('')
const formError = ref('')
const feedbackMessage = ref('')
const feedbackType = ref('success')
const requirementsByProgram = ref({})
const requirementsLoadingByProgram = ref({})
const expandedProgramIds = ref({})
const expandedCallIds = ref({})

const form = reactive({
  editMode: false,
  id: null,
  name: '',
  description: '',
})

const programs = computed(() =>
  [...(myPrograms.value || [])].sort((a, b) => {
    const left = new Date(b?.updatedAt || b?.createdAt || 0).getTime()
    const right = new Date(a?.updatedAt || a?.createdAt || 0).getTime()
    return left - right
  }),
)

const feedbackTypeClass = computed(() =>
  feedbackType.value === 'error' ? 'notice--error' : 'notice--success',
)
const canManageRequirements = computed(() =>
  (authStore.roles || []).some((role) => ['FIRM', 'ADMIN', 'SUPER_ADMIN'].includes(role)),
)

onMounted(loadPrograms)

async function loadPrograms() {
  loading.value = true
  loadError.value = ''
  try {
    await programStore.fetchMyPrograms()
    const programRows = myPrograms.value || []
    await Promise.all(programRows.map((program) => loadProgramRequirements(program.id)))
    await Promise.all(programRows.map((program) => programStore.fetchCallsForProgram(program.id)))
  } catch (error) {
    loadError.value = apiErrorMessage(error, 'Не вдалося завантажити програми')
  } finally {
    loading.value = false
  }
}

function getProgramCalls(programId) {
  return callsByProgram.value?.[programId] || []
}

function getCallApplications(callId) {
  return applicationsByCall.value?.[callId] || []
}

async function toggleProgramCalls(programId) {
  if (!programId) return
  const isOpen = !!expandedProgramIds.value[programId]
  expandedProgramIds.value = {
    ...expandedProgramIds.value,
    [programId]: !isOpen,
  }
  if (isOpen) return
  await programStore.fetchCallsForProgram(programId)
}

async function toggleCallApplications(callId) {
  if (!callId) return
  const isOpen = !!expandedCallIds.value[callId]
  expandedCallIds.value = {
    ...expandedCallIds.value,
    [callId]: !isOpen,
  }
  if (isOpen) return
  await programStore.fetchApplicationsForCall(callId)
}

function openApplicationDetails(applicationId) {
  if (!applicationId) return
  router.push({ name: 'application-details', params: { id: String(applicationId) } })
}

function openCreateForm() {
  resetForm()
}

function openEditForm(program) {
  if (!canEdit(program)) {
    setFeedback('Редагування доступне лише для DRAFT або NEEDS_REVISION', 'error')
    return
  }
  form.editMode = true
  form.id = program.id
  form.name = program.name || ''
  form.description = program.description || ''
  formError.value = ''
}

function resetForm() {
  form.editMode = false
  form.id = null
  form.name = ''
  form.description = ''
  formError.value = ''
}

function canEdit(program) {
  return program?.status === 'DRAFT' || program?.status === 'NEEDS_REVISION'
}

function canSubmit(program) {
  return program?.status === 'DRAFT' || program?.status === 'NEEDS_REVISION'
}

function validateForm() {
  if (!form.name.trim() || !form.description.trim()) {
    formError.value = 'Поля "Назва" та "Опис" є обовʼязковими'
    return false
  }
  formError.value = ''
  return true
}

async function saveProgram() {
  if (!validateForm()) return
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
  }
  try {
    if (form.editMode && form.id != null) {
      const current = myPrograms.value.find((p) => p.id === form.id)
      if (!canEdit(current)) {
        formError.value = 'Цю програму більше не можна редагувати'
        return
      }
      await programStore.updateProgramB(form.id, payload)
      setFeedback('Пропозицію оновлено', 'success')
    } else {
      await programStore.submitProgramB(payload)
      setFeedback('Пропозицію створено як чернетку', 'success')
    }
    resetForm()
  } catch (error) {
    formError.value = apiErrorMessage(error, 'Не вдалося зберегти пропозицію')
  }
}

async function submitProgramForReview(program) {
  if (!canSubmit(program)) return
  const confirmed = confirm(
    'Once submitted, you cannot edit this program until an admin reviews it.',
  )
  if (!confirmed) return

  try {
    await programStore.submitForReview(program.id)
    setFeedback('Програму надіслано на перевірку', 'success')
  } catch (error) {
    setFeedback(apiErrorMessage(error, 'Не вдалося надіслати на перевірку'), 'error')
  }
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
    setFeedback('Specification file uploaded', 'success')
  } catch (error) {
    setFeedback(apiErrorMessage(error, 'Failed to upload specification'), 'error')
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
    setFeedback('Budget file uploaded', 'success')
  } catch (error) {
    setFeedback(apiErrorMessage(error, 'Failed to upload budget'), 'error')
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
    setFeedback(apiErrorMessage(error, `Failed to ${inline ? 'view' : 'download'} ${fileType}`), 'error')
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

function setFeedback(message, type = 'success') {
  feedbackMessage.value = message
  feedbackType.value = type
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<style scoped>
.page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.page-head h2 {
  margin: 0 0 0.4rem;
}

.lead {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.panel {
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.12);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05);
  padding: 1.1rem;
}

.panel h3 {
  margin: 0 0 0.9rem;
  font-size: 1.02rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field input,
.field textarea {
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 0.65rem;
  font: inherit;
}

.form-actions {
  display: flex;
  gap: 0.6rem;
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.program-card {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 0.85rem;
}

.program-card__head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.program-card h4 {
  margin: 0 0 0.25rem;
}

.meta {
  margin: 0;
  color: #64748b;
  font-size: 0.84rem;
}

.description {
  color: #334155;
  line-height: 1.5;
  margin: 0.7rem 0;
}

.feedback {
  border-radius: 10px;
  border: 1px solid #fed7aa;
  background: #fff7ed;
  padding: 0.6rem 0.7rem;
  margin-bottom: 0.75rem;
}

.feedback__title {
  margin: 0 0 0.3rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #9a3412;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.feedback__text {
  margin: 0;
  color: #7c2d12;
}

.requirements {
  margin-bottom: 0.75rem;
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

.program-calls {
  margin-bottom: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.65rem;
  background: #fff;
}

.program-calls__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.program-calls__title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
}

.program-calls__body {
  margin-top: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.call-card {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 0.6rem;
  background: #f8fafc;
}

.call-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.call-card__title {
  margin: 0;
  color: #334155;
  font-weight: 600;
}

.call-card__body {
  margin-top: 0.5rem;
}

.applications-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.application-item {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: #fff;
  padding: 0.55rem 0.6rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.application-item__title {
  margin: 0;
  color: #334155;
  font-weight: 600;
}

.program-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn-primary,
.btn-ghost {
  border-radius: 10px;
  padding: 0.52rem 0.9rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-primary {
  border: none;
  background: #4f46e5;
  color: white;
}

.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
}

.state {
  text-align: center;
  color: #64748b;
  padding: 1.8rem 1rem;
}

.state--error,
.error-text {
  color: #b91c1c;
}

.notice {
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
}

.notice--success {
  color: #065f46;
  border-color: #a7f3d0;
  background: #ecfdf5;
}

.notice--error {
  color: #991b1b;
  border-color: #fecaca;
  background: #fef2f2;
}
</style>
