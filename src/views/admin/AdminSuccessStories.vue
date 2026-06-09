<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'

const TABS = [
  { id: 'projects', label: 'Úspešné projekty' },
  { id: 'testimonials', label: 'Odporúčania & recenzie' },
  { id: 'stats', label: 'Globálne štatistiky' },
]

const PROJECT_STATUSES = ['Aktívny', 'Rozvoj', 'Pilot']

const API = {
  projects: '/api/public/cms/projects',
testimonials: '/api/admin/cms/testimonials',
  statsPage: '/api/public/cms/pages/success-stories',
}


const CMS = {
  projects: '/api/admin/cms/projects',
  testimonials: '/api/admin/cms/testimonials',
  sections: '/api/admin/cms/pages/success-stories/sections',
  section: (id) => `/api/admin/cms/pages/sections/${id}`,
}

const DEFAULT_STATS = [
  { id: null, number: '30+', label: 'Úspešných projektov', sortOrder: 0 },
  { id: null, number: '500K €', label: 'Získané investície', sortOrder: 1 },
  { id: null, number: '150+', label: 'Absolventov programov', sortOrder: 2 },
  { id: null, number: '95%', label: 'Spokojnosť účastníkov', sortOrder: 3 },
]

const activeTab = ref('projects')
const isLoading = ref(true)
const error = ref('')
const success = ref('')

const projects = ref([])
const testimonials = ref([])
const stats = ref([])

const projectWorkspace = ref(null) // null | 'create' | number (id)
const testimonialWorkspace = ref(null)
const saving = ref(false)
const deletingId = ref(null)
const uploading = ref(false)
const savingStatId = ref(null)
const pendingProjectImage = ref(null)
const pendingAvatarFile = ref(null)

const projectForm = reactive({
  title: '',
  investment: '',
  status: 'Aktívny',
  description: '',
  image: null,
  published: true,
})

const testimonialForm = reactive({
  name: '',
  role: '',
  quote: '',
  image: null,
  published: true,
})

const sortedProjects = computed(() =>
  [...projects.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

const sortedTestimonials = computed(() =>
  [...testimonials.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

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

async function fetchWithFallback(primaryUrl, fallbackUrl, options = {}) {
  try {
    return await apiFetch(primaryUrl, options)
  } catch {
    return apiFetch(fallbackUrl, options)
  }
}

function normalizeProject(raw) {
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    investment: raw.investment ?? raw.fundingAmount ?? '',
    status: raw.status ?? raw.statusLabel ?? '',
    image: raw.image ?? raw.imageUrl ?? null,
    sortOrder: raw.sortOrder ?? 0,
    published: raw.published !== false,
  }
}

function normalizeTestimonial(raw) {
  return {
    id: raw.id,
    name: raw.name ?? raw.authorName ?? '',
    role: raw.role ?? raw.authorRole ?? '',
    quote: raw.quote ?? '',
    image: raw.image ?? raw.avatarUrl ?? null,
    sortOrder: raw.sortOrder ?? 0,
    published: raw.published !== false,
  }
}

function normalizeStat(raw, index = 0) {
  return {
    id: raw.id ?? null,
    number: raw.number ?? raw.title ?? '',
    label: raw.label ?? raw.subtitle ?? '',
    sortOrder: raw.sortOrder ?? index,
  }
}

function statusClass(status) {
  return status ? String(status).toLowerCase() : ''
}

function projectPayload() {
  return {
    title: projectForm.title.trim(),
    description: projectForm.description.trim(),
    fundingAmount: projectForm.investment.trim(),
    statusLabel: projectForm.status,
    sortOrder: 0,
    published: projectForm.published,
  }
}

function testimonialPayload() {
  return {
    quote: testimonialForm.quote.trim(),
    authorName: testimonialForm.name.trim(),
    authorRole: testimonialForm.role.trim(),
    sortOrder: 0,
    published: testimonialForm.published,
  }
}

function statPayload(stat) {
  return {
    sectionType: 'stat',
    title: stat.number.trim(),
    subtitle: stat.label.trim(),
    sortOrder: stat.sortOrder,
    published: true,
  }
}

async function loadProjects() {
  const data = await fetchWithFallback(API.projects, CMS.projects)
  projects.value = (Array.isArray(data) ? data : []).map(normalizeProject)
}

async function loadTestimonials() {
  const data = await fetchWithFallback(API.testimonials, CMS.testimonials)
  testimonials.value = (Array.isArray(data) ? data : []).map(normalizeTestimonial)
}

async function loadStats() {
  try {
    const data = await apiFetch(API.stats)
    const list = (Array.isArray(data) ? data : []).map(normalizeStat)
    if (list.length) {
      stats.value = padStats(list)
      return
    }
  } catch {
    // fallback to CMS page sections
  }

  try {
    const sections = await apiFetch(CMS.sections)
    const fromSections = (Array.isArray(sections) ? sections : [])
      .filter((s) => s.sectionType === 'stat')
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(normalizeStat)

    stats.value = padStats(fromSections)
  } catch {
    stats.value = DEFAULT_STATS.map((s, i) => ({ ...s, sortOrder: i }))
  }
}

function padStats(list) {
  const padded = [...list]
  while (padded.length < 4) {
    const index = padded.length
    padded.push({
      id: null,
      number: DEFAULT_STATS[index]?.number ?? '',
      label: DEFAULT_STATS[index]?.label ?? '',
      sortOrder: index,
    })
  }
  return padded.slice(0, 4)
}

async function loadAll() {
  isLoading.value = true
  error.value = ''
  try {
    await Promise.all([loadProjects(), loadTestimonials(), loadStats()])
  } catch (e) {
    error.value = e.message || 'Nepodarilo sa načítať obsah stránky.'
  } finally {
    isLoading.value = false
  }
}

function resetProjectForm() {
  Object.assign(projectForm, {
    title: '',
    investment: '',
    status: 'Aktívny',
    description: '',
    image: null,
    published: true,
  })
  pendingProjectImage.value = null
}

function resetTestimonialForm() {
  Object.assign(testimonialForm, {
    name: '',
    role: '',
    quote: '',
    image: null,
    published: true,
  })
  pendingAvatarFile.value = null
}

function openProjectCreate() {
  projectWorkspace.value = 'create'
  resetProjectForm()
  error.value = ''
}

function openProjectEdit(project) {
  projectWorkspace.value = project.id
  pendingProjectImage.value = null
  Object.assign(projectForm, {
    title: project.title,
    investment: project.investment,
    status: project.status || 'Aktívny',
    description: project.description,
    image: project.image,
    published: project.published,
  })
  error.value = ''
}

function closeProjectWorkspace() {
  projectWorkspace.value = null
  resetProjectForm()
}

function openTestimonialCreate() {
  testimonialWorkspace.value = 'create'
  resetTestimonialForm()
  error.value = ''
}

function openTestimonialEdit(item) {
  testimonialWorkspace.value = item.id
  pendingAvatarFile.value = null
  Object.assign(testimonialForm, {
    name: item.name,
    role: item.role,
    quote: item.quote,
    image: item.image,
    published: item.published,
  })
  error.value = ''
}

function closeTestimonialWorkspace() {
  testimonialWorkspace.value = null
  resetTestimonialForm()
}

function onProjectImageSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  pendingProjectImage.value = file
  projectForm.image = URL.createObjectURL(file)
  event.target.value = ''
}

function onAvatarSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  pendingAvatarFile.value = file
  testimonialForm.image = URL.createObjectURL(file)
  event.target.value = ''
}

async function uploadProjectImage(id, file) {
  const fd = new FormData()
  fd.append('file', file)

  // Posielame obrázok priamo na overený admin endpoint bez zbytočných fallbackov
  return await apiFetch(`/api/admin/cms/projects/${id}/image`, {
    method: 'POST',
    body: fd,
  })
}

async function uploadTestimonialAvatar(id, file) {
  try {
    return await apiFetch(`${API.testimonials}/${id}/image`, {
      method: 'POST',
      body: (() => { const fd = new FormData(); fd.append('file', file); return fd })(),
    })
  } catch {
    const fd = new FormData()
    fd.append('file', file)
    return apiFetch(`${CMS.testimonials}/${id}/avatar`, { method: 'POST', body: fd })
  }
}

async function saveProject() {
  if (!projectForm.title.trim()) {
    error.value = 'Názov projektu je povinný.'
    return
  }

  saving.value = true
  error.value = ''

  try {
    let saved

    if (projectWorkspace.value === 'create') {
      // 1. Vytvorenie NOVÉHO projektu cez priamu ADMIN trasu
      saved = await apiFetch('/api/admin/cms/projects', {
        method: 'POST',
        body: JSON.stringify(projectPayload()),
      })
      saved = normalizeProject(saved)

      // Spracovanie obrázka po úspešnom vytvorení projektu
      if (pendingProjectImage.value) {
        uploading.value = true
        saved = normalizeProject(await uploadProjectImage(saved.id, pendingProjectImage.value))
        pendingProjectImage.value = null
        uploading.value = false
      }

      projects.value.push(saved)
      flashSuccess('Projekt bol vytvorený.')
      openProjectEdit(saved)
    } else {
      const id = projectWorkspace.value
      // 2. ÚPRAVA existujúceho projektu cez priamu ADMIN trasu
      saved = await apiFetch(`/api/admin/cms/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(projectPayload()),
      })
      saved = normalizeProject(saved)

      // Spracovanie obrázka po úspešnej úprave projektu
      if (pendingProjectImage.value) {
        uploading.value = true
        saved = normalizeProject(await uploadProjectImage(id, pendingProjectImage.value))
        pendingProjectImage.value = null
        uploading.value = false
      }

      const idx = projects.value.findIndex((p) => p.id === id)
      if (idx !== -1) projects.value[idx] = saved
      projectForm.image = saved.image
      flashSuccess('Projekt bol uložený.')
    }
  } catch (e) {
    error.value = e.message || 'Uloženie projektu zlyhalo.'
  } finally {
    saving.value = false
    uploading.value = false
  }
}

async function deleteProject(project) {
  if (!window.confirm(`Naozaj chcete odstrániť projekt „${project.title}"?`)) return

  deletingId.value = project.id
  error.value = ''

  try {
    // 💡 Posielame iba jednu čistú požiadavku priamo na správny admin endpoint
    await apiFetch(`/api/admin/cms/projects/${project.id}`, {
      method: 'DELETE'
    })

    // Aktualizácia frontendu po úspešnom zmazaní z DB
    projects.value = projects.value.filter((p) => p.id !== project.id)
    if (projectWorkspace.value === project.id) closeProjectWorkspace()

    flashSuccess('Projekt bol odstránený.')
  } catch (e) {
    error.value = e.message || 'Odstránenie projektu zlyhalo.'
  } finally {
    deletingId.value = null
  }
}

async function saveTestimonial() {
  if (!testimonialForm.name.trim() || !testimonialForm.quote.trim()) {
    error.value = 'Meno autora a citát sú povinné.'
    return
  }

  saving.value = true
  error.value = ''

  try {
    let saved

    if (testimonialWorkspace.value === 'create') {
      saved = await fetchWithFallback(API.testimonials, CMS.testimonials, {
        method: 'POST',
        body: JSON.stringify(testimonialPayload()),
      })
      saved = normalizeTestimonial(saved)

      if (pendingAvatarFile.value) {
        uploading.value = true
        saved = normalizeTestimonial(await uploadTestimonialAvatar(saved.id, pendingAvatarFile.value))
        pendingAvatarFile.value = null
        uploading.value = false
      }

      testimonials.value.push(saved)
      flashSuccess('Odporúčanie bolo vytvorené.')
      openTestimonialEdit(saved)
    } else {
      const id = testimonialWorkspace.value
      saved = await fetchWithFallback(`${API.testimonials}/${id}`, `${CMS.testimonials}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(testimonialPayload()),
      })
      saved = normalizeTestimonial(saved)

      if (pendingAvatarFile.value) {
        uploading.value = true
        saved = normalizeTestimonial(await uploadTestimonialAvatar(id, pendingAvatarFile.value))
        pendingAvatarFile.value = null
        uploading.value = false
      }

      const idx = testimonials.value.findIndex((t) => t.id === id)
      if (idx !== -1) testimonials.value[idx] = saved
      testimonialForm.image = saved.image
      flashSuccess('Odporúčanie bolo uložené.')
    }
  } catch (e) {
    error.value = e.message || 'Uloženie odporúčania zlyhalo.'
  } finally {
    saving.value = false
    uploading.value = false
  }
}

async function deleteTestimonial(item) {
  if (!window.confirm(`Naozaj chcete odstrániť odporúčanie od „${item.name}"?`)) return

  deletingId.value = item.id
  error.value = ''

  try {
    try {
      await apiFetch(`${API.testimonials}/${item.id}`, { method: 'DELETE' })
    } catch {
      await apiFetch(`${CMS.testimonials}/${item.id}`, { method: 'DELETE' })
    }
    testimonials.value = testimonials.value.filter((t) => t.id !== item.id)
    if (testimonialWorkspace.value === item.id) closeTestimonialWorkspace()
    flashSuccess('Odporúčanie bolo odstránené.')
  } catch (e) {
    error.value = e.message || 'Odstránenie odporúčania zlyhalo.'
  } finally {
    deletingId.value = null
  }
}

async function saveStat(stat, index) {
  if (!stat.number.trim() || !stat.label.trim()) {
    error.value = 'Číslo aj popisok štatistiky sú povinné.'
    return
  }

  savingStatId.value = stat.id ?? `new-${index}`
  error.value = ''

  try {
    let saved

    if (stat.id) {
      // 1. UPDATE: Ak štatistika už existuje, posielame PUT na konkrétne ID sekcie
      saved = await apiFetch(`/api/admin/cms/pages/sections/${stat.id}`, {
        method: 'PUT',
        body: JSON.stringify(statPayload(stat)),
      })
    } else {
      // 2. CREATE: Ak je to nová štatistika, posielame POST na success-stories stránku
      saved = await apiFetch('/api/admin/cms/pages/success-stories/sections', {
        method: 'POST',
        body: JSON.stringify(statPayload({ ...stat, sortOrder: index })),
      })
    }

    // Normalizácia a uloženie do reaktívneho stavu frontendu
    saved = normalizeStat(saved, index)
    stats.value[index] = saved
    flashSuccess('Štatistika bola uložená.')
  } catch (e) {
    error.value = e.message || 'Uloženie štatistiky zlyhalo.'
  } finally {
    savingStatId.value = null
  }
}

watch(activeTab, () => {
  error.value = ''
})

onMounted(loadAll)
</script>

<template>
  <div class="ss-admin">
    <header class="ss-admin__header">
      <div>
        <h1 class="ss-admin__title">Správa úspešných príbehov</h1>
        <p class="ss-admin__subtitle">
          Spravujte projekty, odporúčania a globálne štatistiky na stránke Úspešné projekty.
        </p>
      </div>
    </header>

    <nav class="tabs" aria-label="Sekcie správy">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        class="tabs__btn"
        :class="{ 'tabs__btn--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div v-if="error" class="banner banner--error" role="alert">{{ error }}</div>
    <div v-if="success" class="banner banner--success" role="status">{{ success }}</div>

    <div v-if="isLoading" class="ss-admin__loading">
      <span class="spinner" aria-hidden="true"></span>
      Načítavam obsah...
    </div>

    <template v-else>
      <!-- Tab 1: Projects -->
      <section v-show="activeTab === 'projects'" class="panel">
        <div class="panel__toolbar">
          <h2 class="panel__heading">Úspešné projekty</h2>
          <button type="button" class="btn btn--create" @click="openProjectCreate">
            ＋ Pridať nový projekt
          </button>
        </div>

        <div class="panel__layout" :class="{ 'panel__layout--split': projectWorkspace !== null }">
          <div class="list">
            <p v-if="!sortedProjects.length" class="list__empty">Zatiaľ žiadne projekty.</p>
            <article
              v-for="project in sortedProjects"
              :key="project.id"
              class="list-card"
              :class="{ 'list-card--active': projectWorkspace === project.id }"
            >
              <div class="list-card__thumb">
                <img :src="project.image || '/placeholder-project.jpg'" :alt="project.title" />
              </div>
              <div class="list-card__body">
                <h3>{{ project.title }}</h3>
                <div class="list-card__meta">
                  <span v-if="project.investment" class="chip chip--invest">{{ project.investment }}</span>
                  <span
                    v-if="project.status"
                    class="chip chip--status"
                    :class="statusClass(project.status)"
                  >
                    {{ project.status }}
                  </span>
                  <span v-if="!project.published" class="chip chip--draft">Koncept</span>
                </div>
              </div>
              <div class="list-card__actions">
                <button type="button" class="btn btn--edit" @click="openProjectEdit(project)">Upraviť</button>
                <button
                  type="button"
                  class="btn btn--danger"
                  :disabled="deletingId === project.id"
                  @click="deleteProject(project)"
                >
                  {{ deletingId === project.id ? 'Mažem...' : 'Vymazať' }}
                </button>
              </div>
            </article>
          </div>

          <aside v-if="projectWorkspace !== null" class="workspace">
            <div class="workspace__header">
              <h3>{{ projectWorkspace === 'create' ? 'Nový projekt' : 'Upraviť projekt' }}</h3>
              <button type="button" class="btn btn--ghost" @click="closeProjectWorkspace">Zavrieť</button>
            </div>

            <form class="workspace__form" @submit.prevent="saveProject">
              <label class="field">
                <span class="field__label">Názov</span>
                <input v-model="projectForm.title" type="text" class="field__input" required />
              </label>

              <label class="field">
                <span class="field__label">Investícia</span>
                <input v-model="projectForm.investment" type="text" class="field__input" placeholder="50 000 €" />
              </label>

              <label class="field">
                <span class="field__label">Stav</span>
                <select v-model="projectForm.status" class="field__input">
                  <option v-for="s in PROJECT_STATUSES" :key="s" :value="s">{{ s }}</option>
                </select>
              </label>

              <label class="field">
                <span class="field__label">Popis</span>
                <textarea v-model="projectForm.description" rows="4" class="field__input field__textarea" />
              </label>

              <div class="field">
                <span class="field__label">Obrázok projektu</span>
                <div v-if="projectForm.image" class="preview">
                  <img :src="projectForm.image" alt="Náhľad projektu" />
                </div>
                <label class="upload">
                  <input type="file" accept="image/*" :disabled="uploading" @change="onProjectImageSelected" />
                  <span>{{ uploading ? 'Nahrávam...' : 'Vybrať obrázok' }}</span>
                </label>
              </div>

              <label class="field field--inline">
                <input v-model="projectForm.published" type="checkbox" />
                <span class="field__label">Publikované</span>
              </label>

              <div class="workspace__actions">
                <button type="submit" class="btn btn--primary" :disabled="saving || uploading">
                  {{ saving ? 'Ukladám...' : 'Uložiť zmeny' }}
                </button>
                <button
                  v-if="projectWorkspace !== 'create'"
                  type="button"
                  class="btn btn--danger"
                  @click="deleteProject(projects.find(p => p.id === projectWorkspace))"
                >
                  Vymazať projekt
                </button>
              </div>
            </form>
          </aside>
        </div>
      </section>

      <!-- Tab 2: Testimonials -->
      <section v-show="activeTab === 'testimonials'" class="panel">
        <div class="panel__toolbar">
          <h2 class="panel__heading">Odporúčania & recenzie</h2>
          <button type="button" class="btn btn--create" @click="openTestimonialCreate">
            ＋ Pridať odporúčanie
          </button>
        </div>

        <div class="panel__layout" :class="{ 'panel__layout--split': testimonialWorkspace !== null }">
          <div class="list">
            <p v-if="!sortedTestimonials.length" class="list__empty">Zatiaľ žiadne odporúčania.</p>
            <article
              v-for="item in sortedTestimonials"
              :key="item.id"
              class="list-card list-card--quote"
              :class="{ 'list-card--active': testimonialWorkspace === item.id }"
            >
              <div class="list-card__avatar">
                <img :src="item.image || '/placeholder-avatar.svg'" :alt="item.name" />
              </div>
              <div class="list-card__body">
                <p class="quote-preview">„{{ item.quote }}“</p>
                <h3>{{ item.name }}</h3>
                <span class="role-preview">{{ item.role }}</span>
              </div>
              <div class="list-card__actions">
                <button type="button" class="btn btn--edit" @click="openTestimonialEdit(item)">Upraviť</button>
                <button
                  type="button"
                  class="btn btn--danger"
                  :disabled="deletingId === item.id"
                  @click="deleteTestimonial(item)"
                >
                  {{ deletingId === item.id ? 'Mažem...' : 'Vymazať' }}
                </button>
              </div>
            </article>
          </div>

          <aside v-if="testimonialWorkspace !== null" class="workspace">
            <div class="workspace__header">
              <h3>{{ testimonialWorkspace === 'create' ? 'Nové odporúčanie' : 'Upraviť odporúčanie' }}</h3>
              <button type="button" class="btn btn--ghost" @click="closeTestimonialWorkspace">Zavrieť</button>
            </div>

            <form class="workspace__form" @submit.prevent="saveTestimonial">
              <label class="field">
                <span class="field__label">Meno</span>
                <input v-model="testimonialForm.name" type="text" class="field__input" required />
              </label>

              <label class="field">
                <span class="field__label">Rola</span>
                <input
                  v-model="testimonialForm.role"
                  type="text"
                  class="field__input"
                  placeholder="Zakladateľ, AgriTech Solutions"
                />
              </label>

              <label class="field">
                <span class="field__label">Citát</span>
                <textarea v-model="testimonialForm.quote" rows="5" class="field__input field__textarea" required />
              </label>

              <div class="field">
                <span class="field__label">Avatar</span>
                <div v-if="testimonialForm.image" class="preview preview--round">
                  <img :src="testimonialForm.image" alt="Náhľad avatara" />
                </div>
                <label class="upload">
                  <input type="file" accept="image/*" :disabled="uploading" @change="onAvatarSelected" />
                  <span>{{ uploading ? 'Nahrávam...' : 'Vybrať avatar' }}</span>
                </label>
              </div>

              <label class="field field--inline">
                <input v-model="testimonialForm.published" type="checkbox" />
                <span class="field__label">Publikované</span>
              </label>

              <div class="workspace__actions">
                <button type="submit" class="btn btn--primary" :disabled="saving || uploading">
                  {{ saving ? 'Ukladám...' : 'Uložiť zmeny' }}
                </button>
                <button
                  v-if="testimonialWorkspace !== 'create'"
                  type="button"
                  class="btn btn--danger"
                  @click="deleteTestimonial(testimonials.find(t => t.id === testimonialWorkspace))"
                >
                  Vymazať
                </button>
              </div>
            </form>
          </aside>
        </div>
      </section>

      <!-- Tab 3: Stats -->
      <section v-show="activeTab === 'stats'" class="panel">
        <div class="panel__toolbar">
          <h2 class="panel__heading">Globálne štatistiky</h2>
          <p class="panel__hint">Upravte 4 číselné ukazovatele zobrazené v päte stránky.</p>
        </div>

        <div class="stats-list">
          <div v-for="(stat, index) in stats" :key="stat.id ?? `stat-${index}`" class="stat-row">
            <span class="stat-row__index">{{ index + 1 }}.</span>
            <label class="field field--compact">
              <span class="field__label">Číslo</span>
              <input v-model="stat.number" type="text" class="field__input" placeholder="30+" />
            </label>
            <label class="field field--compact">
              <span class="field__label">Popisok</span>
              <input v-model="stat.label" type="text" class="field__input" placeholder="Úspešných projektov" />
            </label>
            <button
              type="button"
              class="btn btn--primary btn--compact"
              :disabled="savingStatId === (stat.id ?? `new-${index}`)"
              @click="saveStat(stat, index)"
            >
              {{ savingStatId === (stat.id ?? `new-${index}`) ? 'Ukladám...' : 'Uložiť' }}
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.ss-admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.ss-admin__header {
  margin-bottom: 1.25rem;
}

.ss-admin__title {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.ss-admin__subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.5;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 1.25rem;
  padding: 0.35rem;
  background: #f1f5f9;
  border-radius: 0.75rem;
}

.tabs__btn {
  flex: 1;
  min-width: 140px;
  padding: 0.55rem 0.85rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.tabs__btn:hover {
  color: #0f172a;
}

.tabs__btn--active {
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

.ss-admin__loading {
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

.panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.panel__heading {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.panel__hint {
  margin: 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.panel__layout {
  display: block;
}

.panel__layout--split {
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  gap: 1.25rem;
  align-items: start;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.list__empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 0.875rem;
}

.list-card {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 0.85rem;
  align-items: center;
  padding: 0.85rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.list-card--quote {
  grid-template-columns: 48px 1fr auto;
}

.list-card:hover {
  border-color: #cbd5e1;
}

.list-card--active {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.12);
}

.list-card__thumb {
  width: 80px;
  height: 56px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f1f5f9;
}

.list-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e2e8f0;
}

.list-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-card__body {
  min-width: 0;
}

.list-card__body h3 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.list-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.quote-preview {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  color: #475569;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.role-preview {
  font-size: 0.75rem;
  color: #94a3b8;
}

.chip {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.chip--invest {
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
}

.chip--status.aktívny {
  background: #d1fae5;
  color: #065f46;
}

.chip--status.rozvoj {
  background: #dbeafe;
  color: #1e40af;
}

.chip--status.pilot {
  background: #fef3c7;
  color: #92400e;
}

.chip--draft {
  background: #fffbeb;
  color: #b45309;
}

.list-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.workspace {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  padding: 1.15rem;
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

.workspace__header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
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
  padding-top: 0.5rem;
  border-top: 1px solid #f1f5f9;
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

.field--compact {
  flex: 1;
  min-width: 0;
}

.field__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
}

.field__input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font: inherit;
  font-size: 0.875rem;
  color: #0f172a;
  background: #fff;
}

.field__input:focus {
  outline: 2px solid rgba(79, 70, 229, 0.2);
  border-color: #818cf8;
}

.field__textarea {
  resize: vertical;
  min-height: 5rem;
  line-height: 1.5;
}

.preview {
  margin-bottom: 0.5rem;
}

.preview img {
  width: 100%;
  max-width: 240px;
  max-height: 140px;
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.preview--round img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  max-width: none;
  max-height: none;
}

.upload {
  display: inline-flex;
  cursor: pointer;
  color: #4f46e5;
  font-size: 0.85rem;
  font-weight: 600;
}

.upload input {
  display: none;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat-row {
  display: grid;
  grid-template-columns: 2rem 1fr 1.5fr auto;
  gap: 0.75rem;
  align-items: end;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
}

.stat-row__index {
  font-weight: 700;
  color: #94a3b8;
  padding-bottom: 0.55rem;
}

.btn {
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.45rem 0.8rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
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

.btn--edit {
  background: #fff;
  color: #4f46e5;
  border-color: #c7d2fe;
  font-size: 0.78rem;
  padding: 0.3rem 0.55rem;
}

.btn--danger {
  background: #fff;
  color: #b91c1c;
  border-color: #fecaca;
  font-size: 0.78rem;
  padding: 0.3rem 0.55rem;
}

.btn--ghost {
  background: #fff;
  color: #475569;
  border-color: #cbd5e1;
}

.btn--compact {
  margin-bottom: 0.1rem;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .panel__layout--split {
    grid-template-columns: 1fr;
  }

  .workspace {
    position: static;
  }

  .stat-row {
    grid-template-columns: 1fr;
  }

  .stat-row__index {
    padding-bottom: 0;
  }

  .list-card {
    grid-template-columns: 64px 1fr;
    grid-template-rows: auto auto;
  }

  .list-card__actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
