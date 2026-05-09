<template>
  <section class="org-profile">
    <div class="org-profile__back">
      <router-link :to="{ name: 'public-organizations' }">
        ← Organizations
      </router-link>
    </div>

    <div v-if="loading" class="org-profile__state">
      Loading…
    </div>
    <div v-else-if="error" class="org-profile__state org-profile__state--error">
      {{ error }}
    </div>
    <div v-else-if="!organization" class="org-profile__state">
      Organization not found.
    </div>
    <article v-else class="org-profile__card">
      <h1>{{ organization.name || 'Organization' }}</h1>
      <p v-if="organization.sector" class="org-profile__sector">
        {{ organization.sector }}
      </p>
      <p v-if="organization.description" class="org-profile__desc">
        {{ organization.description }}
      </p>
      <p v-else class="org-profile__desc org-profile__desc--muted">
        No description provided.
      </p>
      <a
        v-if="organization.website"
        class="org-profile__website"
        :href="normalizeWebsite(organization.website)"
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit website
      </a>
    </article>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { organizationsApi } from '@/api/organizations'

const route = useRoute()
const list = ref([])
const loading = ref(true)
const error = ref('')

const orgId = computed(() => route.params.id)

const organization = computed(() => {
  const id = orgId.value
  if (id == null || id === '') return null
  return (list.value || []).find((o) => String(o?.id) === String(id)) || null
})

onMounted(load)

watch(orgId, () => {
  load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await organizationsApi.getPublicAll()
    list.value = res.data || []
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to load organization.'
    list.value = []
  } finally {
    loading.value = false
  }
}

function normalizeWebsite(url) {
  if (!url) return '#'
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
</script>

<style scoped>
.org-profile {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}

.org-profile__back {
  margin-bottom: 1.25rem;
}

.org-profile__back a {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
}

.org-profile__back a:hover {
  text-decoration: underline;
}

.org-profile__state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
}

.org-profile__state--error {
  color: #b91c1c;
}

.org-profile__card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.75rem;
  background: white;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.org-profile__card h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  color: #0f172a;
}

.org-profile__sector {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 600;
}

.org-profile__desc {
  margin: 0 0 1rem;
  color: #475569;
  line-height: 1.6;
}

.org-profile__desc--muted {
  color: #94a3b8;
  font-style: italic;
}

.org-profile__website {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #4f46e5;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
}

.org-profile__website:hover {
  background: #4338ca;
}
</style>
