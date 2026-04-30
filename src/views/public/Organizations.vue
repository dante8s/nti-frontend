<template>
  <section class="org-page">
    <div class="org-hero">
      <div class="org-hero__overlay" />
      <div class="org-hero__inner">
        <span class="org-hero__eyebrow">Organizations</span>
        <h1>Explore partner organizations</h1>
        <p>
          Browse organizations participating in the NTI ecosystem. Learn what they do and visit their websites.
        </p>
      </div>
      <div class="org-hero__wave" aria-hidden="true" />
    </div>

    <div class="org-wrap">
      <div class="org-toolbar">
        <input
          v-model="search"
          type="search"
          class="org-search"
          placeholder="Search by name, sector, description…"
          aria-label="Search organizations"
        >
        <button type="button" class="org-btn" :disabled="loading" @click="load">
          Refresh
        </button>
      </div>

      <div v-if="loading" class="org-state">
        Loading…
      </div>
      <div v-else-if="error" class="org-state org-state--error">
        {{ error }}
      </div>
      <div v-else-if="filtered.length === 0" class="org-state">
        No organizations found.
      </div>
      <div v-else class="org-grid">
        <article v-for="org in filtered" :key="org.id" class="org-card">
          <div class="org-card__top">
            <h2 class="org-card__title">
              {{ org.name || 'Untitled organization' }}
            </h2>
            <p v-if="org.sector" class="org-card__sector">
              {{ org.sector }}
            </p>
          </div>

          <p v-if="org.description" class="org-card__desc">
            {{ org.description }}
          </p>
          <p v-else class="org-card__desc org-card__desc--muted">
            No description provided.
          </p>

          <div class="org-card__actions">
            <router-link
              v-if="isAdmin"
              class="org-link"
              :to="`/app/admin/organizations/${org.id}`"
            >
              Show details
            </router-link>
            <a
              v-if="org.website"
              class="org-link"
              :href="normalizeWebsite(org.website)"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit website
            </a>
            <span v-else class="org-link org-link--disabled">
              Website not available
            </span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '@/stores/organization'
import { useAuthStore } from '@/stores/auth'

const orgStore = useOrganizationStore()
const authStore = useAuthStore()
const { organizations } = storeToRefs(orgStore)

const loading = ref(true)
const error = ref('')
const search = ref('')
const isAdmin = computed(() =>
  authStore.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = organizations.value || []
  if (!q) return list
  return list.filter((o) => {
    const blob = [o?.name, o?.sector, o?.description].filter(Boolean).join(' ').toLowerCase()
    return blob.includes(q)
  })
})

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    await orgStore.getPublicAll()
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load organizations.'
  } finally {
    loading.value = false
  }
}

function normalizeWebsite(website) {
  if (!website) return ''
  const v = String(website).trim()
  if (!v) return ''
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  return `https://${v}`
}
</script>

<style scoped>
.org-page {
  width: 100%;
  background: #eef2ff;
  overflow-x: hidden;
}

.org-hero {
  position: relative;
  width: 100%;
  min-height: 520px;
  padding: 5rem 2rem 3rem;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, rgba(255, 255, 255, 0.18), transparent 40%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.35));
}

.org-hero::before,
.org-hero::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  filter: blur(55px);
  opacity: 0.55;
}

.org-hero::before {
  width: 180px;
  height: 180px;
  background: rgba(79, 70, 229, 0.24);
  top: 14%;
  left: 6%;
}

.org-hero::after {
  width: 220px;
  height: 220px;
  background: rgba(56, 189, 248, 0.18);
  bottom: 12%;
  right: 8%;
}

.org-hero__overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(255, 255, 255, 0.12), transparent 35%);
}

.org-hero__inner {
  position: relative;
  z-index: 1;
  max-width: 900px;
  text-align: center;
  color: white;
  padding: 2rem 1.5rem;
  animation: fadeInUp 0.9s ease both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.org-hero__eyebrow {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.org-hero__inner h1 {
  margin: 0;
  font-size: clamp(2.5rem, 5vw, 4.25rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  text-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
}

.org-hero__inner p {
  margin: 1.5rem auto 0;
  max-width: 740px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.05rem;
  line-height: 1.8;
}

.org-hero__wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 110px;
  background: linear-gradient(180deg, transparent 0%, #eef2ff 95%);
  clip-path: polygon(0 40%, 14% 30%, 35% 45%, 55% 28%, 76% 40%, 100% 30%, 100% 100%, 0% 100%);
  z-index: 0;
}

.org-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
  position: relative;
  z-index: 2;
  background: transparent;
}

.org-toolbar {
  display: flex;
  gap: 1rem;
  margin-top: -2.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.org-search {
  flex: 1;
  min-width: 220px;
  padding: 0.95rem 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(79, 70, 229, 0.16);
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.org-btn {
  padding: 0.95rem 1.35rem;
  border-radius: 999px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(79, 70, 229, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.org-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 44px rgba(67, 56, 202, 0.24);
  background: #4338ca;
}

.org-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 18px 40px rgba(79, 70, 229, 0.18);
}

.org-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #475569;
}

.org-state--error {
  color: #b91c1c;
}

.org-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.org-card {
  padding: 1.6rem;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(79, 70, 229, 0.08);
  box-shadow: 0 22px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  min-height: 220px;
}

.org-card__top {
  margin-bottom: 0.75rem;
}

.org-card__title {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: -0.01em;
  color: #0f172a;
}

.org-card__sector {
  margin: 0.35rem 0 0;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(79, 70, 229, 0.12);
  color: #3730a3;
}

.org-card__desc {
  margin: 0;
  color: #4b5563;
  line-height: 1.75;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.org-card__desc--muted {
  color: #94a3b8;
}

.org-card__actions {
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.org-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 800;
  color: #4f46e5;
  text-decoration: none;
}

.org-link:hover {
  text-decoration: underline;
}

.org-link--disabled {
  color: #94a3b8;
  font-weight: 700;
  text-decoration: none;
  cursor: default;
}

@media (max-width: 640px) {
  .org-hero {
    padding: 3.5rem 1rem 2.5rem;
    min-height: 460px;
  }

  .org-wrap {
    padding: 0 1rem 3rem;
  }

  .org-toolbar {
    margin-top: -2rem;
  }
}
</style>

