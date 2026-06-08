<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const articles = ref([
  {
    id: 1,
    title: 'NTI otvára nový inkubačný program pre startupy',
    date: '15. mája 2024',
    excerpt: 'Nový inkubačný program ponúka študentom a mladým podnikateľom jedinečnú príležitosť rozvíjať svoje nápady s podporou skúsených mentorov.',
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
    category: 'Programy'
  },
  {
    id: 2,
    title: 'Úspešný workshop o AI a strojovom učení',
    date: '10. mája 2024',
    excerpt: 'Viac ako 50 študentov sa zúčastnilo workshopu zameraného na praktické aplikácie umelej inteligencie v podnikaní.',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop',
    category: 'Workshopy'
  },
  {
    id: 3,
    title: 'Partnerstvo s lokálnymi technologickými firmami',
    date: '5. mája 2024',
    excerpt: 'NTI uzavrelo strategické partnerstvá s piatimi vedúcimi technologickými spoločnosťami v regióne na podporu talentov.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
    category: 'Partnerstvá'
  },
  {
    id: 4,
    title: 'Študentský startup získal investíciu',
    date: '28. apríla 2024',
    excerpt: 'Tím študentov z programu NTI úspešne získal počiatočnú investíciu na rozvoj svojho inovatívneho projektu.',
    image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&h=400&fit=crop',
    category: 'Úspechy'
  }
])

function goToArticle(id) {
  router.push({ name: 'article', params: { id } })
}
</script>

<template>
  <div class="news-list-page">
    <section class="hero">
      <div class="hero-content">
        <h1>Novinky</h1>
        <p class="hero-subtitle">Aktuality z NTI a technologického ekosystému</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="articles-grid">
          <article
            v-for="article in articles"
            :key="article.id"
            class="article-card"
            @click="goToArticle(article.id)"
          >
            <div class="article-image">
              <img :src="article.image" :alt="article.title" />
              <span class="article-category">{{ article.category }}</span>
            </div>
            <div class="article-content">
              <div class="article-meta">
                <span class="article-date">{{ article.date }}</span>
              </div>
              <h2>{{ article.title }}</h2>
              <p class="article-excerpt">{{ article.excerpt }}</p>
              <span class="read-more">Čítať viac →</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Main viewport page canvas */
.news-list-page {
  min-height: 100vh;
  width: 100%;
  background: #f8fafc; /* Premium slate base background */
}

/* 1. Centered Hero Section Design Rules */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem 2.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.hero-content {
  max-width: 38rem;
  width: 100%;
}

.hero-content h1 {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: #0f172a;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

/* Structural Layout Content Grid */
.section {
  padding: 3rem 2rem 5rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

/* 2. Premium Article Cards & Shadows UI Architecture */
.article-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(79, 70, 229, 0.15);
}

.article-image {
  position: relative;
  height: 210px;
  width: 100%;
  overflow: hidden;
  border-bottom: 1px solid rgba(79, 70, 229, 0.06);
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Category Badge utilizing specific premium pill token rules */
.article-category {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}

.article-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.article-meta {
  margin-bottom: 0.65rem;
}

/* Date aligned with eyebrow text formatting variables */
.article-date {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.article-content h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.01em;
}

.article-excerpt {
  color: #475569;
  font-size: 0.94rem;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
  flex-grow: 1;
}

.read-more {
  color: #4f46e5;
  font-weight: 700;
  font-size: 0.84rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  transition: color 0.15s ease;
}

.article-card:hover .read-more {
  color: #4338ca;
}

/* Fluid Viewport Micro-Adjustments */
@media (max-width: 768px) {
  .hero {
    padding: 3rem 1rem 1.5rem;
  }

  .hero-content h1 {
    font-size: 2.25rem;
  }

  .section {
    padding: 2rem 1rem 4rem;
  }

  .articles-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
</style>
