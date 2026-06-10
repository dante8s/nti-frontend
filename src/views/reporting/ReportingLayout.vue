<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <section class="reporting-shell">
    <header class="shell-header">
      <h2>Reporting</h2>
      <p class="shell-lead">
        Available from the Administration or Commission menu. View student / company panels — from buttons on the page
        summary and export; shows data for the current user (for interface testing).
      </p>
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
