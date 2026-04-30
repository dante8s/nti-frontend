<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const hidePublicChrome = computed(() => route.path.startsWith('/app'))

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div id="app">
    <header v-if="!hidePublicChrome" class="app-header">
      <div class="brand-row">
        <router-link to="/" class="brand">NTI Nitra</router-link>
        <span class="brand-subtitle">Cловаччина · програми A/B</span>
      </div>
      <nav class="app-nav">
        <router-link to="/programs/a" class="nav-link">Програма A</router-link>
        <router-link to="/programs/b" class="nav-link">Програма B</router-link>

        <template v-if="!auth.isLoggedIn">
          <router-link to="/login" class="nav-link nav-login">Увійти</router-link>
          <router-link to="/register" class="nav-link nav-register">Зареєструватись</router-link>
        </template>
        <template v-else>
          <router-link to="/app/dashboard" class="nav-link nav-login">Кабінет</router-link>
          <button type="button" class="nav-link nav-register nav-btn" @click="logout">
            Вийти
          </button>
        </template>
      </nav>
    </header>

    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  background: #eef2ff;
  color: #111827;
  overflow-x: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(79, 70, 229, 0.12);
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  backdrop-filter: blur(18px);
}

.brand-row {
  display: flex;
  flex-direction: column;
}

.brand {
  font-weight: 800;
  font-size: 1.15rem;
  color: #1e293b;
  text-decoration: none;
}

.brand-subtitle {
  margin-top: 0.18rem;
  font-size: 0.82rem;
  color: #475569;
}

.app-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.nav-link {
  color: #475569;
  text-decoration: none;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.74);
  font: inherit;
  cursor: pointer;
}

.nav-link:hover {
  background: rgba(79, 70, 229, 0.14);
  color: #4338ca;
  transform: translateY(-1px);
}

.nav-login {
  border-color: rgba(79, 70, 229, 0.18);
}

.nav-register {
  background: #4338ca;
  color: white;
  border-color: rgba(79, 70, 229, 0.22);
}

.nav-btn {
  display: inline-flex;
  align-items: center;
}

main {
  flex: 1;
  width: 100%;
}

:global(html),
:global(body) {
  margin: 0;
  padding: 0;
  min-height: 100%;
  width: 100%;
  background: #eef2ff;
}

:global(body) {
  overflow-x: hidden;
}

@media (max-width: 780px) {
  .app-header {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
  }

  .app-nav {
    justify-content: center;
  }
}
</style>
