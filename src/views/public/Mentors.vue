<template>
  <div class="page">
    <div class="hero">
      <h1>Mentors</h1>
      <p>Browse mentors available in the NTI ecosystem</p>
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else class="mentors-grid">
      <div v-for="mentor in publicMentors" :key="mentor.id" class="mentor-card">
        <div class="mentor-avatar" aria-hidden="true" />
        <h2 class="mentor-name">
          {{ mentor.name || 'Unnamed mentor' }}
        </h2>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMentorshipStore } from '@/stores/mentorship'

const mentorshipStore = useMentorshipStore()
const { publicMentors } = storeToRefs(mentorshipStore)

const loading = ref(true)

async function load() {
  loading.value = true
  try {
    await mentorshipStore.getPublicMentors()
  } catch (e) {
    console.error('Failed to load mentors', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
}

.hero h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.hero p {
  color: #666;
}

.mentors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.mentor-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}

.mentor-avatar {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #e5e7eb;
  border: 4px solid #f8fafc;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.mentor-name {
  font-size: 1.1rem;
  margin: 0;
  text-align: center;
  color: #111827;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
}
</style>

