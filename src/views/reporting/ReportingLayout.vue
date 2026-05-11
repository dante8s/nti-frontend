<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <section class="reporting-shell">
    <header class="shell-header">
      <h2>Звітність</h2>
      <p class="shell-lead">
        Доступно з меню «Адміністрування» або «Комісія». Перегляд панелей студента / компанії — з кнопок на сторінці
        зведення та експорту; показуються дані поточного користувача (для перевірки інтерфейсу).
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
