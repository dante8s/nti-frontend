<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

onMounted(() => {
  router.replace({ name: 'reporting-admin' })
})
</script>

<template>
  <p class="hint">{{ t('reporting.redirecting') }}</p>
</template>

<style scoped>
.hint {
  margin: 0;
  color: #64748b;
}
</style>
