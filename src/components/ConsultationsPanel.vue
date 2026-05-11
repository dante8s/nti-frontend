<template>
  <section class="consultations">
    <div class="consultations__head">
      <h4 class="consultations__title">Consultations</h4>
      <button
        v-if="canMentorWrite"
        type="button"
        class="consultations__primary-btn"
        @click="openCreateModal"
      >
        Log Consultation
      </button>
    </div>

    <p v-if="localError" class="consultations__error">
      {{ localError }}
    </p>

    <div v-if="localLoading" class="consultations__state">
      Loading consultations...
    </div>
    <div v-else-if="sortedConsultations.length === 0" class="consultations__state">
      No consultations logged yet.
    </div>
    <div v-else class="consultations__list">
      <article
        v-for="consultation in sortedConsultations"
        :key="consultation.id"
        class="consultations__item"
        :class="{ 'consultations__item--upcoming': isUpcomingConsultation(consultation) }"
      >
        <div class="consultations__item-head">
          <div>
            <h5 class="consultations__item-title">
              {{ consultation.topic || 'Untitled consultation' }}
            </h5>
            <p class="consultations__meta">
  {{ formatDateTime(consultation.consultationDate) }} •
  {{ consultation.mentorName || 'Unknown mentor' }}
</p>
          </div>
          <div class="consultations__actions">
            <button
              v-if="canEditConsultation(consultation)"
              type="button"
              class="consultations__secondary-btn"
              @click="openEditModal(consultation)"
            >
              Edit
            </button>
            <button
              v-if="isAdmin"
              type="button"
              class="consultations__danger-btn"
              @click="removeConsultation(consultation)"
            >
              Delete
            </button>
          </div>
        </div>
        <p v-if="consultation.description" class="consultations__description">
          {{ consultation.description }}
        </p>
      </article>
    </div>

    <div v-if="modalOpen" class="consultations__modal-overlay" @click.self="closeModal">
      <div class="consultations__modal">
        <h5 class="consultations__modal-title">
          {{ editingConsultation ? 'Edit Consultation' : 'Log Consultation' }}
        </h5>
        <label class="consultations__field">
          <span>Date</span>
          <input v-model="form.consultationDate" type="date" class="consultations__input">
        </label>
        <label class="consultations__field">
          <span>Topic</span>
          <input
            v-model.trim="form.topic"
            type="text"
            class="consultations__input"
            placeholder="Consultation topic"
          >
        </label>
        <label class="consultations__field">
          <span>Description</span>
          <textarea
            v-model.trim="form.description"
            rows="4"
            class="consultations__textarea"
            placeholder="Optional details"
          />
        </label>
        <div class="consultations__actions consultations__actions--modal">
          <button type="button" class="consultations__secondary-btn" @click="closeModal">
            Cancel
          </button>
          <button
            type="button"
            class="consultations__primary-btn"
            :disabled="!form.consultationDate || !form.topic || saving"
            @click="submitConsultation"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMentorshipStore } from '@/stores/mentorship'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  mentorshipId: {
    type: [Number, String],
    required: true,
  },
})

const mentorshipStore = useMentorshipStore()
const authStore = useAuthStore()
const { consultationsByMentorship } = storeToRefs(mentorshipStore)

const localLoading = ref(false)
const localError = ref('')
const modalOpen = ref(false)
const saving = ref(false)
const editingConsultation = ref(null)
const form = reactive({
  consultationDate: '',
  topic: '',
  description: '',
})

const roles = computed(() => authStore.roles || [])
const isAdmin = computed(() => roles.value.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'))
const isMentor = computed(() => roles.value.includes('MENTOR'))
const canMentorWrite = computed(() => isMentor.value)

const mentorshipKey = computed(() => String(props.mentorshipId))
const userId = computed(() => authStore.user?.id ?? authStore.user?.userId ?? null)

const sortedConsultations = computed(() => {
  const raw = consultationsByMentorship.value?.[mentorshipKey.value] || []
  return [...raw].sort(
    (a, b) => new Date(b?.consultationDate || b?.createdAt || 0) - new Date(a?.consultationDate || a?.createdAt || 0),
  )
})

onMounted(fetchConsultations)
watch(() => props.mentorshipId, fetchConsultations)

async function fetchConsultations() {
  if (!props.mentorshipId) return
  localLoading.value = true
  localError.value = ''
  try {
    await mentorshipStore.getConsultations(props.mentorshipId)
  } catch (error) {
    localError.value = error.response?.data?.message || 'Failed to load consultations.'
  } finally {
    localLoading.value = false
  }
}

function openCreateModal() {
  editingConsultation.value = null
  form.consultationDate = ''
  form.topic = ''
  form.description = ''
  modalOpen.value = true
}

function openEditModal(consultation) {
  editingConsultation.value = consultation
  form.consultationDate = toDateInputValue(consultation?.consultationDate)
  form.topic = consultation?.topic || ''
  form.description = consultation?.description || ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editingConsultation.value = null
}

function canEditConsultation(consultation) {
  if (!isMentor.value) return false
  return Boolean(userId.value && userId.value === consultation?.createdById)
}

async function submitConsultation() {
  if (!props.mentorshipId || !form.consultationDate || !form.topic) return
  saving.value = true
  localError.value = ''
  try {
    const payload = {
      mentorshipId: props.mentorshipId,
      consultationDate: form.consultationDate,
      topic: form.topic,
      description: form.description || '',
    }
    if (editingConsultation.value?.id) {
      await mentorshipStore.updateConsultation(editingConsultation.value.id, payload)
    } else {
      await mentorshipStore.createConsultation(payload)
    }
    await mentorshipStore.getConsultations(props.mentorshipId)
    closeModal()
  } catch (error) {
    localError.value = error.response?.data?.message || 'Failed to save consultation.'
  } finally {
    saving.value = false
  }
}

async function removeConsultation(consultation) {
  if (!isAdmin.value || !consultation?.id) return
  localError.value = ''
  try {
    await mentorshipStore.deleteConsultation(consultation.id, props.mentorshipId)
    await mentorshipStore.getConsultations(props.mentorshipId)
  } catch (error) {
    localError.value = error.response?.data?.message || 'Failed to delete consultation.'
  }
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function isUpcomingConsultation(consultation) {
  if (!consultation?.consultationDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const consultationDate = new Date(consultation.consultationDate)
  consultationDate.setHours(0, 0, 0, 0)
  return consultationDate > today
}
</script>

<style scoped>
.consultations {
  margin-top: 0.8rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding-top: 0.7rem;
}

.consultations__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.consultations__title {
  margin: 0;
  font-size: 0.94rem;
  color: #0f172a;
}

.consultations__state {
  color: #64748b;
  font-size: 0.86rem;
}

.consultations__error {
  margin: 0 0 0.6rem;
  color: #b91c1c;
  font-size: 0.86rem;
}

.consultations__list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.consultations__item {
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  padding: 0.65rem 0.75rem;
}

.consultations__item--upcoming {
  background: rgba(219, 234, 254, 0.6);
  border-color: rgba(59, 130, 246, 0.3);
}

.consultations__item-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.65rem;
}

.consultations__item-title {
  margin: 0;
  color: #0f172a;
  font-size: 0.9rem;
}

.consultations__meta {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.consultations__description {
  margin: 0.5rem 0 0;
  color: #334155;
  white-space: pre-wrap;
  font-size: 0.86rem;
}

.consultations__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.consultations__actions--modal {
  margin-top: 0.8rem;
  justify-content: flex-end;
}

.consultations__primary-btn,
.consultations__secondary-btn,
.consultations__danger-btn {
  border-radius: 10px;
  padding: 0.4rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.consultations__primary-btn {
  border: none;
  background: #4f46e5;
  color: white;
}

.consultations__secondary-btn {
  border: 1px solid rgba(79, 70, 229, 0.24);
  background: white;
  color: #4338ca;
}

.consultations__danger-btn {
  border: 1px solid rgba(220, 38, 38, 0.25);
  background: white;
  color: #b91c1c;
}

.consultations__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
  padding: 1rem;
}

.consultations__modal {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 16px;
  padding: 1.1rem;
}

.consultations__modal-title {
  margin: 0 0 0.8rem;
}

.consultations__field {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  margin-bottom: 0.6rem;
}

.consultations__input,
.consultations__textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.5rem 0.62rem;
  font: inherit;
}
</style>
