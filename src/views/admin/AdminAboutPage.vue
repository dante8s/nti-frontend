<script setup>
import { ref, computed, onMounted, reactive } from 'vue'

const PAGE_KEY = 'about'
const API_BASE = '/api/admin/cms'

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero' },
  { value: 'mission-vision', label: 'Mission & Vision (header)' },
  { value: 'mission', label: 'Mission card' },
  { value: 'vision', label: 'Vision card' },
  { value: 'pillars', label: 'Pillars (header)' },
  { value: 'pillar-item', label: 'Pillar item' },
  { value: 'ecosystem', label: 'Ecosystem & Faculty' },
  { value: 'team', label: 'Team (header)' },
  { value: 'team-member', label: 'Team member' },
]

// --- SHARED STATE ---
const sections = ref([])
const isLoading = ref(true)
const error = ref('')

// --- ADMIN STATE ---
const expandedIds = ref(new Set())
const savingId = ref(null)
const deletingId = ref(null)
const reordering = ref(false)
const creating = ref(false)
const showCreateForm = ref(false)
const uploadingId = ref(null)

// NEW: Toggle state for Edit vs Preview
const isPreview = ref(false)

const newSection = reactive({
  sectionType: 'hero',
  title: '',
  subtitle: '',
  content: '',
  icon: '',
  sortOrder: 0,
  published: true,
})

const sortedSections = computed(() =>
  [...sections.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

// ====================================================================
// ADMIN LOGIC
// ====================================================================

function sectionTypeLabel(type) {
  return SECTION_TYPES.find((t) => t.value === type)?.label ?? type
}

function authHeaders(json = true) {
  const token = localStorage.getItem('token')
  if (!token) return null
  const headers = { Authorization: `Bearer ${token}` }
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

function toPayload(section) {
  return {
    sectionType: section.sectionType,
    title: section.title ?? '',
    subtitle: section.subtitle ?? '',
    content: section.content ?? '',
    icon: section.icon ?? '',
    sortOrder: section.sortOrder ?? 0,
    published: section.published !== false,
  }
}

function showSubtitle(type) { return type === 'hero' || type === 'team-member' }
function showContent(type) { return ['mission', 'vision', 'ecosystem', 'pillar-item', 'pillar'].includes(type) || (type === 'mission-vision' && true) }
function showIcon(type) { return ['mission', 'vision', 'pillar-item', 'pillar'].includes(type) }
function showImage(type) { return type === 'hero' || type === 'team-member' }
function isExpanded(id) { return expandedIds.value.has(id) }

function toggleExpanded(id) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function getSectionClass(type) {
  if (['pillar-item', 'pillar'].includes(type)) return 'card--nested card--nested-pillar'
  if (['mission', 'vision'].includes(type)) return 'card--nested card--nested-mv'
  if (type === 'team-member') return 'card--nested card--nested-team'
  if (['pillars', 'mission-vision', 'team'].includes(type)) return 'card--parent'
  return ''
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

async function loadSections() {
  isLoading.value = true
  error.value = ''
  try {
    const data = await apiFetch(`${API_BASE}/pages/${PAGE_KEY}/sections`)
    sections.value = Array.isArray(data) ? data : []
  } catch (e) {
    if (!error.value) error.value = e.message || 'Nepodarilo sa načítať sekcie.'
    sections.value = []
  } finally {
    isLoading.value = false
  }
}

async function saveSection(section) {
  savingId.value = section.id
  error.value = ''
  try {
    const updated = await apiFetch(`${API_BASE}/pages/sections/${section.id}`, {
      method: 'PUT',
      body: JSON.stringify(toPayload(section)),
    })
    const idx = sections.value.findIndex((s) => s.id === section.id)
    if (idx !== -1) sections.value[idx] = updated
  } catch (e) {
    error.value = e.message || 'Uloženie sekcie zlyhalo.'
  } finally {
    savingId.value = null
  }
}

async function deleteSection(section) {
  if (!window.confirm(`Naozaj chcete odstrániť sekciu „${section.title || section.sectionType}"?`)) return
  deletingId.value = section.id
  error.value = ''
  try {
    await apiFetch(`${API_BASE}/pages/sections/${section.id}`, { method: 'DELETE' })
    sections.value = sections.value.filter((s) => s.id !== section.id)
    expandedIds.value.delete(section.id)
  } catch (e) {
    error.value = e.message || 'Odstránenie sekcie zlyhalo.'
  } finally {
    deletingId.value = null
  }
}

async function persistSortOrder(section) {
  return apiFetch(`${API_BASE}/pages/sections/${section.id}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(section)),
  })
}

async function saveNewOrder(newList) {
  reordering.value = true
  error.value = ''
  const rollbacks = new Map(sections.value.map(s => [s.id, s.sortOrder]))
  newList.forEach((section, idx) => { section.sortOrder = idx })
  try {
    await Promise.all(newList.map(s => persistSortOrder(s)))
    sections.value = newList
  } catch (e) {
    sections.value = sections.value.map(s => {
      if (rollbacks.has(s.id)) s.sortOrder = rollbacks.get(s.id)
      return s
    })
    error.value = e.message || 'Zmena poradia zlyhala.'
  } finally {
    reordering.value = false
  }
}

async function moveSection(index, direction) {
  if (reordering.value) return
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  const list = [...sortedSections.value]
  if (targetIndex < 0 || targetIndex >= list.length) return
  const [movedItem] = list.splice(index, 1)
  list.splice(targetIndex, 0, movedItem)
  await saveNewOrder(list)
}

async function moveToTop(index) {
  if (index === 0 || reordering.value) return
  const list = [...sortedSections.value]
  const [movedItem] = list.splice(index, 1)
  list.unshift(movedItem)
  await saveNewOrder(list)
}

function openCreateForm() {
  const maxOrder = sortedSections.value.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), -1)
  Object.assign(newSection, { sectionType: 'hero', title: '', subtitle: '', content: '', icon: '', sortOrder: maxOrder + 1, published: true })
  showCreateForm.value = true
  expandedIds.value = new Set(['__new__'])
  isPreview.value = false // Switch to edit mode when creating
}

function cancelCreate() {
  showCreateForm.value = false
  expandedIds.value.delete('__new__')
}

async function createSection() {
  creating.value = true
  error.value = ''
  try {
    const created = await apiFetch(`${API_BASE}/pages/${PAGE_KEY}/sections`, {
      method: 'POST',
      body: JSON.stringify(toPayload(newSection)),
    })
    sections.value.push(created)
    showCreateForm.value = false
    expandedIds.value = new Set([created.id])
  } catch (e) {
    error.value = e.message || 'Vytvorenie sekcie zlyhalo.'
  } finally {
    creating.value = false
  }
}

async function uploadImage(section, event) {
  const file = event.target.files?.[0]
  if (!file || !section.id) return
  uploadingId.value = section.id
  error.value = ''
  const formData = new FormData()
  formData.append('file', file)
  try {
    const updated = await apiFetch(`${API_BASE}/pages/sections/${section.id}/image`, {
      method: 'POST',
      body: formData,
    })
    const idx = sections.value.findIndex((s) => s.id === section.id)
    if (idx !== -1) sections.value[idx] = updated
  } catch (e) {
    error.value = e.message || 'Nahranie obrázka zlyhalo.'
  } finally {
    uploadingId.value = null
    event.target.value = ''
  }
}

// ====================================================================
// PREVIEW LOGIC (From Public AboutPage)
// ====================================================================

const missionVisionCards = computed(() =>
  sortedSections.value.filter(
    (s) =>
      s.sectionType === 'mission' ||
      s.sectionType === 'vision' ||
      (s.sectionType === 'mission-vision' && s.content)
  )
)

const pillarsHeader = computed(() => sortedSections.value.find((s) => s.sectionType === 'pillars'))

const pillarItems = computed(() => {
  const items = sortedSections.value.filter((s) => s.sectionType === 'pillar-item' || s.sectionType === 'pillar')
  if (items.length > 0) return items
  const header = pillarsHeader.value
  if (header?.content) return parsePillarContent(header.content)
  return []
})

const teamHeader = computed(() => sortedSections.value.find((s) => s.sectionType === 'team'))
const teamMembers = computed(() => sortedSections.value.filter((s) => s.sectionType === 'team-member'))

function parsePillarContent(content) {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        id: item.id ?? `pillar-${index}`,
        title: item.title ?? '',
        content: item.description ?? item.content ?? '',
        icon: item.icon ?? '',
      }))
    }
  } catch { }
  return []
}

function heroStyle(section) {
  if (!section.imageUrl) return undefined
  return {
    backgroundImage: `url(${section.imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

function missionVisionCardClass(section) {
  if (section.sectionType === 'vision') return 'vision-card'
  if (section.sectionType === 'mission') return 'mission-card'
  const title = (section.title || '').toLowerCase()
  if (title.includes('vízia') || title.includes('vizia') || title.includes('vision')) return 'vision-card'
  return 'mission-card'
}

function contentParagraphs(content) {
  if (!content) return []
  return content.split(/\n\n+/).filter((p) => p.trim())
}

const missionVisionHeader = computed(() => sortedSections.value.find((s) => s.sectionType === 'mission-vision' && !s.content))

function isMissionVisionGroupStart(section) {
  if (section.sectionType === 'mission-vision' && !section.content) return true
  if (missionVisionHeader.value) return false
  return missionVisionCards.value[0]?.id === section.id
}

function isPillarsGroupStart(section) {
  if (section.sectionType === 'pillars') return true
  if (pillarsHeader.value) return false
  if (section.sectionType === 'pillar-item' || section.sectionType === 'pillar') return pillarItems.value[0]?.id === section.id
  return false
}

function isTeamGroupStart(section) {
  if (section.sectionType === 'team') return true
  if (teamHeader.value) return false
  if (section.sectionType === 'team-member') return teamMembers.value[0]?.id === section.id
  return false
}

function shouldRender(section) {
  const type = section.sectionType
  if (type === 'pillar-item' || type === 'pillar') return isPillarsGroupStart(section)
  if (type === 'team-member') return isTeamGroupStart(section)
  if (type === 'mission' || type === 'vision') return isMissionVisionGroupStart(section)
  if (type === 'mission-vision' && section.content) return isMissionVisionGroupStart(section)
  return true
}

onMounted(loadSections)
</script>

<template>
  <div class="about-admin">
    <header class="about-admin__header">
      <div>
        <h1 class="about-admin__title">Správa stránky O NTI</h1>
        <p class="about-admin__subtitle">
          Upravujte obsahové bloky verejnej stránky About. Zmeny sa prejavia po uložení a publikovaní.
        </p>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div class="mode-toggle" style="display: flex; gap: 0.5rem; background: var(--bg-color-soft, #f0f0f0); padding: 0.25rem; border-radius: 6px;">
          <button @click="isPreview = false" :class="['btn', !isPreview ? 'btn--primary' : 'btn--ghost']">📝 Edit</button>
          <button @click="isPreview = true" :class="['btn', isPreview ? 'btn--primary' : 'btn--ghost']">👁️ Preview</button>
        </div>
        <button type="button" class="btn btn--primary" @click="openCreateForm" v-if="!isPreview">
          ＋ Add New Block
        </button>
      </div>
    </header>

    <div v-if="error" class="about-admin__error" role="alert">
      {{ error }}
    </div>

    <div v-if="isLoading" class="about-admin__loading">
      <span class="spinner" aria-hidden="true"></span>
      Načítavanie sekcií...
    </div>

    <div v-else-if="!isPreview" class="about-admin__list">
      <article v-if="showCreateForm" class="card card--new">
        <button type="button" class="card__header" @click="toggleExpanded('__new__')">
          <div class="card__header-main">
            <span class="card__badge card__badge--new">NEW</span>
            <strong>Nová sekcia</strong>
          </div>
          <span class="card__chevron">{{ isExpanded('__new__') ? '▾' : '▸' }}</span>
        </button>

        <div v-show="isExpanded('__new__')" class="card__body">
          <label class="field">
            <span class="field__label">Typ sekcie</span>
            <select v-model="newSection.sectionType" class="field__input">
              <option v-for="type in SECTION_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Nadpis</span>
            <input v-model="newSection.title" type="text" class="field__input" />
          </label>
          <label class="field" v-if="showSubtitle(newSection.sectionType)">
            <span class="field__label">Podnadpis</span>
            <input v-model="newSection.subtitle" type="text" class="field__input" />
          </label>
          <label class="field" v-if="showContent(newSection.sectionType)">
            <span class="field__label">Obsah</span>
            <textarea v-model="newSection.content" rows="6" class="field__input field__textarea" />
          </label>
          <label class="field" v-if="showIcon(newSection.sectionType)">
            <span class="field__label">Ikona (emoji)</span>
            <input v-model="newSection.icon" type="text" class="field__input" placeholder="🎯" />
          </label>
          <label class="field field--inline">
            <input v-model="newSection.published" type="checkbox" />
            <span class="field__label">Publikované</span>
          </label>
          <div class="card__actions">
            <button type="button" class="btn btn--primary" :disabled="creating" @click="createSection">
              {{ creating ? 'Vytváram...' : 'Create' }}
            </button>
            <button type="button" class="btn btn--ghost" @click="cancelCreate">Zrušiť</button>
          </div>
        </div>
      </article>

      <article v-for="(section, index) in sortedSections" :key="section.id" class="card" :class="getSectionClass(section.sectionType)">
        <div class="card__header">
          <button type="button" class="card__header-toggle" @click="toggleExpanded(section.id)">
            <div class="card__header-main">
              <span class="card__order">#{{ section.sortOrder ?? index }}</span>
              <strong>{{ section.title || sectionTypeLabel(section.sectionType) }}</strong>
              <span class="card__type">{{ sectionTypeLabel(section.sectionType) }}</span>
              <span v-if="section.published === false" class="card__draft">Draft</span>
            </div>
            <span class="card__chevron">{{ isExpanded(section.id) ? '▾' : '▸' }}</span>
          </button>
          <div class="card__reorder">
            <button type="button" class="btn btn--small btn--top" :disabled="index === 0 || reordering" @click="moveToTop(index)" title="Presunúť úplne hore">⤓ Top</button>
            <button type="button" class="btn btn--small" :disabled="index === 0 || reordering" @click="moveSection(index, 'up')">▲ Up</button>
            <button type="button" class="btn btn--small" :disabled="index === sortedSections.length - 1 || reordering" @click="moveSection(index, 'down')">▼ Down</button>
          </div>
        </div>

        <div v-show="isExpanded(section.id)" class="card__body">
          <label class="field">
            <span class="field__label">Typ sekcie</span>
            <select v-model="section.sectionType" class="field__input">
              <option v-for="type in SECTION_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Nadpis</span>
            <input v-model="section.title" type="text" class="field__input" />
          </label>
          <label class="field" v-if="showSubtitle(section.sectionType)">
            <span class="field__label">Podnadpis</span>
            <input v-model="section.subtitle" type="text" class="field__input" />
          </label>
          <label class="field" v-if="showContent(section.sectionType)">
            <span class="field__label">Obsah</span>
            <textarea v-model="section.content" rows="6" class="field__input field__textarea" />
          </label>
          <label class="field" v-if="showIcon(section.sectionType)">
            <span class="field__label">Ikona (emoji)</span>
            <input v-model="section.icon" type="text" class="field__input" placeholder="🎯" />
          </label>
          <div class="field" v-if="showImage(section.sectionType)">
            <span class="field__label">Obrázok</span>
            <div class="image-preview" v-if="section.imageUrl">
              <img :src="section.imageUrl" :alt="section.title || 'Section image'" />
              <code class="image-preview__url">{{ section.imageUrl }}</code>
            </div>
            <label class="upload">
              <input type="file" accept="image/*" :disabled="uploadingId === section.id" @change="uploadImage(section, $event)" />
              <span>{{ uploadingId === section.id ? 'Nahrávam...' : 'Nahrať obrázok' }}</span>
            </label>
          </div>
          <label class="field field--inline">
            <input v-model="section.published" type="checkbox" />
            <span class="field__label">Publikované</span>
          </label>
          <div class="card__actions">
            <button type="button" class="btn btn--primary" :disabled="savingId === section.id" @click="saveSection(section)">
              {{ savingId === section.id ? 'Ukladám...' : 'Save Changes' }}
            </button>
            <button type="button" class="btn btn--danger" :disabled="deletingId === section.id" @click="deleteSection(section)">
              {{ deletingId === section.id ? 'Mažem...' : 'Delete Section' }}
            </button>
          </div>
        </div>
      </article>

      <p class="about-admin__empty" v-if="!sortedSections.length && !showCreateForm">
        Zatiaľ žiadne sekcie. Pridajte prvý blok tlačidlom „Add New Block“.
      </p>
    </div>

    <div v-else class="about-page preview-wrapper">
      <div class="preview-banner" style="background: #ffeb3b; padding: 0.5rem; text-align: center; color: #333; font-weight: bold; margin-bottom: 2rem; border-radius: 8px;">
        👁️ Aktuálne prezeráte živý náhľad štruktúry stránky. (Nezabudnite uložiť zmeny v Edit móde)
      </div>

      <template v-for="section in sortedSections" :key="section.id">
        <section v-if="section.sectionType === 'hero'" class="hero" :class="{ 'hero--with-image': section.imageUrl }" :style="heroStyle(section)">
          <div class="hero-content">
            <h1>{{ section.title }}</h1>
            <p v-if="section.subtitle" class="hero-subtitle">{{ section.subtitle }}</p>
          </div>
        </section>

        <section v-else-if="section.sectionType === 'mission-vision' && !section.content && shouldRender(section)" class="section mission-vision">
          <div class="container">
            <h2 v-if="section.title" class="section-title">{{ section.title }}</h2>
            <div class="mission-vision-grid">
              <div v-for="card in missionVisionCards" :key="card.id" :class="missionVisionCardClass(card)">
                <div v-if="card.icon" class="card-icon">{{ card.icon }}</div>
                <h2>{{ card.title }}</h2>
                <p>{{ card.content }}</p>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="(section.sectionType === 'mission' || section.sectionType === 'vision' || (section.sectionType === 'mission-vision' && section.content)) && shouldRender(section)" class="section mission-vision">
          <div class="container">
            <div class="mission-vision-grid">
              <div v-for="card in missionVisionCards" :key="card.id" :class="missionVisionCardClass(card)">
                <div v-if="card.icon" class="card-icon">{{ card.icon }}</div>
                <h2>{{ card.title }}</h2>
                <p>{{ card.content }}</p>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="(section.sectionType === 'pillars' || section.sectionType === 'pillar-item' || section.sectionType === 'pillar') && shouldRender(section)" class="section pillars">
          <div class="container">
            <h2 class="section-title">{{ pillarsHeader?.title || section.title || '4 Piliere NTI' }}</h2>
            <div class="pillars-grid">
              <div v-for="pillar in pillarItems" :key="pillar.id" class="pillar-card">
                <div v-if="pillar.icon" class="pillar-icon">{{ pillar.icon }}</div>
                <h3>{{ pillar.title }}</h3>
                <p>{{ pillar.content }}</p>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="section.sectionType === 'ecosystem'" class="section ecosystem">
          <div class="container">
            <div class="ecosystem-content">
              <div class="ecosystem-text">
                <h2 class="section-title">{{ section.title }}</h2>
                <p v-for="(paragraph, index) in contentParagraphs(section.content)" :key="index">
                  {{ paragraph }}
                </p>
                <div class="ecosystem-stats">
                  <div class="stat">
                    <div class="stat-number">50+</div><div class="stat-label">Partnerov</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">200+</div><div class="stat-label">Študentov</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">30+</div><div class="stat-label">Startupov</div>
                  </div>
                </div>
              </div>
              <div class="ecosystem-visual">
                <div class="connection-diagram">
                  <div class="node university"><div class="node-icon">🎓</div><span>Univerzita</span></div>
                  <div class="connector"></div>
                  <div class="node nti"><div class="node-icon">💡</div><span>NTI</span></div>
                  <div class="connector"></div>
                  <div class="node industry"><div class="node-icon">🏢</div><span>Priemysel</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="(section.sectionType === 'team' || section.sectionType === 'team-member') && shouldRender(section)" class="section team">
          <div class="container">
            <h2 class="section-title">{{ teamHeader?.title || section.title || 'Náš Tím' }}</h2>
            <div class="team-grid">
              <div v-for="member in teamMembers" :key="member.id" class="team-card">
                <div class="team-image">
                  <img v-if="member.imageUrl" :src="member.imageUrl" :alt="member.title" />
                </div>
                <h3>{{ member.title }}</h3>
                <p v-if="member.subtitle" class="team-role">{{ member.subtitle }}</p>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>

  </div>
</template>

<style scoped>
.about-admin {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.about-admin__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.about-admin__title {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.about-admin__subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.5;
}

.about-admin__error {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.about-admin__loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #64748b;
}

.about-admin__empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 0;
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

.about-admin__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.08);
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border: none;
  border-bottom: 1px solid #e2e8f0;
}

.card__header-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 0.75rem;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.card__header-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card__order {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4f46e5;
  background: #eef2ff;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.card__type {
  font-size: 0.75rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.card__draft {
  font-size: 0.7rem;
  font-weight: 600;
  color: #b45309;
  background: #fffbeb;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.card__badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.card__badge--new {
  color: #4338ca;
  background: #e0e7ff;
}

.card__chevron {
  color: #94a3b8;
  font-size: 0.9rem;
}

.card__reorder {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.card__body {
  padding: 1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
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
  outline: 2px solid rgba(79, 70, 229, 0.25);
  border-color: #818cf8;
}

.field__textarea {
  resize: vertical;
  min-height: 8rem;
  line-height: 1.5;
}

.image-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.image-preview img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.image-preview__url {
  font-size: 0.75rem;
  color: #64748b;
  word-break: break-all;
}

.upload {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #4f46e5;
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
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.btn--small {
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  background: #fff;
  color: #475569;
  border-color: #cbd5e1;
}

.btn--small:hover:not(:disabled) {
  background: #f1f5f9;
}

@media (max-width: 720px) {
  .about-admin__header {
    flex-direction: column;
  }

  .card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .card__reorder {
    justify-content: flex-end;
  }
}
/* Make parent header cards look bolder and distinct */
.card--parent {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-left: 5px solid #475569; /* Thick slate dark border */
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}
.card--parent .card__header-main strong {
  font-size: 1.1rem;
  color: #1e293b;
}

/* Base nested settings: push items to the right & add connection bar styling */
.card--nested {
  margin-left: 2.5rem; /* Indented to showcase hierarchy tree */
  position: relative;
  background: #f8fafc; /* Slightly muted tone */
}

/* Subtle pseudo-tree lines linking parent to children */
.card--nested::before {
  content: '';
  position: absolute;
  left: -1.25rem;
  top: -16px;
  bottom: 50%;
  width: 1.25rem;
  border-left: 2px dashed #cbd5e1;
  border-bottom: 2px dashed #cbd5e1;
  pointer-events: none;
}

/* Specific colors per group context */
.card--nested-pillar {
  border-left: 4px solid #10b981 !important; /* Green Accent */
}
.card--nested-mv {
  border-left: 4px solid #8b5cf6 !important; /* Purple Accent */
}
.card--nested-team {
  border-left: 4px solid #f59e0b !important; /* Amber Accent */
}

/* Custom styling for the Top Button */
.btn--top {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}
.btn--top:hover:not(:disabled) {
  background-color: #e2e8f0;
  color: #0f172a;
}
</style>

<style>
/* Wrap everything in .preview-wrapper so these styles don't
   accidentally leak out to the rest of your admin dashboard */
.preview-wrapper .hero {
  padding: 4rem 2rem;
  text-align: center;
}
.preview-wrapper .mission-vision-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
.preview-wrapper .hero--with-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
}

.preview-wrapper .hero--with-image .hero-content {
  position: relative;
  z-index: 1;
}

.preview-wrapper .hero--with-image .hero-content h1,
.preview-wrapper .hero--with-image .hero-subtitle {
  color: #fff;
}

.preview-wrapper .hero-content h1 {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: #0f172a;
}

.preview-wrapper .hero-subtitle {
  font-size: 1.25rem;
  opacity: 1;
  margin: 0;
  color: #475569;
}

/* Section Styles */
.preview-wrapper .section {
  padding: 4rem 2rem;
}

.preview-wrapper .container {
  max-width: 1200px;
  margin: 0 auto;
}

.preview-wrapper .section-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 3rem;
}

/* Mission & Vision cards */
.preview-wrapper .mission-vision {
  background: transparent;
}

.preview-wrapper .mission-vision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.preview-wrapper .mission-card,
.preview-wrapper .vision-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.preview-wrapper .mission-card:hover,
.preview-wrapper .vision-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.preview-wrapper .card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.preview-wrapper .mission-card h2,
.preview-wrapper .vision-card h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem 0;
}

.preview-wrapper .mission-card p,
.preview-wrapper .vision-card p {
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

/* Pillars grid items */
.preview-wrapper .pillars {
  background: transparent;
}

.preview-wrapper .pillars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.preview-wrapper .pillar-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.preview-wrapper .pillar-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.preview-wrapper .pillar-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.preview-wrapper .pillar-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.75rem 0;
}

.preview-wrapper .pillar-card p {
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* Ecosystem */
.preview-wrapper .ecosystem {
  background: transparent;
}

.preview-wrapper .ecosystem-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.preview-wrapper .ecosystem-text h2 {
  margin-bottom: 1.5rem;
}

.preview-wrapper .ecosystem-text p {
  color: #475569;
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

.preview-wrapper .ecosystem-stats {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}

.preview-wrapper .stat {
  text-align: center;
}

.preview-wrapper .stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #4f46e5;
  margin-bottom: 0.25rem;
}

.preview-wrapper .stat-label {
  color: #64748b;
  font-size: 0.875rem;
}

.preview-wrapper .connection-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(79, 70, 229, 0.1);
  border-radius: 1rem;
}

.preview-wrapper .node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 0.75rem;
  border: 2px solid rgba(79, 70, 229, 0.1);
  min-width: 100px;
}

.preview-wrapper .node-icon {
  font-size: 2rem;
}

.preview-wrapper .node span {
  font-weight: 600;
  color: #475569;
  font-size: 0.875rem;
}

.preview-wrapper .node.nti {
  border-color: #4f46e5;
  background: rgba(99, 102, 241, 0.06);
}

.preview-wrapper .connector {
  width: 60px;
  height: 3px;
  background: rgba(79, 70, 229, 0.2);
  border-radius: 2px;
}

/* Team layout */
.preview-wrapper .team {
  background: transparent;
}

.preview-wrapper .team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.preview-wrapper .team-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.preview-wrapper .team-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.preview-wrapper .team-image {
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(79, 70, 229, 0.15);
  background: rgba(255, 255, 255, 0.95);
}

.preview-wrapper .team-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-wrapper .team-card h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.preview-wrapper .team-role {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
}

/* Responsive Styles inside Preview */
@media (max-width: 768px) {
  .preview-wrapper .hero-content h1 {
    font-size: 2rem;
  }

  .preview-wrapper .section-title {
    font-size: 1.75rem;
  }

  .preview-wrapper .ecosystem-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .preview-wrapper .ecosystem-stats {
    flex-wrap: wrap;
    justify-content: center;
  }

  .preview-wrapper .connection-diagram {
    flex-direction: column;
  }

  .preview-wrapper .connector {
    width: 3px;
    height: 60px;
  }

  .preview-wrapper .pillars-grid,
  .preview-wrapper .team-grid {
    grid-template-columns: 1fr;
  }
}
</style>
