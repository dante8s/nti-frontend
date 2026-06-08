<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import { fetchProfilePhotoBlob, getProfile } from '@/api/profileApi'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const isAdmin = computed(() =>
  auth.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
)

const route = useRoute()
const router = useRouter()

const userId = computed(() => Number(route.params.userId))

/** Безпечне повернення з потоку комісії (query `back=/app/...`). */
const commissionBackTo = computed(() => {
  const b = route.query.back
  if (typeof b !== 'string' || !b) return null
  try {
    const decoded = decodeURIComponent(b)
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
    return decoded
  } catch {
    return null
  }
})

const loading = ref(true)
const error = ref('')
const profile = ref(null)
const cvOpening = ref(false)
/** Перегляд PDF у застосунку (без window.open) — працює у вбудованих переглядачах на кшталт Cursor Browser. */
const cvModalOpen = ref(false)
const cvBlobUrl = ref('')
const avatarHeadUrl = ref('')

function releaseAvatarHead() {
  if (avatarHeadUrl.value.startsWith('blob:'))
    URL.revokeObjectURL(avatarHeadUrl.value)
  avatarHeadUrl.value = ''
}

async function loadAvatarHead(uid) {
  releaseAvatarHead()
  if (!profile.value?.avatarFilePath)
    return
  try {
    const res = await fetchProfilePhotoBlob(uid)
    avatarHeadUrl.value = URL.createObjectURL(res.data)
  } catch {
    /* ignore */
  }
}

async function load() {
  const uid = userId.value
  if (!Number.isFinite(uid) || uid < 1) {
    error.value = 'Некоректний ідентифікатор користувача.'
    profile.value = null
    releaseAvatarHead()
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    profile.value = await getProfile(uid)
    await loadAvatarHead(uid)
  } catch (e) {
    if (e?.response?.status === 403) {
      error.value =
        'Немає доступу до цього профілю (доступ мають власник, адміністратор або учасники тієї самої команди).'
    } else if (e?.response?.status === 404) {
      error.value = 'Профіль не знайдено або ще не заповнено.'
    } else {
      error.value =
        e?.response?.data?.message || 'Не вдалося завантажити профіль. Спробуйте пізніше.'
    }
    profile.value = null
    releaseAvatarHead()
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(userId, load)

function closeCvModal() {
  if (cvBlobUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(cvBlobUrl.value)
  }
  cvBlobUrl.value = ''
  cvModalOpen.value = false
}

let escDismiss = null
watch(cvModalOpen, (open) => {
  if (escDismiss) {
    window.removeEventListener('keydown', escDismiss)
    escDismiss = null
  }
  if (!open)
    return
  escDismiss = (e) => {
    if (e.key === 'Escape')
      closeCvModal()
  }
  window.addEventListener('keydown', escDismiss)
})

onUnmounted(() => {
  if (escDismiss) {
    window.removeEventListener('keydown', escDismiss)
    escDismiss = null
  }
  closeCvModal()
  releaseAvatarHead()
})

async function openCv() {
  const uid = userId.value
  if (!hasCv.value)
    return
  cvOpening.value = true
  error.value = ''
  try {
    const res = await api.get(`/api/profile/${uid}/cv`, { responseType: 'blob' })
    cvBlobUrl.value = URL.createObjectURL(res.data)
    cvModalOpen.value = true
  } catch (e) {
    if (e?.response?.status === 404) {
      error.value = 'CV ще не завантажене.'
    } else {
      error.value = 'Не вдалося відкрити CV.'
    }
  } finally {
    cvOpening.value = false
  }
}

const hasCv = computed(() => {
  if (!profile.value)
    return false
  return Boolean(profile.value.cvFilePath)
})
</script>

<template>
  <div class="page">
    <div class="back">
      <router-link v-if="commissionBackTo" class="back-link" :to="commissionBackTo">← Назад</router-link>
      <a v-else href="#" class="back-link" @click.prevent="router.back()">← Назад</a>
    </div>

    <div class="card">
      <div v-if="!loading && !error && profile" class="member-head">
        <div class="member-avatar" aria-hidden="true">
          <img v-if="avatarHeadUrl" class="member-avatar__img" :src="avatarHeadUrl" alt="">
          <span v-else class="member-avatar__ph">?</span>
        </div>
        <div class="member-head__main">
          <h1>Профіль учасника</h1>
          <p class="subtitle">
            <template v-if="isAdmin">Ідентифікатор користувача: <strong>{{ userId }}</strong></template>
          </p>
        </div>
      </div>
      <template v-else>
        <h1>Профіль учасника</h1>
        <p class="subtitle">
          Ідентифікатор користувача: <strong>{{ userId }}</strong>
        </p>
      </template>

      <p v-if="loading" class="muted">
        Завантаження…
      </p>
      <p v-else-if="error" class="error">
        {{ error }}
      </p>

      <template v-else-if="profile">
        <dl class="grid">
          <div>
            <dt>Навчальна програма</dt>
            <dd>{{ profile.studyProgram || '—' }}</dd>
          </div>
          <div>
            <dt>Курс</dt>
            <dd>{{ profile.yearOfStudy ?? '—' }}</dd>
          </div>
          <div class="full">
            <dt>Навички</dt>
            <dd>{{ profile.skills || '—' }}</dd>
          </div>
          <div class="full">
            <dt>Про себе</dt>
            <dd>{{ profile.bio || '—' }}</dd>
          </div>
          <div>
            <dt>Середній бал</dt>
            <dd>{{ profile.profileAverageGrade ?? '—' }}</dd>
          </div>
          <div>
            <dt>Є перездачі</dt>
            <dd>{{ profile.hasRepeatedSubjects ? 'Так' : 'Ні' }}</dd>
          </div>
        </dl>

        <div class="cv-row">
          <div>
            <span class="label">CV</span>
            <span class="cv-name">{{ profile.cvOriginalName || 'не завантажено' }}</span>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="!hasCv || cvOpening"
            @click="openCv"
          >
            {{ cvOpening ? 'Відкриття…' : 'Відкрити CV' }}
          </button>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <div
        v-if="cvModalOpen && cvBlobUrl"
        class="cv-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Перегляд CV"
        @click.self="closeCvModal"
      >
        <div class="cv-modal-panel">
          <div class="cv-modal-bar">
            <span class="cv-modal-title">CV — PDF</span>
            <button type="button" class="btn-close" @click="closeCvModal">
              Закрити
            </button>
          </div>
          <iframe class="cv-iframe" title="CV (PDF)" :src="cvBlobUrl" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem;
}

.back {
  margin-bottom: 1rem;
}

.back-link {
  color: #4f46e5;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  text-decoration: underline;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.member-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.member-head__main h1 {
  margin: 0 0 0.35rem;
}

.member-head__main .subtitle {
  margin: 0;
}

.member-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-avatar__ph {
  font-size: 1.25rem;
  font-weight: 700;
  color: #94a3b8;
}

h1 {
  font-size: 1.35rem;
  margin: 0 0 0.35rem;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 1.25rem;
  color: #64748b;
  font-size: 0.9rem;
}

.muted {
  color: #64748b;
}

.error {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.25rem;
  margin: 0;
}

.grid .full {
  grid-column: 1 / -1;
}

dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 0.25rem;
}

dd {
  margin: 0;
  font-size: 0.9rem;
  color: #0f172a;
  white-space: pre-wrap;
}

.cv-row {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}

.cv-name {
  font-size: 0.9rem;
  color: #0f172a;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cv-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.55);
}

.cv-modal-panel {
  display: flex;
  flex-direction: column;
  width: min(960px, 100%);
  height: min(88vh, 900px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.cv-modal-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.cv-modal-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.btn-close {
  padding: 0.35rem 0.65rem;
  font-size: 0.8125rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.btn-close:hover {
  background: #f1f5f9;
}

.cv-iframe {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: 0;
}
</style>
