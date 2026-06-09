<script setup>
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n()

const langs = ['sk', 'en', 'uk']

function setLang(lang) {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
</script>

<template>
  <div class="lang-switcher">
    <button
      v-for="lang in langs"
      :key="lang"
      class="lang-btn"
      :class="{ active: locale === lang }"
      @click="setLang(lang)"
    >
      {{ t(`lang.${lang}`) }}
    </button>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  gap: 2px;
  align-items: center;
}

.lang-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: transparent;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.lang-btn:hover {
  background: rgba(79, 70, 229, 0.08);
  color: #3730a3;
  border-color: rgba(79, 70, 229, 0.4);
}

.lang-btn.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}
</style>
