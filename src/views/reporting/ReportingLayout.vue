<script setup>
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="reporting-shell">
    <header class="shell-header">
      <h2>{{ t('reporting.title') }}</h2>
      <p class="shell-lead">{{ t('reporting.lead') }}</p>
    </header>

    <RouterView />
  </section>
</template>

<style scoped>
.reporting-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.shell-header h2 {
  margin: 0;
}

.shell-lead {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.95rem;
}
</style>
