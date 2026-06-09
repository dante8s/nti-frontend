<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import FaqPage from '@/views/public/FaqPage.vue'

const PAGE_KEY = 'faq'
const API_BASE = '/api/admin/cms'

const sections = ref([])
const isLoading = ref(true)
const error = ref('')
const success = ref('')
const isPreview = ref(false)
const expandedIds = ref(new Set())
const savingId = ref(null)
const deletingId = ref(null)
const creating = ref(false)
const showCreateForm = ref(false)

const newItem = reactive({
  title: '',
  content: '',
  sortOrder: 0,
  published: true,
})

const faqItems = computed(() =>
  [...sections.value]
    .filter((s) => s.sectionType === 'faq_item')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

const previewItems = computed(() => faqItems.value)

function authHeaders() {
  const token = localStorage.getItem('token')
  if (!token) return null
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function flashSuccess(message) {
  success.value = message
  setTimeout(() => { success.value = '' }, 3000)
}

async function apiFetch(url, options = {}) {
  const headers = authHeaders()
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

function toPayload(item) {
  return {
    sectionType: 'faq_item',
    title: item.title ?? '',
    subtitle: '',
    content: item.content ?? '',
    icon: '',
    sortOrder: item.sortOrder ?? 0,
    published: item.published !== false,
  }
}

function isExpanded(id) {
  return expandedIds.value.has(id)
}

function toggleExpanded(id) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

async function loadSections() {
  isLoading.value = true
  error.value = ''
  try {
    const data = await apiFetch(`${API_BASE}/pages/${PAGE_KEY}/sections`)
    sections.value = Array.isArray(data) ? data : []
  } catch (e) {
    if (!error.value) {
      error.value = e.message || 'Nepodarilo sa načítať FAQ položky.'
    }
    sections.value = []
  } finally {
    isLoading.value = false
  }
}

function openCreateForm() {
  const maxOrder = faqItems.value.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), -1)
  Object.assign(newItem, {
    title: '',
    content: '',
    sortOrder: maxOrder + 1,
    published: true,
  })
  showCreateForm.value = true
  expandedIds.value = new Set(['__new__'])
  isPreview.value = false
}

function cancelCreate() {
  showCreateForm.value = false
  expandedIds.value.delete('__new__')
}

async function createItem() {
  if (!newItem.title.trim()) {
    error.value = 'Otázka je povinná.'
    return
  }
  if (!newItem.content.trim()) {
    error.value = 'Odpoveď je povinná.'
    return
  }

  creating.value = true
  error.value = ''
  try {
    const created = await apiFetch(`${API_BASE}/pages/${PAGE_KEY}/sections`, {
      method: 'POST',
      body: JSON.stringify(toPayload(newItem)),
    })
    sections.value.push(created)
    showCreateForm.value = false
    expandedIds.value = new Set([created.id])
    flashSuccess('Nová otázka bola vytvorená.')
  } catch (e) {
    error.value = e.message || 'Vytvorenie otázky zlyhalo.'
  } finally {
    creating.value = false
  }
}

async function saveItem(item) {
  savingId.value = item.id
  error.value = ''
  try {
    const updated = await apiFetch(`${API_BASE}/pages/sections/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify(toPayload(item)),
    })
    const idx = sections.value.findIndex((s) => s.id === item.id)
    if (idx !== -1) sections.value[idx] = updated
    flashSuccess('Otázka bola uložená.')
  } catch (e) {
    error.value = e.message || 'Uloženie otázky zlyhalo.'
  } finally {
    savingId.value = null
  }
}

async function deleteItem(item) {
  if (!window.confirm(`Naozaj chcete odstrániť otázku „${item.title}"?`)) return

  deletingId.value = item.id
  error.value = ''
  try {
    await apiFetch(`${API_BASE}/pages/sections/${item.id}`, { method: 'DELETE' })
    sections.value = sections.value.filter((s) => s.id !== item.id)
    expandedIds.value.delete(item.id)
    flashSuccess('Otázka bola odstránená.')
  } catch (e) {
    error.value = e.message || 'Odstránenie otázky zlyhalo.'
  } finally {
    deletingId.value = null
  }
}

onMounted(loadSections)
</script>

<template>
  <div class="faq-admin">
    <header class="faq-admin__header">
      <div>
        <h1 class="faq-admin__title">Správa FAQ</h1>
        <p class="faq-admin__subtitle">
          Spravujte často kladené otázky zobrazené na verejnej stránke.
        </p>
      </div>

      <div class="mode-toggle" role="tablist" aria-label="Režim zobrazenia">
        <button
          type="button"
          class="mode-toggle__btn"
          :class="{ 'mode-toggle__btn--active': !isPreview }"
          role="tab"
          :aria-selected="!isPreview"
          @click="isPreview = false"
        >
          Režim úprav
        </button>
        <button
          type="button"
          class="mode-toggle__btn"
          :class="{ 'mode-toggle__btn--active': isPreview }"
          role="tab"
          :aria-selected="isPreview"
          @click="isPreview = true"
        >
          Živý náhľad
        </button>
      </div>
    </header>

    <div v-if="error" class="banner banner--error" role="alert">{{ error }}</div>
    <div v-if="success" class="banner banner--success" role="status">{{ success }}</div>

  <!-- Preview mode -->
    <div v-if="isPreview" class="preview-wrapper">
      <FaqPage :items="previewItems" preview />
    </div>

    <!-- Edit mode -->
    <template v-else>
      <div v-if="isLoading" class="faq-admin__loading">
        <span class="spinner" aria-hidden="true"></span>
        Načítavam FAQ...
      </div>

      <template v-else>
        <div class="faq-admin__toolbar">
          <button type="button" class="btn btn--create" @click="openCreateForm">
            ＋ Pridať novú otázku
          </button>
        </div>

        <div class="faq-admin__list">
          <!-- Create card -->
          <article v-if="showCreateForm" class="card card--new">
            <button
              type="button"
              class="card__header"
              @click="toggleExpanded('__new__')"
            >
              <strong>Nová otázka</strong>
              <span class="card__chevron">{{ isExpanded('__new__') ? '▾' : '▸' }}</span>
            </button>

            <div v-show="isExpanded('__new__')" class="card__body">
              <label class="field">
                <span class="field__label">Otázka</span>
                <input v-model="newItem.title" type="text" class="field__input" />
              </label>

              <label class="field">
                <span class="field__label">Odpoveď</span>
                <textarea v-model="newItem.content" rows="5" class="field__input field__textarea" />
              </label>

              <label class="field">
                <span class="field__label">Poradie (sort order)</span>
                <input v-model.number="newItem.sortOrder" type="number" min="0" class="field__input field__input--narrow" />
              </label>

              <label class="field field--inline">
                <input v-model="newItem.published" type="checkbox" />
                <span class="field__label">Publikované</span>
              </label>

              <div class="card__actions">
                <button type="button" class="btn btn--primary" :disabled="creating" @click="createItem">
                  {{ creating ? 'Vytváram...' : 'Vytvoriť' }}
                </button>
                <button type="button" class="btn btn--ghost" @click="cancelCreate">Zrušiť</button>
              </div>
            </div>
          </article>

          <!-- Existing items -->
          <article v-for="item in faqItems" :key="item.id" class="card">
            <button type="button" class="card__header" @click="toggleExpanded(item.id)">
              <div class="card__header-main">
                <span class="card__order">#{{ item.sortOrder ?? 0 }}</span>
                <strong>{{ item.title || 'Bez názvu' }}</strong>
                <span v-if="item.published === false" class="card__draft">Koncept</span>
              </div>
              <span class="card__chevron">{{ isExpanded(item.id) ? '▾' : '▸' }}</span>
            </button>

            <div v-show="isExpanded(item.id)" class="card__body">
              <label class="field">
                <span class="field__label">Otázka</span>
                <input v-model="item.title" type="text" class="field__input" />
              </label>

              <label class="field">
                <span class="field__label">Odpoveď</span>
                <textarea v-model="item.content" rows="5" class="field__input field__textarea" />
              </label>

              <label class="field">
                <span class="field__label">Poradie (sort order)</span>
                <input v-model.number="item.sortOrder" type="number" min="0" class="field__input field__input--narrow" />
              </label>

              <label class="field field--inline">
                <input v-model="item.published" type="checkbox" />
                <span class="field__label">Publikované</span>
              </label>

              <div class="card__actions">
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="savingId === item.id"
                  @click="saveItem(item)"
                >
                  {{ savingId === item.id ? 'Ukladám...' : 'Uložiť zmeny' }}
                </button>
                <button
                  type="button"
                  class="btn btn--danger"
                  :disabled="deletingId === item.id"
                  @click="deleteItem(item)"
                >
                  {{ deletingId === item.id ? 'Mažem...' : 'Vymazať' }}
                </button>
              </div>
            </div>
          </article>

          <p v-if="!faqItems.length && !showCreateForm" class="faq-admin__empty">
            Zatiaľ žiadne otázky. Pridajte prvú kliknutím na „Pridať novú otázku“.
          </p>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.faq-admin {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.faq-admin__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.faq-admin__title {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.faq-admin__subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.5;
}

.mode-toggle {
  display: flex;
  gap: 0.25rem;
  padding: 0.3rem;
  background: #f1f5f9;
  border-radius: 0.65rem;
}

.mode-toggle__btn {
  padding: 0.45rem 0.85rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.mode-toggle__btn--active {
  background: #fff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.banner {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
}

.banner--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.banner--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}

.faq-admin__loading {
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
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.faq-admin__toolbar {
  margin-bottom: 1rem;
}

.faq-admin__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.faq-admin__empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem;
}

/* Preview wrapper — resets admin padding context so FaqPage renders full-width inside */
.preview-wrapper {
  margin: 0 -1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  overflow: hidden;
  background: #f8fafc;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.card--new {
  border-color: #c7d2fe;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.card__header-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card__order {
  font-size: 0.72rem;
  font-weight: 700;
  color: #4f46e5;
  background: #eef2ff;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.card__draft {
  font-size: 0.68rem;
  font-weight: 700;
  color: #b45309;
  background: #fffbeb;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
}

.card__chevron {
  color: #94a3b8;
}

.card__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
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

.field__input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font: inherit;
  color: #0f172a;
}

.field__input:focus {
  outline: 2px solid rgba(79, 70, 229, 0.2);
  border-color: #818cf8;
}

.field__input--narrow {
  max-width: 120px;
}

.field__textarea {
  resize: vertical;
  min-height: 6rem;
  line-height: 1.5;
}

.btn {
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--create {
  background: #16a34a;
  color: #fff;
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

.btn--danger {
  background: #fff;
  color: #b91c1c;
  border-color: #fecaca;
}

.btn--ghost {
  background: #fff;
  color: #475569;
  border-color: #cbd5e1;
}

@media (max-width: 640px) {
  .faq-admin__header {
    flex-direction: column;
  }

  .mode-toggle {
    width: 100%;
  }

  .mode-toggle__btn {
    flex: 1;
  }
}
</style>
