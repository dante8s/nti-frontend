<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { previewBulkMessage, sendBulkMessage } from '@/api/bulkMessage'
import { programsApi } from '@/api/programs'

const TARGET_OPTIONS = [
  { value: 'ALL',                    label: 'Всі активні користувачі' },
  { value: 'BY_ROLE',               label: 'За роллю' },
  { value: 'BY_CALL',               label: 'За викликом (call)' },
  { value: 'BY_APPLICATION_STATUS', label: 'За статусом заявки' },
]

const ROLE_OPTIONS = [
  { value: 'STUDENT',         label: 'Студент' },
  { value: 'FIRM',            label: 'Компанія (FIRM)' },
  { value: 'FIRM_USER',       label: 'Представник фірми' },
  { value: 'MENTOR',          label: 'Ментор' },
  { value: 'EVALUATOR',       label: 'Комісія (перегляд)' },
  { value: 'SUPER_EVALUATOR', label: 'Комісія (рішення)' },
  { value: 'ADMIN',           label: 'Адміністратор' },
]

const APP_STATUS_OPTIONS = [
  { value: 'SUBMITTED',         label: 'Подано' },
  { value: 'FORMALLY_VERIFIED', label: 'Офіційно підтверджено' },
  { value: 'IN_REVIEW',         label: 'На оцінюванні' },
  { value: 'NEEDS_REVISION',    label: 'Потрібні виправлення' },
  { value: 'APPROVED',          label: 'Схвалено' },
  { value: 'ONBOARDING',        label: 'Адаптація' },
  { value: 'ACTIVE',            label: 'Активний проєкт' },
  { value: 'SUSPENDED',         label: 'Відсторонено' },
  { value: 'REJECTED',          label: 'Відхилено' },
]

const form = ref({
  targetType: 'ALL',
  roleFilter: '',
  callId: null,
  applicationStatus: '',
  subject: '',
  message: '',
  sendEmail: true,
})

const calls = ref([])
const previewCount = ref(null)
const previewing = ref(false)
const sending = ref(false)
const sent = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await programsApi.getAllOpenCalls()
    calls.value = Array.isArray(data) ? data : []
  } catch {
    calls.value = []
  }
})

watch(() => form.value.targetType, () => {
  previewCount.value = null
})

const payload = computed(() => ({
  targetType:        form.value.targetType,
  roleFilter:        form.value.targetType === 'BY_ROLE'               ? form.value.roleFilter        : null,
  callId:            form.value.targetType === 'BY_CALL'               ? form.value.callId            : null,
  applicationStatus: form.value.targetType === 'BY_APPLICATION_STATUS' ? form.value.applicationStatus : null,
  subject:           form.value.subject,
  message:           form.value.message,
  sendEmail:         form.value.sendEmail,
}))

const canSend = computed(() => {
  if (!form.value.subject.trim() || !form.value.message.trim()) return false
  if (form.value.targetType === 'BY_ROLE' && !form.value.roleFilter) return false
  if (form.value.targetType === 'BY_CALL' && !form.value.callId) return false
  if (form.value.targetType === 'BY_APPLICATION_STATUS' && !form.value.applicationStatus) return false
  return true
})

async function preview() {
  if (!canSend.value) return
  previewing.value = true
  error.value = ''
  try {
    const { data } = await previewBulkMessage(payload.value)
    previewCount.value = data.recipientCount
  } catch (e) {
    error.value = e.response?.data?.error || 'Помилка preview'
  } finally {
    previewing.value = false
  }
}

async function send() {
  if (!canSend.value) return
  sending.value = true
  sent.value = false
  error.value = ''
  try {
    const { data } = await sendBulkMessage(payload.value)
    previewCount.value = data.recipientCount
    sent.value = true
    setTimeout(() => (sent.value = false), 4000)
  } catch (e) {
    error.value = e.response?.data?.error || 'Помилка надсилання'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="bm">
    <div class="bm__head">
      <h1 class="bm__title">Масова розсилка</h1>
      <p class="bm__sub">Надішліть in-app повідомлення (та email) групі користувачів одразу</p>
    </div>

    <div class="bm__card">
      <!-- Target -->
      <div class="bm__field">
        <label class="bm__label">Кому надсилати</label>
        <select v-model="form.targetType" class="bm__select">
          <option v-for="opt in TARGET_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- BY_ROLE filter -->
      <div v-if="form.targetType === 'BY_ROLE'" class="bm__field">
        <label class="bm__label">Роль</label>
        <select v-model="form.roleFilter" class="bm__select">
          <option value="" disabled>Оберіть роль...</option>
          <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </div>

      <!-- BY_CALL filter -->
      <div v-if="form.targetType === 'BY_CALL'" class="bm__field">
        <label class="bm__label">Виклик (Call)</label>
        <select v-model="form.callId" class="bm__select">
          <option :value="null" disabled>Оберіть виклик...</option>
          <option v-for="c in calls" :key="c.id" :value="c.id">
            {{ c.title }} (id {{ c.id }})
          </option>
        </select>
        <p v-if="calls.length === 0" class="bm__hint">Відкритих викликів не знайдено</p>
      </div>

      <!-- BY_APPLICATION_STATUS filter -->
      <div v-if="form.targetType === 'BY_APPLICATION_STATUS'" class="bm__field">
        <label class="bm__label">Статус заявки</label>
        <select v-model="form.applicationStatus" class="bm__select">
          <option value="" disabled>Оберіть статус...</option>
          <option v-for="s in APP_STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <!-- Subject -->
      <div class="bm__field">
        <label class="bm__label">Тема повідомлення</label>
        <input v-model="form.subject" class="bm__input" type="text" placeholder="Наприклад: Важливе оголошення NTI" />
      </div>

      <!-- Message -->
      <div class="bm__field">
        <label class="bm__label">Текст повідомлення</label>
        <textarea v-model="form.message" class="bm__textarea" rows="8"
          placeholder="Введіть текст повідомлення..." />
      </div>

      <!-- Email toggle -->
      <div class="bm__field bm__field--row">
        <label class="bm__toggle">
          <input type="checkbox" v-model="form.sendEmail" />
          <span>Також надіслати на email</span>
        </label>
      </div>

      <!-- Preview result -->
      <div v-if="previewCount !== null" class="bm__preview-result">
        <span class="bm__preview-icon">◎</span>
        <span>Знайдено одержувачів: <strong>{{ previewCount }}</strong></span>
      </div>

      <p v-if="error" class="bm__error">{{ error }}</p>

      <div class="bm__actions">
        <button class="bm__btn bm__btn--preview" :disabled="!canSend || previewing" @click="preview">
          {{ previewing ? 'Перевірка...' : 'Переглянути кількість' }}
        </button>
        <button class="bm__btn bm__btn--send" :disabled="!canSend || sending" @click="send">
          {{ sending ? 'Надсилання...' : 'Надіслати' }}
        </button>
        <span v-if="sent" class="bm__ok">✓ Надіслано {{ previewCount }} одержувачам</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bm {
  max-width: 700px;
}

.bm__head {
  margin-bottom: 1.5rem;
}

.bm__title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 0.3rem;
}

.bm__sub {
  color: #64748b;
  font-size: 0.92rem;
  margin: 0;
}

.bm__card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.bm__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.bm__field--row {
  flex-direction: row;
  align-items: center;
}

.bm__label {
  font-size: 0.87rem;
  font-weight: 600;
  color: #374151;
}

.bm__select,
.bm__input,
.bm__textarea {
  padding: 0.6rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 0.93rem;
  font-family: inherit;
  color: #1e293b;
  background: #fff;
  transition: border-color 0.15s;
  resize: vertical;
}

.bm__select:focus,
.bm__input:focus,
.bm__textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}

.bm__hint {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
}

.bm__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #374151;
  cursor: pointer;
}

.bm__preview-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  font-size: 0.92rem;
  color: #166534;
}

.bm__preview-icon {
  font-size: 1.1rem;
}

.bm__error {
  color: #dc2626;
  font-size: 0.88rem;
  margin: 0;
}

.bm__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.bm__btn {
  padding: 0.6rem 1.4rem;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.93rem;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.bm__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bm__btn--preview {
  background: #f1f5f9;
  color: #334155;
}

.bm__btn--preview:hover:not(:disabled) {
  background: #e2e8f0;
}

.bm__btn--send {
  background: #4f46e5;
  color: #fff;
}

.bm__btn--send:hover:not(:disabled) {
  background: #4338ca;
}

.bm__ok {
  color: #16a34a;
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
