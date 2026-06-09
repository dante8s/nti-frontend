<script setup>
import { ref, computed, onMounted } from 'vue'

const sections = ref([])
const isLoading = ref(true)
const errorMessage = ref(null)

const sortedSections = computed(() =>
  [...sections.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

const missionVisionCards = computed(() =>
  sortedSections.value.filter(
    (s) =>
      s.sectionType === 'mission' ||
      s.sectionType === 'vision' ||
      (s.sectionType === 'mission-vision' && s.content)
  )
)

const pillarsHeader = computed(() =>
  sortedSections.value.find((s) => s.sectionType === 'pillars')
)

const pillarItems = computed(() => {
  const items = sortedSections.value.filter(
    (s) => s.sectionType === 'pillar-item' || s.sectionType === 'pillar'
  )
  if (items.length > 0) return items

  const header = pillarsHeader.value
  if (header?.content) {
    return parsePillarContent(header.content)
  }
  return []
})

const teamHeader = computed(() =>
  sortedSections.value.find((s) => s.sectionType === 'team')
)

const teamMembers = computed(() =>
  sortedSections.value.filter((s) => s.sectionType === 'team-member')
)

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
  } catch {
    // not JSON — fall through
  }
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
  if (title.includes('vízia') || title.includes('vizia') || title.includes('vision')) {
    return 'vision-card'
  }
  return 'mission-card'
}

function contentParagraphs(content) {
  if (!content) return []
  return content.split(/\n\n+/).filter((p) => p.trim())
}

const missionVisionHeader = computed(() =>
  sortedSections.value.find((s) => s.sectionType === 'mission-vision' && !s.content)
)

function isMissionVisionGroupStart(section) {
  if (section.sectionType === 'mission-vision' && !section.content) return true
  if (missionVisionHeader.value) return false
  return missionVisionCards.value[0]?.id === section.id
}

function isPillarsGroupStart(section) {
  if (section.sectionType === 'pillars') return true
  if (pillarsHeader.value) return false
  if (section.sectionType === 'pillar-item' || section.sectionType === 'pillar') {
    return pillarItems.value[0]?.id === section.id
  }
  return false
}

function isTeamGroupStart(section) {
  if (section.sectionType === 'team') return true
  if (teamHeader.value) return false
  if (section.sectionType === 'team-member') {
    return teamMembers.value[0]?.id === section.id
  }
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

// Find this function in your <script setup>:
async function fetchSections() {
  isLoading.value = true
  try {
    // CHANGE THIS LINE to point directly to your backend:
    const response = await fetch('http://localhost:8080/api/public/cms/pages/about')

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    sections.value = await response.json()
  } catch (error) {
    console.error('Nepodarilo sa načítať obsah stránky O NTI', error)
    sections.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchSections)
</script>

<template>
  <div v-if="isLoading" class="about-page about-loading">
    Načítavanie...
  </div>

  <div v-else class="about-page">
    <template v-for="section in sortedSections" :key="section.id">
      <!-- Hero -->
      <section
        v-if="section.sectionType === 'hero'"
        class="hero"
        :class="{ 'hero--with-image': section.imageUrl }"
        :style="heroStyle(section)"
      >
        <div class="hero-content">
          <h1>{{ section.title }}</h1>
          <p v-if="section.subtitle" class="hero-subtitle">{{ section.subtitle }}</p>
        </div>
      </section>

      <!-- Mission & Vision -->
      <section
        v-else-if="section.sectionType === 'mission-vision' && !section.content && shouldRender(section)"
        class="section mission-vision"
      >
        <div class="container">
          <h2 v-if="section.title" class="section-title">{{ section.title }}</h2>
          <div class="mission-vision-grid">
            <div
              v-for="card in missionVisionCards"
              :key="card.id"
              :class="missionVisionCardClass(card)"
            >
              <div v-if="card.icon" class="card-icon">{{ card.icon }}</div>
              <h2>{{ card.title }}</h2>
              <p>{{ card.content }}</p>
            </div>
          </div>
        </div>
      </section>

      <section
        v-else-if="(section.sectionType === 'mission' || section.sectionType === 'vision' || (section.sectionType === 'mission-vision' && section.content)) && shouldRender(section)"
        class="section mission-vision"
      >
        <div class="container">
          <div class="mission-vision-grid">
            <div
              v-for="card in missionVisionCards"
              :key="card.id"
              :class="missionVisionCardClass(card)"
            >
              <div v-if="card.icon" class="card-icon">{{ card.icon }}</div>
              <h2>{{ card.title }}</h2>
              <p>{{ card.content }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Pillars -->
      <section
        v-else-if="(section.sectionType === 'pillars' || section.sectionType === 'pillar-item' || section.sectionType === 'pillar') && shouldRender(section)"
        class="section pillars"
      >
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

      <!-- Ecosystem & Faculty -->
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
                  <div class="stat-number">50+</div>
                  <div class="stat-label">Partnerov</div>
                </div>
                <div class="stat">
                  <div class="stat-number">200+</div>
                  <div class="stat-label">Študentov</div>
                </div>
                <div class="stat">
                  <div class="stat-number">30+</div>
                  <div class="stat-label">Startupov</div>
                </div>
              </div>
            </div>
            <div class="ecosystem-visual">
              <div class="connection-diagram">
                <div class="node university">
                  <div class="node-icon">🎓</div>
                  <span>Univerzita</span>
                </div>
                <div class="connector"></div>
                <div class="node nti">
                  <div class="node-icon">💡</div>
                  <span>NTI</span>
                </div>
                <div class="connector"></div>
                <div class="node industry">
                  <div class="node-icon">🏢</div>
                  <span>Priemysel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Team -->
      <section
        v-else-if="(section.sectionType === 'team' || section.sectionType === 'team-member') && shouldRender(section)"
        class="section team"
      >
        <div class="container">
          <h2 class="section-title">{{ teamHeader?.title || section.title || 'Náš Tím' }}</h2>
          <div class="team-grid">
            <div v-for="member in teamMembers" :key="member.id" class="team-card">
              <div class="team-image">
                <img
                  v-if="member.imageUrl"
                  :src="member.imageUrl"
                  :alt="member.title"
                />
              </div>
              <h3>{{ member.title }}</h3>
              <p v-if="member.subtitle" class="team-role">{{ member.subtitle }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #f8fafc; /* Premium slate base background instead of heavy indigo tint */
}

.about-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 1.125rem;
}

/* Hero Section transformed to a clean typography header variant */
.hero {
  background: transparent;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  padding: 4rem 2rem;
  text-align: center;
  color: #0f172a;
}

.hero--with-image {
  position: relative;
  color: #fff;
}

.hero--with-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
}

.hero--with-image .hero-content {
  position: relative;
  z-index: 1;
}

.hero--with-image .hero-content h1,
.hero--with-image .hero-subtitle {
  color: #fff;
}

.hero-content h1 {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: #0f172a;
}

.hero-subtitle {
  font-size: 1.25rem;
  opacity: 1;
  margin: 0;
  color: #475569;
}

/* Section Styles */
.section {
  padding: 4rem 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 3rem;
}

/* Mission & Vision cards styled using white/glass tokens */
.mission-vision {
  background: transparent;
}

.mission-vision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.mission-card,
.vision-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mission-card:hover,
.vision-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.mission-card h2,
.vision-card h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem 0;
}

.mission-card p,
.vision-card p {
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

/* Pillars grid items mapping identical card visual standards */
.pillars {
  background: transparent;
}

.pillars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.pillar-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pillar-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.pillar-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.pillar-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.75rem 0;
}

.pillar-card p {
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* Ecosystem and interactive map canvas */
.ecosystem {
  background: transparent;
}

.ecosystem-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.ecosystem-text h2 {
  margin-bottom: 1.5rem;
}

.ecosystem-text p {
  color: #475569;
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

.ecosystem-stats {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}

.stat {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #4f46e5;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
}

.connection-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(79, 70, 229, 0.1);
  border-radius: 1rem;
}

.node {
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

.node-icon {
  font-size: 2rem;
}

.node span {
  font-weight: 600;
  color: #475569;
  font-size: 0.875rem;
}

/* Central Node core token color system adjustments */
.node.nti {
  border-color: #4f46e5;
  background: rgba(99, 102, 241, 0.06);
}

.connector {
  width: 60px;
  height: 3px;
  background: rgba(79, 70, 229, 0.2);
  border-radius: 2px;
}

/* Team layout mapping clean cards variables */
.team {
  background: transparent;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.team-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.team-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.12);
}

.team-image {
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(79, 70, 229, 0.15);
  background: rgba(255, 255, 255, 0.95);
}

.team-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-card h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.team-role {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-content h1 {
    font-size: 2rem;
  }

  .section-title {
    font-size: 1.75rem;
  }

  .ecosystem-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .ecosystem-stats {
    flex-wrap: wrap;
    justify-content: center;
  }

  .connection-diagram {
    flex-direction: column;
  }

  .connector {
    width: 3px;
    height: 60px;
  }

  .pillars-grid,
  .team-grid {
    grid-template-columns: 1fr;
  }
}
</style>
