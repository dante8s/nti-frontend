<template>
  <div class="page">
    <section class="page__head">
      <p class="eyebrow">Студент</p>
      <h2 class="page__title">Мій профіль</h2>
      <p class="page__sub">Заповніть профіль, щоб подати заявку на програму</p>
    </section>

    <div v-if="loading" class="state-msg">Завантаження...</div>
    <div v-else-if="loadError" class="alert alert--error">{{ loadError }}</div>

    <div v-else class="content">
      <!-- Eligibility banner -->
      <div v-if="eligibility" class="elig-banner" :class="eligibility.profileComplete ? 'elig-banner--ok' : 'elig-banner--warn'">
        <span class="elig-banner__icon">{{ eligibility.profileComplete ? '✓' : '!' }}</span>
        <div>
          <strong>{{ eligibility.profileComplete ? 'Профіль повний — можна подавати заявку' : 'Профіль неповний' }}</strong>
          <ul v-if="eligibility.remindersUk?.length" class="elig-banner__list">
            <li v-for="r in eligibility.remindersUk" :key="r">{{ r }}</li>
          </ul>
        </div>
      </div>

      <!-- Profile card -->
      <div class="card">
        <div class="card__head">
          <h3 class="card__title">Інформація про студента</h3>
          <button v-if="!editing" type="button" class="btn btn--ghost" @click="startEdit">
            ✏️ Редагувати
          </button>
          <div v-else class="card__head-actions">
            <button type="button" class="btn btn--primary" :disabled="saving" @click="save">
              {{ saving ? 'Збереження...' : 'Зберегти' }}
            </button>
            <button type="button" class="btn btn--ghost" @click="cancelEdit">Скасувати</button>
          </div>
        </div>

        <div v-if="saveError" class="alert alert--error">{{ saveError }}</div>
        <div v-if="saveSuccess" class="alert alert--ok">Профіль оновлено успішно</div>

        <div class="form">
          <div class="form__row">
            <div class="field">
              <label class="field__label">Програма навчання</label>
              <input
                v-if="editing"
                v-model="form.studyProgram"
                class="field__input"
                placeholder="Наприклад: Комп'ютерна інженерія"
              />
              <p v-else class="field__value">{{ profile?.studyProgram || '—' }}</p>
            </div>
            <div class="field">
              <label class="field__label">Рік навчання</label>
              <input
                v-if="editing"
                v-model.number="form.yearOfStudy"
                class="field__input"
                type="number"
                min="1"
                max="6"
                placeholder="1–6"
              />
              <p v-else class="field__value">{{ profile?.yearOfStudy ?? '—' }}</p>
            </div>
          </div>

          <div class="form__row">
            <div class="field">
              <label class="field__label">Середній бал</label>
              <input
                v-if="editing"
                v-model.number="form.profileAverageGrade"
                class="field__input"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0–100"
              />
              <p v-else class="field__value">{{ profile?.profileAverageGrade ?? '—' }}</p>
            </div>
            <div class="field">
              <label class="field__label">Академічна заборгованість</label>
              <label v-if="editing" class="toggle">
                <input v-model="form.hasRepeatedSubjects" type="checkbox" class="toggle__input" />
                <span class="toggle__track" />
                <span class="toggle__label">{{ form.hasRepeatedSubjects ? 'Так' : 'Ні' }}</span>
              </label>
              <p v-else class="field__value">{{ profile?.hasRepeatedSubjects ? 'Так' : 'Ні' }}</p>
            </div>
          </div>

          <div class="field field--full">
            <label class="field__label">Навички</label>
            <input
              v-if="editing"
              v-model="form.skills"
              class="field__input"
              placeholder="Наприклад: Python, Vue.js, Machine Learning"
            />
            <p v-else class="field__value">{{ profile?.skills || '—' }}</p>
          </div>

          <div class="field field--full">
            <label class="field__label">Про себе</label>
            <textarea
              v-if="editing"
              v-model="form.bio"
              class="field__input field__textarea"
              rows="4"
              placeholder="Розкажіть про себе, свої інтереси та цілі"
            />
            <p v-else class="field__value">{{ profile?.bio || '—' }}</p>
          </div>
        </div>
      </div>

      <!-- CV card -->
      <div class="card">
        <div class="card__head">
          <h3 class="card__title">Резюме (CV)</h3>
        </div>

        <div v-if="cvError" class="alert alert--error">{{ cvError }}</div>

        <div v-if="profile?.cvOriginalName" class="cv-row">
          <span class="cv-row__icon">📄</span>
          <div class="cv-row__info">
            <span class="cv-row__name">{{ profile.cvOriginalName }}</span>
            <span class="cv-row__date">Завантажено: {{ formatDate(profile.cvUploadedAt) }}</span>
          </div>
          <a :href="cvDownloadUrl" target="_blank" class="btn btn--ghost">Переглянути</a>
          <button type="button" class="btn btn--danger" :disabled="cvLoading" @click="removeCv">
            {{ cvLoading ? '...' : 'Видалити' }}
          </button>
        </div>
        <div v-else class="cv-empty">
          <p>CV ще не завантажено</p>
        </div>

        <div class="cv-upload">
          <label class="upload-label">
            <input
              ref="cvInput"
              type="file"
              accept=".pdf"
              class="upload-label__input"
              @change="uploadCv"
            />
            <span class="btn btn--primary" :class="{ 'btn--disabled': cvLoading }">
              {{ cvLoading ? 'Завантаження...' : '+ Завантажити CV (PDF)' }}
            </span>
          </label>
          <p class="cv-hint">Лише PDF, до 5 МБ</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { profileApi } from '@/api/profile'

const loading = ref(true)
const loadError = ref('')
const profile = ref(null)
const eligibility = ref(null)

const editing = ref(false)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

const cvLoading = ref(false)
const cvError = ref('')
const cvInput = ref(null)

const form = ref({
  studyProgram: '',
  yearOfStudy: '',
  profileAverageGrade: '',
  hasRepeatedSubjects: false,
  skills: '',
  bio: '',
})

const cvDownloadUrl = computed(() => 'http://localhost:8080/api/profile/me/cv')

onMounted(load)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [profileRes, eligRes] = await Promise.allSettled([
      profileApi.getMe(),
      profileApi.getEligibility(),
    ])
    if (profileRes.status === 'fulfilled') {
      profile.value = profileRes.value.data
    }
    if (eligRes.status === 'fulfilled') {
      eligibility.value = eligRes.value.data
    }
  } catch (e) {
    loadError.value = 'Не вдалося завантажити профіль'
  } finally {
    loading.value = false
  }
}

function startEdit() {
  form.value = {
    studyProgram: profile.value?.studyProgram || '',
    yearOfStudy: profile.value?.yearOfStudy || '',
    profileAverageGrade: profile.value?.profileAverageGrade || '',
    hasRepeatedSubjects: profile.value?.hasRepeatedSubjects || false,
    skills: profile.value?.skills || '',
    bio: profile.value?.bio || '',
  }
  saveError.value = ''
  saveSuccess.value = false
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  saveError.value = ''
  saveSuccess.value = false
}

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    const isNew = !profile.value
    const res = isNew
      ? await profileApi.createMe(form.value)
      : await profileApi.updateMe(form.value)
    profile.value = res.data
    editing.value = false
    saveSuccess.value = true
    const eligRes = await profileApi.getEligibility()
    eligibility.value = eligRes.data
  } catch (e) {
    saveError.value = e.response?.data?.message || e.response?.data || 'Помилка при збереженні'
  } finally {
    saving.value = false
  }
}

async function uploadCv(e) {
  const file = e.target.files?.[0]
  if (!file) return
  cvLoading.value = true
  cvError.value = ''
  try {
    await profileApi.uploadCv(file)
    await load()
  } catch (err) {
    cvError.value = err.response?.data?.message || 'Помилка завантаження CV'
  } finally {
    cvLoading.value = false
    if (cvInput.value) cvInput.value.value = ''
  }
}

async function removeCv() {
  cvLoading.value = true
  cvError.value = ''
  try {
    await profileApi.deleteCv()
    profile.value = { ...profile.value, cvFilePath: null, cvOriginalName: null, cvUploadedAt: null }
  } catch (err) {
    cvError.value = err.response?.data?.message || 'Помилка видалення CV'
  } finally {
    cvLoading.value = false
  }
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.page {
  width: 100%;
}

.page__head {
  margin-bottom: 1.75rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.page__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.page__sub {
  margin: 0;
  max-width: 36rem;
  color: #475569;
  line-height: 1.6;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Eligibility banner ── */
.elig-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.elig-banner--ok {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #065f46;
}

.elig-banner--warn {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #92400e;
}

.elig-banner__icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.elig-banner__list {
  margin: 0.4rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
}

/* ── Card ── */
.card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(79, 70, 229, 0.1);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  padding: 1.5rem;
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.card__head-actions {
  display: flex;
  gap: 0.5rem;
}

.card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

/* ── Form ── */
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field--full {
  grid-column: 1 / -1;
}

.field__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.field__input {
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: #f8fafc;
  font-size: 0.92rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
}

.field__input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  background: white;
}

.field__textarea {
  resize: vertical;
  min-height: 96px;
}

.field__value {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
  line-height: 1.5;
  padding: 0.35rem 0;
}

/* ── Toggle ── */
.toggle {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  padding: 0.35rem 0;
}

.toggle__input {
  display: none;
}

.toggle__track {
  width: 2.5rem;
  height: 1.4rem;
  border-radius: 999px;
  background: #cbd5e1;
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.toggle__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle__input:checked ~ .toggle__track {
  background: #4f46e5;
}

.toggle__input:checked ~ .toggle__track::after {
  transform: translateX(1.1rem);
}

.toggle__label {
  font-size: 0.92rem;
  color: #1e293b;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  text-decoration: none;
  white-space: nowrap;
}

.btn--primary {
  background: #4f46e5;
  color: white;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.22);
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #4338ca;
}

.btn--primary:disabled,
.btn--disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.btn--ghost {
  background: transparent;
  color: #4f46e5;
  border: 1px solid rgba(79, 70, 229, 0.3);
}

.btn--ghost:hover {
  background: rgba(79, 70, 229, 0.06);
}

.btn--danger {
  background: transparent;
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.3);
}

.btn--danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.06);
}

.btn--danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── CV section ── */
.cv-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.04);
  border: 1px solid rgba(79, 70, 229, 0.1);
  flex-wrap: wrap;
}

.cv-row__icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.cv-row__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.cv-row__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cv-row__date {
  font-size: 0.78rem;
  color: #64748b;
}

.cv-empty {
  color: #94a3b8;
  font-size: 0.9rem;
  padding: 0.5rem 0 0.75rem;
}

.cv-upload {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.upload-label {
  cursor: pointer;
}

.upload-label__input {
  display: none;
}

.cv-hint {
  margin: 0;
  font-size: 0.78rem;
  color: #94a3b8;
}

/* ── Alerts ── */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.88rem;
  margin-bottom: 0.75rem;
}

.alert--error {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.25);
  color: #991b1b;
}

.alert--ok {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #065f46;
}

.state-msg {
  color: #94a3b8;
  padding: 3rem;
  text-align: center;
}

@media (max-width: 640px) {
  .form__row {
    grid-template-columns: 1fr;
  }

  .card__head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
