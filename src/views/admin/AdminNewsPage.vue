<script setup>
import { ref, computed, onMounted, reactive } from 'vue'

const API_BASE = '/api/admin/cms/articles'
const EXCERPT_MAX = 300

const CATEGORIES = ['Oznamy', 'Udalosti', 'Technológie', 'Projekty']

const SK_MONTHS = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December',
]

const articles = ref([])
const isLoading = ref(true)
const error = ref('')
const success = ref('')
const saving = ref(false)
const deletingId = ref(null)
const uploading = ref(false)
const workspaceMode = ref(null) // null | 'create' | 'edit'
const editingId = ref(null)
const pendingImageFile = ref(null)

const form = reactive({
  title: '',
  category: 'Oznamy',
  excerpt: '',
  content: '',
  published: false,
  image: null,
})

const sortedArticles = computed(() =>
  [...articles.value].sort((a, b) => {
    const dateA = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0)
    const dateB = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0)
    return dateB - dateA
  })
)

const workspaceOpen = computed(() => workspaceMode.value !== null)
const isCreateMode = computed(() => workspaceMode.value === 'create')
const excerptRemaining = computed(() => EXCERPT_MAX - (form.excerpt?.length ?? 0))

function formatArticleDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}. ${SK_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function normalizeArticle(raw) {
  return {
    id: raw.id,
    title: raw.title ?? '',
    category: raw.category ?? '',
    excerpt: raw.excerpt ?? '',
    content: raw.content ?? '',
    image: raw.image ?? raw.imageUrl ?? null,
    published: raw.published === true,
    publishedAt: raw.publishedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    date: formatArticleDate(raw.publishedAt || raw.updatedAt || raw.createdAt),
  }
}

function authHeaders(json = true) {
  const token = localStorage.getItem('token')
  if (!token) return null
  const headers = { Authorization: `Bearer ${token}` }
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

function flashSuccess(message) {
  success.value = message
  setTimeout(() => { success.value = '' }, 3000)
}

async function apiFetch(url, options = {}) {
  const headers = authHeaders(options.body != null && !(options.body instanceof FormData))
  if (!headers) {
    error.value = 'Chýba autorizačný token. Prihláste sa ako administrátor.'
    throw new Error('Missing token')
  }

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `HTTP ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

function toPayload() {
  return {
    title: form.title.trim(),
    category: form.category,
    excerpt: form.excerpt.trim(),
    content: form.content,
  }
}

function resetForm() {
  Object.assign(form, {
    title: '',
    category: 'Oznamy',
    excerpt: '',
    content: '',
    published: false,
    image: null,
  })
  pendingImageFile.value = null
}

function openCreateWorkspace() {
  workspaceMode.value = 'create'
  editingId.value = null
  resetForm()
  error.value = ''
}

function openEditWorkspace(article) {
  workspaceMode.value = 'edit'
  editingId.value = article.id
  pendingImageFile.value = null
  Object.assign(form, {
    title: article.title,
    category: article.category || 'Oznamy',
    excerpt: article.excerpt,
    content: article.content,
    published: article.published,
    image: article.image,
  })
  error.value = ''
}

function closeWorkspace() {
  workspaceMode.value = null
  editingId.value = null
  pendingImageFile.value = null
  resetForm()
}

async function loadArticles() {
  isLoading.value = true
  error.value = ''
  try {
    const data = await apiFetch(API_BASE)
    articles.value = (Array.isArray(data) ? data : []).map(normalizeArticle)
  } catch (e) {
    if (!error.value) {
      error.value = e.message || 'Nepodarilo sa načítať články.'
    }
    articles.value = []
  } finally {
    isLoading.value = false
  }
}

async function syncPublishState(id, published) {
  return apiFetch(`${API_BASE}/${id}/publish?publish=${published}`, { method: 'PATCH' })
}

async function uploadImage(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch(`${API_BASE}/${id}/image`, {
    method: 'POST',
    body: formData,
  })
}

function onImageSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  pendingImageFile.value = file
  form.image = URL.createObjectURL(file)
  event.target.value = ''
}

async function saveArticle() {
  if (!form.title.trim()) {
    error.value = 'Nadpis článku je povinný.'
    return
  }
  if (!form.content.trim()) {
    error.value = 'Obsah článku je povinný.'
    return
  }

  saving.value = true
  error.value = ''

  try {
    let saved

    if (isCreateMode.value) {
      saved = await apiFetch(API_BASE, {
        method: 'POST',
        body: JSON.stringify(toPayload()),
      })
      saved = normalizeArticle(saved)

      if (form.published) {
        saved = normalizeArticle(await syncPublishState(saved.id, true))
      }

      if (pendingImageFile.value) {
        uploading.value = true
        saved = normalizeArticle(await uploadImage(saved.id, pendingImageFile.value))
        pendingImageFile.value = null
        uploading.value = false
      }

      articles.value.push(saved)
      flashSuccess('Nový článok bol vytvorený.')
      openEditWorkspace(saved)
      workspaceMode.value = 'edit'
      editingId.value = saved.id
    } else {
      const id = editingId.value
      saved = await apiFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(toPayload()),
      })
      saved = normalizeArticle(saved)

      const current = articles.value.find((a) => a.id === id)
      if (current && current.published !== form.published) {
        saved = normalizeArticle(await syncPublishState(id, form.published))
      }

      if (pendingImageFile.value) {
        uploading.value = true
        saved = normalizeArticle(await uploadImage(id, pendingImageFile.value))
        pendingImageFile.value = null
        uploading.value = false
      }

      const idx = articles.value.findIndex((a) => a.id === id)
      if (idx !== -1) articles.value[idx] = saved

      Object.assign(form, {
        published: saved.published,
        image: saved.image,
      })

      flashSuccess('Článok bol uložený.')
    }
  } catch (e) {
    error.value = e.message || 'Uloženie článku zlyhalo.'
  } finally {
    saving.value = false
    uploading.value = false
  }
}

async function deleteArticle(article) {
  if (!window.confirm(`Naozaj chcete odstrániť článok „${article.title}"?`)) {
    return
  }

  deletingId.value = article.id
  error.value = ''

  try {
    await apiFetch(`${API_BASE}/${article.id}`, { method: 'DELETE' })
    articles.value = articles.value.filter((a) => a.id !== article.id)
    if (editingId.value === article.id) closeWorkspace()
    flashSuccess('Článok bol odstránený.')
  } catch (e) {
    error.value = e.message || 'Odstránenie článku zlyhalo.'
  } finally {
    deletingId.value = null
  }
}

onMounted(loadArticles)
</script>

<template>
  <div class="news-admin">
    <header class="news-admin__header">
      <div>
        <h1 class="news-admin__title">Správa noviniek</h1>
        <p class="news-admin__subtitle">
          Vytvárajte, upravujte a publikujte články zobrazené na verejnej stránke Novinky.
        </p>
      </div>
      <button
        type="button"
        class="btn btn--create"
        @click="openCreateWorkspace"
      >
        ＋ Pridať nový článok
      </button>
    </header>

    <div v-if="error" class="news-admin__banner news-admin__banner--error" role="alert">
      {{ error }}
    </div>
    <div v-if="success" class="news-admin__banner news-admin__banner--success" role="status">
      {{ success }}
    </div>

    <div v-if="isLoading" class="news-admin__loading">
      <span class="spinner" aria-hidden="true"></span>
      Načítavam články...
    </div>

    <div v-else class="news-admin__layout" :class="{ 'news-admin__layout--split': workspaceOpen }">
      <!-- Overview directory -->
      <section class="overview">
        <h2 class="overview__title">Prehľad článkov</h2>

        <p v-if="!sortedArticles.length" class="overview__empty">
          Zatiaľ žiadne články. Pridajte prvý kliknutím na „Pridať nový článok“.
        </p>

        <div v-else class="overview__grid">
          <article
            v-for="article in sortedArticles"
            :key="article.id"
            class="overview-card"
            :class="{ 'overview-card--active': editingId === article.id }"
          >
            <div class="overview-card__thumb">
              <img
                :src="article.image || '/placeholder.jpg'"
                :alt="article.title"
              />
              <span v-if="!article.published" class="overview-card__draft">Koncept</span>
            </div>

            <div class="overview-card__body">
              <span class="overview-card__category">{{ article.category || '—' }}</span>
              <h3 class="overview-card__heading">{{ article.title }}</h3>
              <time class="overview-card__date">{{ article.date }}</time>
            </div>

            <div class="overview-card__actions">
              <button
                type="button"
                class="btn btn--edit"
                @click="openEditWorkspace(article)"
              >
                Upraviť
              </button>
              <button
                type="button"
                class="btn btn--danger"
                :disabled="deletingId === article.id"
                @click="deleteArticle(article)"
              >
                {{ deletingId === article.id ? 'Mažem...' : 'Vymazať' }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- Create / Edit workspace -->
      <section v-if="workspaceOpen" class="workspace">
        <div class="workspace__header">
          <h2 class="workspace__title">
            {{ isCreateMode ? 'Nová novinka' : 'Upraviť článok' }}
          </h2>
          <button type="button" class="btn btn--ghost" @click="closeWorkspace">
            Zavrieť
          </button>
        </div>

        <form class="workspace__form" @submit.prevent="saveArticle">
          <label class="field">
            <span class="field__label">Nadpis</span>
            <input v-model="form.title" type="text" class="field__input" required />
          </label>

          <label class="field">
            <span class="field__label">Kategória</span>
            <select v-model="form.category" class="field__input">
              <option v-for="cat in CATEGORIES" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">
              Perex
              <span class="field__hint">({{ excerptRemaining }} znakov zostáva)</span>
            </span>
            <textarea
              v-model="form.excerpt"
              rows="3"
              class="field__input field__textarea"
              :maxlength="EXCERPT_MAX"
              placeholder="Krátky úvodný text zobrazený v zozname článkov..."
            />
          </label>

          <label class="field">
            <span class="field__label">Obsah (HTML)</span>
            <textarea
              v-model="form.content"
              rows="12"
              class="field__input field__textarea field__textarea--code"
              required
              placeholder="<p>Váš obsah s HTML značkami...</p>"
            />
          </label>

          <div class="field">
            <span class="field__label">Obrázok článku</span>
            <div v-if="form.image" class="image-preview">
              <img :src="form.image" alt="Náhľad obrázka článku" />
            </div>
            <label class="upload">
              <input
                type="file"
                accept="image/*"
                :disabled="uploading"
                @change="onImageSelected"
              />
              <span>{{ uploading ? 'Nahrávam...' : 'Vybrať obrázok' }}</span>
            </label>
            <p v-if="isCreateMode && pendingImageFile" class="field__note">
              Obrázok sa nahrá po vytvorení článku.
            </p>
          </div>

          <label class="field field--inline">
            <input v-model="form.published" type="checkbox" />
            <span class="field__label">Publikované</span>
          </label>

          <div class="workspace__actions">
            <button type="submit" class="btn btn--primary" :disabled="saving || uploading">
              {{ saving ? 'Ukladám...' : (isCreateMode ? 'Vytvoriť' : 'Uložiť zmeny') }}
            </button>
            <button type="button" class="btn btn--ghost" @click="closeWorkspace">
              Zrušiť
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.news-admin {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.news-admin__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.news-admin__title {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.news-admin__subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.5;
  max-width: 36rem;
}

.news-admin__banner {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
}

.news-admin__banner--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.news-admin__banner--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}

.news-admin__loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #64748b;
}

.spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #cbd5e1;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.news-admin__layout {
  display: block;
}

.news-admin__layout--split {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 1.5rem;
  align-items: start;
}

.overview__title,
.workspace__title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.overview__empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 1rem;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 0.875rem;
}

.overview__grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.overview-card {
  display: grid;
  grid-template-columns: 88px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.85rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.overview-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
}

.overview-card--active {
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
}

.overview-card__thumb {
  position: relative;
  width: 88px;
  height: 64px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f1f5f9;
}

.overview-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overview-card__draft {
  position: absolute;
  bottom: 0.2rem;
  left: 0.2rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
}

.overview-card__body {
  min-width: 0;
}

.overview-card__category {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #047857;
  background: #ecfdf5;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
}

.overview-card__heading {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-card__date {
  font-size: 0.75rem;
  color: #94a3b8;
}

.overview-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.workspace {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  padding: 1.25rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  position: sticky;
  top: 1rem;
}

.workspace__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.workspace__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.workspace__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.field__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.field__hint {
  font-weight: 400;
  color: #94a3b8;
}

.field__note {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.field__input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font: inherit;
  color: #0f172a;
  background: #fff;
}

.field__input:focus {
  outline: 2px solid rgba(22, 163, 74, 0.2);
  border-color: #4ade80;
}

.field__textarea {
  resize: vertical;
  min-height: 4.5rem;
  line-height: 1.5;
}

.field__textarea--code {
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.85rem;
}

.image-preview {
  margin-bottom: 0.5rem;
}

.image-preview img {
  width: 100%;
  max-width: 280px;
  max-height: 160px;
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.upload {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #16a34a;
  font-size: 0.875rem;
  font-weight: 600;
}

.upload input {
  display: none;
}

.btn {
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--create {
  background: #16a34a;
  color: #fff;
  flex-shrink: 0;
}

.btn--create:hover {
  background: #15803d;
}

.btn--primary {
  background: #4f46e5;
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn--edit {
  background: #fff;
  color: #4f46e5;
  border-color: #c7d2fe;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
}

.btn--edit:hover {
  background: #eef2ff;
}

.btn--danger {
  background: #fff;
  color: #b91c1c;
  border-color: #fecaca;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
}

.btn--danger:hover:not(:disabled) {
  background: #fef2f2;
}

.btn--ghost {
  background: #fff;
  color: #475569;
  border-color: #cbd5e1;
}

.btn--ghost:hover:not(:disabled) {
  background: #f8fafc;
}

@media (max-width: 960px) {
  .news-admin__layout--split {
    grid-template-columns: 1fr;
  }

  .workspace {
    position: static;
  }

  .overview-card {
    grid-template-columns: 72px 1fr;
    grid-template-rows: auto auto;
  }

  .overview-card__actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
  }
}

@media (max-width: 600px) {
  .news-admin__header {
    flex-direction: column;
  }

  .btn--create {
    width: 100%;
  }
}
</style>
