<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace({ name: 'reporting-admin' })
})
</script>

<template>
  <p class="hint">Redirecting…</p>
</template>

<style scoped>
.hint {
  margin: 0;
  color: #64748b;
}
</style>
