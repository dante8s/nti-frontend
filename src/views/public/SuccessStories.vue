<script setup>
import { ref, onMounted } from 'vue'

const API = {
  projects: '/api/public/cms/projects',
  testimonials: '/api/public/cms/testimonials',
  statsPage: '/api/public/cms/pages/success-stories',
}

const CMS_FALLBACK = {
  projects: '/api/public/cms/projects',
  testimonials: '/api/public/cms/testimonials',
  statsPage: '/api/public/cms/pages/success-stories',
}

const DEFAULT_STATS = [
  { id: 1, number: '30+', label: 'Úspešných projektov' },
  { id: 2, number: '500K €', label: 'Získané investície' },
  { id: 3, number: '150+', label: 'Absolventov programov' },
  { id: 4, number: '95%', label: 'Spokojnosť účastníkov' },
]

const PLACEHOLDER_PROJECT = '/placeholder-project.jpg'
const PLACEHOLDER_AVATAR = '/placeholder-avatar.svg'

const successProjects = ref([])
const testimonials = ref([])
const stats = ref([])
const loading = ref(true)
const error = ref('')

function resolveImage(url, fallback) {
  return url && String(url).trim() ? url : fallback
}

function normalizeProject(raw) {
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    image: resolveImage(raw.image ?? raw.imageUrl, PLACEHOLDER_PROJECT),
    investment: raw.investment ?? raw.fundingAmount ?? '',
    status: raw.status ?? raw.statusLabel ?? '',
  }
}

function normalizeTestimonial(raw) {
  return {
    id: raw.id,
    name: raw.name ?? raw.authorName ?? '',
    role: raw.role ?? raw.authorRole ?? '',
    quote: raw.quote ?? '',
    image: resolveImage(raw.image ?? raw.avatarUrl, PLACEHOLDER_AVATAR),
  }
}

function normalizeStat(raw, index = 0) {
  return {
    id: raw.id ?? index + 1,
    number: raw.number ?? raw.title ?? '',
    label: raw.label ?? raw.subtitle ?? raw.content ?? '',
  }
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

async function fetchWithFallback(primaryUrl, fallbackUrl) {
  try {
    return await fetchJson(primaryUrl)
  } catch {
    return fetchJson(fallbackUrl)
  }
}

async function fetchProjects() {
  const data = await fetchWithFallback(API.projects, CMS_FALLBACK.projects)
  const list = Array.isArray(data) ? data : []
  return list.map(normalizeProject)
}

async function fetchTestimonials() {
  const data = await fetchWithFallback(API.testimonials, CMS_FALLBACK.testimonials)
  const list = Array.isArray(data) ? data : []
  return list.map(normalizeTestimonial)
}

async function fetchStats() {
  try {
    const data = await fetchJson(API.stats)
    const list = Array.isArray(data) ? data : []
    if (list.length) return list.map(normalizeStat)
  } catch {
    // primary stats endpoint unavailable — try CMS page sections
  }

  try {
    const sections = await fetchJson(CMS_FALLBACK.statsPage)
    const fromSections = (Array.isArray(sections) ? sections : [])
      .filter((s) => s.sectionType === 'stat')
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(normalizeStat)

    if (fromSections.length) return fromSections
  } catch {
    // no CMS stats configured
  }

  return DEFAULT_STATS
}

function formatLoadError(cause) {
  if (cause instanceof TypeError) {
    return 'Nepodarilo sa pripojiť k serveru. Skontrolujte sieťové pripojenie a skúste to znova.'
  }
  if (cause?.message?.startsWith('HTTP')) {
    return `Nepodarilo sa načítať obsah stránky (${cause.message}).`
  }
  return 'Nepodarilo sa načítať príbehy úspechu. Skúste to prosím neskôr.'
}

async function loadPageData() {
  loading.value = true
  error.value = ''

  try {
    const [projects, quotes, statItems] = await Promise.all([
      fetchProjects(),
      fetchTestimonials(),
      fetchStats(),
    ])

    successProjects.value = projects
    testimonials.value = quotes
    stats.value = statItems
  } catch (e) {
    console.error('Chyba pri načítaní Success Stories', e)
    error.value = formatLoadError(e)
    successProjects.value = []
    testimonials.value = []
    stats.value = []
  } finally {
    loading.value = false
  }
}

function statusClass(status) {
  return status ? String(status).toLowerCase() : ''
}

onMounted(loadPageData)
</script>

<template>
  <div class="success-stories-page">
    <section class="hero">
      <div class="hero-content">
        <h1>Úspešné projekty</h1>
        <p class="hero-subtitle">Inšpirácie a príbehy z nášho ekosystému</p>
      </div>
    </section>

    <section class="section projects">
      <div class="container">
        <h2 class="section-title">Naše úspešné projekty</h2>

        <div v-if="loading" class="state-loading">Načítavam príbehy úspechu...</div>
        <div v-else-if="error" class="state-error">{{ error }}</div>

        <div v-else class="projects-grid">
          <div v-for="project in successProjects" :key="project.id" class="project-card">
            <div class="project-image">
              <img :src="project.image" :alt="project.title" />
            </div>
            <div class="project-content">
              <div class="project-meta">
                <span v-if="project.investment" class="project-investment">{{ project.investment }}</span>
                <span
                  v-if="project.status"
                  class="project-status"
                  :class="statusClass(project.status)"
                >
                  {{ project.status }}
                </span>
              </div>
              <h3>{{ project.title }}</h3>
              <p>{{ project.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section testimonials">
      <div class="container">
        <h2 class="section-title">Čo hovoria o nás</h2>
        <div v-if="!loading && !error" class="testimonials-grid">
          <div v-for="testimonial in testimonials" :key="testimonial.id" class="testimonial-card">
            <div class="quote-icon">"</div>
            <p class="quote">{{ testimonial.quote }}</p>
            <div class="author">
              <div class="author-image">
                <img :src="testimonial.image" :alt="testimonial.name" />
              </div>
              <div class="author-info">
                <h4>{{ testimonial.name }}</h4>
                <span>{{ testimonial.role }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section stats">
      <div class="container">
        <div v-if="!loading && !error" class="stats-grid">
          <div v-for="stat in stats" :key="stat.id" class="stat-item">
            <div class="stat-number">{{ stat.number }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Main canvas alignment using the premium slate dashboard background */
.success-stories-page {
  min-height: 100vh;
  width: 100%;
  background: #f8fafc;
}

/* Typography-driven header replacing saturated gradients for a clean look */
.hero {
  padding: 3.5rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  text-align: center;
}

.hero-content h1 {
  margin: 0 0 0.35rem;
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.hero-subtitle {
  margin: 0 auto;
  max-width: 36rem;
  font-size: 1.25rem;
  color: #475569;
  line-height: 1.6;
}

.state-loading,
.state-error {
  text-align: center;
  padding: 2rem 1rem;
  border-radius: 0.875rem;
}

.state-loading {
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.state-error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

/* Layout structural rules and container scaling */
.section {
  padding: 3rem 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
  text-align: center;
  margin-bottom: 2.5rem;
}

/* Grid configurations maintaining original sizing bounds */
.projects-grid,
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

/* Base Card architecture matching premium shadow tokens precisely */
.project-card,
.testimonial-card,
.stat-item {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.project-card:hover,
.testimonial-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.15);
}

/* Project section UI elements */
.project-image {
  height: 200px;
  overflow: hidden;
  border-bottom: 1px solid rgba(79, 70, 229, 0.06);
}

.project-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-content {
  padding: 1.5rem;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.project-investment {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
  border: 1px solid rgba(79, 70, 229, 0.12);
}

.project-status {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.project-status.aktívny {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
}

.project-status.rozvoj {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
}

.project-status.pilot {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.project-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.65rem 0;
}

.project-card p {
  color: #475569;
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0;
}

/* Testimonial card internal structural overrides */
.testimonial-card {
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.quote-icon {
  font-size: 3.5rem;
  color: #4338ca;
  opacity: 0.15;
  line-height: 1;
  margin-bottom: -0.5rem;
  font-family: serif;
}

.quote {
  color: #475569;
  line-height: 1.65;
  font-style: italic;
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
  flex-grow: 1;
}

.author {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding-top: 1.2rem;
  border-top: 1px dashed rgba(79, 70, 229, 0.12);
}

.author-image {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(79, 70, 229, 0.15);
  flex-shrink: 0;
}

.author-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-info h4 {
  font-size: 0.98rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.15rem 0;
}

.author-info span {
  color: #64748b;
  font-size: 0.82rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 2rem 1.5rem;
}

.stat-number {
  font-size: 2.75rem;
  font-weight: 800;
  color: #4f46e5;
  letter-spacing: -0.02em;
  margin-bottom: 0.35rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .hero {
    padding: 2.5rem 1rem 1rem;
  }

  .hero-content h1 {
    font-size: 2rem;
  }

  .section {
    padding: 2rem 1rem;
  }

  .section-title {
    font-size: 1.5rem;
    margin-bottom: 1.75rem;
  }

  .projects-grid,
  .testimonials-grid,
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .stat-number {
    font-size: 2.25rem;
  }
}
</style>
