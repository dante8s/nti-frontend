<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const article = ref(null)
const loading = ref(true)
const error = ref('')

const SK_MONTHS = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December',
]

function formatArticleDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}. ${SK_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function normalizeArticle(raw) {
  return {
    id: raw.id,
    title: raw.title ?? '',
    excerpt: raw.excerpt ?? '',
    content: raw.content ?? '',
    image: raw.image ?? raw.imageUrl ?? null,
    category: raw.category ?? '',
    date: raw.date ?? formatArticleDate(raw.publishedAt),
  }
}

async function fetchArticle() {
  const id = route.params.id
  if (!id) {
    error.value = 'Článok sa nenašiel.'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  article.value = null

  try {
    const response = await fetch(`/api/public/cms/articles/${id}`)
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'not_found' : `HTTP ${response.status}`)
    }

    article.value = normalizeArticle(await response.json())
  } catch (e) {
    console.error('Nepodarilo sa načítať článok', e)
    error.value = e.message === 'not_found'
      ? 'Článok sa nenašiel.'
      : 'Nepodarilo sa načítať článok. Skúste to prosím neskôr.'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/news')
}

onMounted(fetchArticle)
watch(() => route.params.id, fetchArticle)
</script>

<template>
  <div class="article-page" v-if="article">
    <section class="hero" :style="{ backgroundImage: `url(${article.image || '/placeholder.jpg'})` }">
      <div class="hero-overlay">
        <div class="container">
          <button class="back-button" @click="goBack">← Späť na novinky</button>
          <div class="article-meta">
            <span class="article-category">{{ article.category }}</span>
            <span class="article-date">{{ article.date }}</span>
          </div>
          <h1>{{ article.title }}</h1>
        </div>
      </div>
    </section>

    <section class="section content">
      <div class="container">
        <div class="article-body" v-html="article.content"></div>
      </div>
    </section>
  </div>
  <div v-else-if="loading" class="article-loading">Načítavam článok...</div>
  <div v-else class="article-error">{{ error || 'Článok sa nenašiel.' }}</div>
</template>

<style scoped>
.article-loading,
.article-error {
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #64748b;
}

.article-error {
  color: #b91c1c;
}

/* Main wrapper matching the premium layout guidelines */
.article-page {
  min-height: 100vh;
  width: 100%;
  background: #f8fafc; /* Soft slate base to complement clean white content cards */
}

/* Hero layout managing image backdrop and rich text readability mask */
.hero {
  position: relative;
  min-height: 380px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: flex-end;
}

/* Dark professional gradient overlay ensuring crisp white text contrast */
.hero-overlay {
  width: 100%;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.65) 100%);
  padding: 4rem 2rem 3rem;
  color: white;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* Back button matching application-details action mechanics with glassmorphism adjustments */
.back-button {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  margin-bottom: 2rem;
  display: inline-flex;
  align-items: center;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.22);
  transform: translateX(-3px);
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

/* Category Badge utilizing the specific pill token rules */
.article-category {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
}

/* Date aligned with eyebrow text formatting variables */
.article-date {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

.hero h1 {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: white;
}

.section {
  padding: 2.5rem 2rem 4rem;
}

/* Content Container matching application-details__content tokens exactly */
.article-body {
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem;
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.06);
}

/* Structured typography styling guidelines for inner HTML render injections */
.article-body :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 2rem 0 1rem 0;
  letter-spacing: -0.01em;
}

.article-body :deep(p) {
  color: #475569;
  line-height: 1.75;
  margin: 0 0 1.25rem 0;
  font-size: 0.96rem;
}

.article-body :deep(ul) {
  color: #475569;
  line-height: 1.75;
  margin: 0 0 1.25rem 0;
  padding-left: 1.5rem;
}

.article-body :deep(li) {
  margin-bottom: 0.4rem;
}

.article-body :deep(strong) {
  color: #0f172a;
  font-weight: 700;
}

/* Adaptive mobile layout adjustments */
@media (max-width: 768px) {
  .hero {
    min-height: 300px;
  }

  .hero-overlay {
    padding: 2.5rem 1rem 2rem;
  }

  .section {
    padding: 1.5rem 1rem 3rem;
  }

  .article-body {
    padding: 2rem 1.25rem;
  }

  .article-body :deep(h2) {
    font-size: 1.35rem;
    margin: 1.5rem 0 0.85rem 0;
  }
}
</style>
