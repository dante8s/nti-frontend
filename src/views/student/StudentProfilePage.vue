<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  createProfile,
  deleteCv,
  getCvUrl,
  getProfile,
  updateProfile,
  uploadCv,
} from '@/api/profileApi'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const deleting = ref(false)
const profileExists = ref(false)
const message = ref('')
const messageType = ref('info')
const selectedFile = ref(null)

const userIdInput = ref(auth.user?.id ? String(auth.user.id) : '')

const form = reactive({
  studyProgram: '',
  yearOfStudy: '',
  skills: '',
  bio: '',
  hasRepeatedSubjects: false,
  profileAverageGrade: '',
})

const parsedUserId = computed(() => Number(userIdInput.value))
const canUseUserId = computed(
  () => Number.isFinite(parsedUserId.value) && parsedUserId.value > 0,
)
const cvHref = computed(() =>
  canUseUserId.value ? getCvUrl(parsedUserId.value) : '#',
)

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

function clearForm() {
  form.studyProgram = ''
  form.yearOfStudy = ''
  form.skills = ''
  form.bio = ''
  form.hasRepeatedSubjects = false
  form.profileAverageGrade = ''
  selectedFile.value = null
}

function syncForm(profile) {
  form.studyProgram = profile.studyProgram || ''
  form.yearOfStudy = profile.yearOfStudy ?? ''
  form.skills = profile.skills || ''
  form.bio = profile.bio || ''
  form.hasRepeatedSubjects = !!profile.hasRepeatedSubjects
  form.profileAverageGrade = profile.profileAverageGrade ?? ''
}

function buildPayload() {
  return {
    userId: parsedUserId.value,
    studyProgram: form.studyProgram,
    yearOfStudy: form.yearOfStudy === '' ? null : Number(form.yearOfStudy),
    skills: form.skills,
    bio: form.bio,
    hasRepeatedSubjects: form.hasRepeatedSubjects,
    profileAverageGrade:
      form.profileAverageGrade === '' ? null : Number(form.profileAverageGrade),
  }
}

async function loadProfile() {
  if (!canUseUserId.value) {
    setMessage('Не знайдено user id. Увійдіть ще раз або вкажіть id вручну.', 'error')
    return
  }
  loading.value = true
  setMessage('')
  try {
    const profile = await getProfile(parsedUserId.value)
    syncForm(profile)
    profileExists.value = true
    setMessage('Профіль завантажено.', 'success')
  } catch (error) {
    if (error?.response?.status === 404) {
      profileExists.value = false
      clearForm()
      setMessage('Профіль ще не створено. Заповніть поля та натисніть "Зберегти".')
      return
    }
    setMessage('Не вдалося завантажити профіль.', 'error')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!canUseUserId.value) {
    setMessage('Вкажіть коректний user id.', 'error')
    return
  }
  saving.value = true
  setMessage('')
  try {
    const payload = buildPayload()
    const profile = profileExists.value
      ? await updateProfile(parsedUserId.value, payload)
      : await createProfile(payload)
    syncForm(profile)
    profileExists.value = true
    setMessage('Профіль успішно збережено.', 'success')
  } catch {
    setMessage('Не вдалося зберегти профіль.', 'error')
  } finally {
    saving.value = false
  }
}

function onFilePicked(event) {
  const file = event.target.files?.[0]
  if (!file) {
    selectedFile.value = null
    return
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    setMessage('Дозволено тільки PDF.', 'error')
    event.target.value = ''
    selectedFile.value = null
    return
  }
  selectedFile.value = file
}

async function submitCv() {
  if (!canUseUserId.value) {
    setMessage('Вкажіть коректний user id.', 'error')
    return
  }
  if (!selectedFile.value) {
    setMessage('Спочатку виберіть PDF файл.', 'error')
    return
  }
  uploading.value = true
  setMessage('')
  try {
    await uploadCv(parsedUserId.value, selectedFile.value)
    selectedFile.value = null
    setMessage('CV успішно завантажено.', 'success')
  } catch {
    setMessage('Не вдалося завантажити CV.', 'error')
  } finally {
    uploading.value = false
  }
}

async function removeCv() {
  if (!canUseUserId.value) {
    setMessage('Вкажіть коректний user id.', 'error')
    return
  }
  deleting.value = true
  setMessage('')
  try {
    await deleteCv(parsedUserId.value)
    setMessage('CV видалено.', 'success')
  } catch {
    setMessage('Не вдалося видалити CV.', 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="page">
    <p class="lead">Ваш профіль студента: базові дані, навички та резюме.</p>

    <article class="card">
      <h2 class="title">Мій профіль</h2>
      <div class="grid two">
        <div>
          <label class="label">User ID</label>
          <input v-model="userIdInput" type="number" min="1" placeholder="Напр. 12" />
        </div>
        <div class="actions-top">
          <button class="btn ghost" :disabled="loading" @click="loadProfile">
            {{ loading ? 'Завантаження...' : 'Оновити профіль' }}
          </button>
        </div>
      </div>
    </article>

    <article class="card">
      <h3 class="title-sm">Дані профілю</h3>
      <div class="grid two">
        <div>
          <label class="label">Навчальна програма</label>
          <input v-model="form.studyProgram" placeholder="Computer Science" />
        </div>
        <div>
          <label class="label">Курс</label>
          <input v-model="form.yearOfStudy" type="number" min="1" max="8" placeholder="2" />
        </div>
      </div>

      <div class="grid two">
        <div>
          <label class="label">Середній бал</label>
          <input
            v-model="form.profileAverageGrade"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="89.5"
          />
        </div>
        <label class="check-row">
          <input v-model="form.hasRepeatedSubjects" type="checkbox" />
          <span>Є перездачі</span>
        </label>
      </div>

      <label class="label">Навички</label>
      <textarea v-model="form.skills" rows="3" placeholder="Java, Spring, SQL..." />

      <label class="label">Коротко про себе</label>
      <textarea v-model="form.bio" rows="4" placeholder="Ваш досвід та мотивація..." />

      <button class="btn" :disabled="saving" @click="saveProfile">
        {{ saving ? 'Збереження...' : 'Зберегти профіль' }}
      </button>
    </article>

    <article class="card">
      <h3 class="title-sm">CV (PDF)</h3>
      <div class="row">
        <input type="file" accept=".pdf,application/pdf" @change="onFilePicked" />
        <button class="btn" :disabled="uploading" @click="submitCv">
          {{ uploading ? 'Завантаження...' : 'Завантажити CV' }}
        </button>
      </div>
      <div class="row">
        <a class="link" :href="cvHref" target="_blank" rel="noreferrer">Відкрити поточне CV</a>
        <button class="btn danger" :disabled="deleting" @click="removeCv">
          {{ deleting ? 'Видалення...' : 'Видалити CV' }}
        </button>
      </div>
    </article>

    <p v-if="message" class="notice" :class="`notice--${messageType}`">
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
.page {
  width: 100%;
  display: grid;
  gap: 1rem;
}

.lead {
  margin: 0;
  color: #475569;
}

.card {
  padding: 1.2rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.title,
.title-sm {
  margin: 0 0 0.9rem;
  color: #0f172a;
}

.title {
  font-size: 1.08rem;
}

.title-sm {
  font-size: 1rem;
}

.grid {
  display: grid;
  gap: 0.85rem;
}

.grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
  color: #64748b;
}

input,
textarea {
  width: 100%;
  border: 1px solid #dbe3f0;
  border-radius: 12px;
  padding: 0.62rem 0.75rem;
  font: inherit;
  color: #0f172a;
  background: #fff;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.check-row {
  margin-top: 1.5rem;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  color: #334155;
}

.check-row input {
  width: auto;
}

.row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  border: none;
  border-radius: 10px;
  background: #4f46e5;
  color: #fff;
  padding: 0.6rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.ghost {
  background: #eef2ff;
  color: #312e81;
}

.btn.danger {
  background: #dc2626;
}

.link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
}

.notice {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  font-size: 0.88rem;
}

.notice--success {
  background: #ecfdf5;
  color: #166534;
}

.notice--error {
  background: #fef2f2;
  color: #b91c1c;
}

.notice--info {
  background: #eef2ff;
  color: #3730a3;
}

@media (max-width: 860px) {
  .grid.two {
    grid-template-columns: 1fr;
  }
}
</style>
