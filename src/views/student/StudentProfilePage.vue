<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  createProfile,
  deleteCv,
  deleteProfilePhoto,
  fetchProfilePhotoBlob,
  getProfile,
  updateProfile,
  uploadCv,
  uploadProfilePhoto,
} from '@/api/profileApi'

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const deleting = ref(false)
const cvFileInput = ref(null)
const profileExists = ref(false)
const message = ref('')
const messageType = ref('info')
const selectedFile = ref(null)
const selectedPhotoFile = ref(null)
const photoInputRef = ref(null)
const loadedProfile = ref(null)
const avatarBlobUrl = ref('')
const photoUploading = ref(false)
const photoDeleting = ref(false)

const form = reactive({
  studyProgram: '',
  yearOfStudy: '',
  skills: '',
  bio: '',
  hasRepeatedSubjects: false,
  profileAverageGrade: '',
})

/** Завжди `/api/profile/me` — id з JWT, без залежності від (можливо застарілого) `auth.user.id` у localStorage. */
const ME = null

const hasAvatarPhoto = computed(() => Boolean(loadedProfile.value?.avatarFilePath))

function releaseAvatarBlob() {
  if (avatarBlobUrl.value.startsWith('blob:'))
    URL.revokeObjectURL(avatarBlobUrl.value)
  avatarBlobUrl.value = ''
}

async function refreshAvatarPreview() {
  releaseAvatarBlob()
  if (!loadedProfile.value?.avatarFilePath)
    return
  try {
    const res = await fetchProfilePhotoBlob(ME)
    avatarBlobUrl.value = URL.createObjectURL(res.data)
  } catch {
    /* 404 або мережа — без прев’ю */
  }
}

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

function extractApiError(error, fallback) {
  const status = error?.response?.status
  const payload = error?.response?.data
  const apiMessage =
    payload?.error || payload?.message || (typeof payload === 'string' ? payload : '')

  if (status === 401) return 'Сесія закінчилась. Увійдіть у систему знову.'
  if (status === 403) {
    return (
      apiMessage
      || 'Доступ заборонено. Якщо ви студент або адмін — вийдіть і увійдіть знову, щоб синхронізувати сесію.'
    )
  }
  if (status === 404) return apiMessage || 'Профіль не знайдено.'
  if (status) return apiMessage || `${fallback} (HTTP ${status})`
  return apiMessage || fallback
}

function clearForm() {
  form.studyProgram = ''
  form.yearOfStudy = ''
  form.skills = ''
  form.bio = ''
  form.hasRepeatedSubjects = false
  form.profileAverageGrade = ''
  selectedFile.value = null
  selectedPhotoFile.value = null
  if (photoInputRef.value)
    photoInputRef.value.value = ''
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
    userId: null,
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
  loading.value = true
  setMessage('')
  try {
    const profile = await getProfile(ME)
    loadedProfile.value = profile
    syncForm(profile)
    profileExists.value = true
    setMessage('Профіль завантажено.', 'success')
    await refreshAvatarPreview()
  } catch (error) {
    if (error?.response?.status === 404) {
      profileExists.value = false
      loadedProfile.value = null
      releaseAvatarBlob()
      clearForm()
      setMessage('Профіль ще не створено. Заповніть поля та натисніть "Зберегти".')
      return
    }
    setMessage(extractApiError(error, 'Не вдалося завантажити профіль.'), 'error')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  setMessage('')
  try {
    const payload = buildPayload()
    const profile = profileExists.value
      ? await updateProfile(ME, payload)
      : await createProfile(payload)
    loadedProfile.value = profile
    syncForm(profile)
    profileExists.value = true
    setMessage('Профіль успішно збережено.', 'success')
    await refreshAvatarPreview()
  } catch (error) {
    setMessage(extractApiError(error, 'Не вдалося зберегти профіль.'), 'error')
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
  if (!selectedFile.value) {
    setMessage('Спочатку виберіть PDF файл.', 'error')
    return
  }
  uploading.value = true
  setMessage('')
  try {
    await uploadCv(ME, selectedFile.value)
    selectedFile.value = null
    const profile = await getProfile(ME)
    loadedProfile.value = profile
    setMessage('CV успішно завантажено.', 'success')
  } catch (error) {
    setMessage(extractApiError(error, 'Не вдалося завантажити CV.'), 'error')
  } finally {
    uploading.value = false
  }
}

async function removeCv() {
  deleting.value = true
  setMessage('')
  try {
    await deleteCv(ME)
    selectedFile.value = null
    if (cvFileInput.value) cvFileInput.value.value = ''
    const profile = await getProfile(ME)
    loadedProfile.value = profile
    setMessage('CV видалено.', 'success')
  } catch (error) {
    setMessage(extractApiError(error, 'Не вдалося видалити CV.'), 'error')
  } finally {
    deleting.value = false
  }
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

function isBlockedImageName(name) {
  const low = name.toLowerCase()
  return ['.exe', '.bat', '.cmd', '.sh', '.dll', '.jar', '.php', '.html', '.htm'].some((s) =>
    low.endsWith(s),
  )
}

function isLikelyImageFile(file) {
  if (!file?.name || isBlockedImageName(file.name))
    return false
  const t = (file.type || '').toLowerCase()
  if (t.startsWith('image/'))
    return true
  return /\.(jpe?g|png|gif|webp|bmp|tif|tiff|heic|heif|avif|ico|jfif|pjpeg|pjp|svg)$/i.test(
    file.name,
  )
}

function onPhotoPicked(event) {
  const file = event.target.files?.[0]
  if (!file) {
    selectedPhotoFile.value = null
    return
  }
  if (!isLikelyImageFile(file)) {
    setMessage('Оберіть файл зображення (типові формати фото).', 'error')
    event.target.value = ''
    selectedPhotoFile.value = null
    return
  }
  if (file.size > MAX_PHOTO_BYTES) {
    setMessage('Фото має бути не більше 10 МБ.', 'error')
    event.target.value = ''
    selectedPhotoFile.value = null
    return
  }
  selectedPhotoFile.value = file
}

async function submitPhoto() {
  if (!profileExists.value) {
    setMessage('Спочатку збережіть профіль (блок нижче).', 'error')
    return
  }
  if (!selectedPhotoFile.value) {
    setMessage('Оберіть файл фото.', 'error')
    return
  }
  photoUploading.value = true
  setMessage('')
  try {
    const updated = await uploadProfilePhoto(ME, selectedPhotoFile.value)
    loadedProfile.value = { ...(loadedProfile.value || {}), ...updated }
    selectedPhotoFile.value = null
    if (photoInputRef.value)
      photoInputRef.value.value = ''
    setMessage('Фото профілю оновлено.', 'success')
    await refreshAvatarPreview()
  } catch (error) {
    setMessage(extractApiError(error, 'Не вдалося завантажити фото.'), 'error')
  } finally {
    photoUploading.value = false
  }
}

async function removePhoto() {
  if (!hasAvatarPhoto.value)
    return
  photoDeleting.value = true
  setMessage('')
  try {
    const updated = await deleteProfilePhoto(ME)
    loadedProfile.value = { ...(loadedProfile.value || {}), ...updated }
    releaseAvatarBlob()
    setMessage('Фото профілю видалено.', 'success')
  } catch (error) {
    setMessage(extractApiError(error, 'Не вдалося видалити фото.'), 'error')
  } finally {
    photoDeleting.value = false
  }
}

onUnmounted(() => {
  releaseAvatarBlob()
})

onMounted(loadProfile)
</script>

<template>
  <div class="page">

    <article class="card card--photo">
      <h3 class="title-sm">Фото профілю</h3>
      <div class="photo-row">
        <div class="photo-preview" aria-hidden="true">
          <img v-if="avatarBlobUrl" class="photo-preview__img" :src="avatarBlobUrl" alt="">
          <span v-else class="photo-preview__placeholder">
            {{ profileExists ? 'Немає фото' : '—' }}
          </span>
        </div>
        <div class="photo-actions">
          <input
            ref="photoInputRef"
            type="file"
            accept="image/*"
            class="cv-input-hidden"
            :disabled="!profileExists"
            @change="onPhotoPicked"
          >
          <div class="row cv-row">
            <button
              type="button"
              class="btn ghost cv-browse-btn"
              :disabled="!profileExists"
              @click="photoInputRef.click()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Обрати фото
            </button>
            <span class="cv-filename">{{ selectedPhotoFile ? selectedPhotoFile.name : 'Файл не обрано' }}</span>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="!profileExists || photoUploading || !selectedPhotoFile"
            @click="submitPhoto"
          >
            {{ photoUploading ? 'Завантаження…' : 'Завантажити фото' }}
          </button>
          <button
            type="button"
            class="btn danger"
            :disabled="!profileExists || photoDeleting || !hasAvatarPhoto"
            @click="removePhoto"
          >
            {{ photoDeleting ? 'Видалення…' : 'Видалити фото' }}
          </button>
        </div>
      </div>
      <p v-if="!profileExists" class="photo-hint">
        Збережіть профіль у блоці нижче, щоб додати фото.
      </p>
      <p v-else class="photo-hint photo-hint--muted">
        JPEG, PNG, GIF, WebP, HEIC, SVG та інші поширені формати, до 10 МБ.
      </p>
    </article>

    <article class="card">
      <h3 class="title-sm">Дані профілю</h3>
      <div class="profile-form">
        <div class="grid two form-fields">
          <div class="form-field">
            <label class="label" for="study-program">Навчальна програма</label>
            <input
              id="study-program"
              v-model="form.studyProgram"
              type="text"
              placeholder="Computer Science"
            />
          </div>
          <div class="form-field">
            <label class="label" for="year-of-study">Курс</label>
            <input
              id="year-of-study"
              v-model="form.yearOfStudy"
              type="number"
              min="1"
              max="8"
              placeholder="2"
            />
          </div>
        </div>

        <div class="grid two form-fields">
          <div class="form-field">
            <label class="label" for="average-grade">Середній бал</label>
            <input
              id="average-grade"
              v-model="form.profileAverageGrade"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="89.5"
            />
          </div>
          <div class="form-field form-field--checkbox">
            <label class="check-row">
              <input v-model="form.hasRepeatedSubjects" type="checkbox" />
              <span>Є перездачі</span>
            </label>
          </div>
        </div>

        <div class="form-field">
          <label class="label" for="skills">Навички</label>
          <textarea
            id="skills"
            v-model="form.skills"
            rows="3"
            placeholder="Java, Spring, SQL..."
          />
        </div>

        <div class="form-field">
          <label class="label" for="bio">Коротко про себе</label>
          <textarea
            id="bio"
            v-model="form.bio"
            rows="4"
            placeholder="Ваш досвід та мотивація..."
          />
        </div>
      </div>

      <button class="btn profile-form__submit" :disabled="saving" @click="saveProfile">
        {{ saving ? 'Збереження...' : 'Зберегти профіль' }}
      </button>
    </article>

    <article class="card">
      <h3 class="title-sm">CV (PDF)</h3>
      <div class="row cv-row">
        <input ref="cvFileInput" type="file" accept=".pdf,application/pdf" class="cv-input-hidden" @change="onFilePicked" />
        <button class="btn ghost cv-browse-btn" @click="cvFileInput.click()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Обрати файл
        </button>
        <span class="cv-filename">{{ selectedFile ? selectedFile.name : 'Файл не обрано' }}</span>
      </div>
      <div class="row cv-actions-row">
        <button class="btn" :disabled="uploading" @click="submitCv">
          {{ uploading ? 'Завантаження...' : 'Завантажити CV' }}
        </button>
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

.photo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
}

.photo-preview {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-preview__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-preview__placeholder {
  font-size: 0.72rem;
  color: #94a3b8;
  text-align: center;
  padding: 0.5rem;
  line-height: 1.25;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}



.photo-hint {
  margin: 0.85rem 0 0;
  font-size: 0.82rem;
  color: #64748b;
}

.photo-hint--muted {
  margin-top: 0.65rem;
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

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-fields {
  align-items: end;
}

.form-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.form-field--checkbox {
  justify-content: flex-end;
}

.profile-form__submit {
  margin-top: 0.35rem;
}

.label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
  color: #64748b;
}


textarea {
  resize: none;
}

input,
textarea {
  width: 100%;
  box-sizing: border-box;
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
  margin: 0;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  min-height: calc(0.62rem * 2 + 1.25rem + 2px);
  color: #334155;
  cursor: pointer;
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

.cv-input-hidden {
  display: none;
}

.cv-browse-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1.5px solid #c7d2fe;
  transition: border-color 0.15s, background 0.15s;
}

.cv-browse-btn:hover {
  background: #e0e7ff;
  border-color: #6366f1;
}

.cv-filename {
  font-size: 0.85rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.cv-row {
  margin-bottom: 0.5rem;
}

.cv-actions-row {
  gap: 0.65rem;
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
  background: #cb7a5c;
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

.profile-intro {
  margin-bottom: 0.85rem;
}

.session-id-line {
  margin: 0;
  font-size: 0.9rem;
  color: #334155;
}

.session-id-line.muted {
  color: #64748b;
}

.id-badge {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.78rem;
  background: rgba(79, 70, 229, 0.1);
  color: #4338ca;
}

.grid.two.grid--solo {
  grid-template-columns: 1fr;
}

@media (max-width: 860px) {
  .grid.two {
    grid-template-columns: 1fr;
  }
}
</style>
