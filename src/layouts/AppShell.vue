<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { hasStudentPortalAccess, hasTeamLeaderRole } from '@/utils/roles'

const auth = useAuthStore()
const orgStore = useOrganizationStore()
const route = useRoute()
const router = useRouter()

const mobileOpen = ref(false)

const isSuperAdmin = computed(() => auth.roles?.includes('SUPER_ADMIN'))
const isAdmin = computed(() =>
  auth.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
)
const canStudentPortal = computed(
  () => hasStudentPortalAccess(auth.roles) || isSuperAdmin.value,
)
const isEvaluator = computed(() => auth.roles?.includes('EVALUATOR'))
const showTeamLeaderBadge = computed(() => hasTeamLeaderRole(auth.roles))

const studentNavGroupTitle = computed(() => {
  if (showTeamLeaderBadge.value && hasStudentPortalAccess(auth.roles)) {
    return 'Студентський портал'
  }
  if (showTeamLeaderBadge.value) {
    return 'Лідер команди'
  }
  return 'Студент'
})

const isOrgUser = computed(() => auth.roles?.some((r) => r === 'FIRM' || r === 'FIRM_USER'))
const isMentor = computed(() => auth.roles?.includes('MENTOR'))

const firmChecked = ref(false)
const firmHasOrg = ref(false)

const adminNav = computed(() => {
  const items = []
  if (isAdmin.value) {
    items.push(
      { to: '/app/admin/applications', label: 'Заявки', icon: '◆' },
      { to: '/app/admin/milestone-approvals', label: 'Milestone approvals', icon: '✓' },
      { to: '/app/admin/programs', label: 'Програми та виклики', icon: '◇' },
      { to: '/app/admin/program-review-queue', label: 'Program B Review Queue', icon: '◬' },
      { to: '/app/admin/organizations', label: 'Організації', icon: '◈' },
      { to: '/app/reporting', label: 'Звітність', icon: '⬒' },
      { to: '/app/admin/mentorships', label: 'Mentorships', icon: '✦' },
    )
  }
  if (isEvaluator.value) {
    items.push({ to: '/app/evaluation', label: 'Оцінювання', icon: '◌' })
    if (!isAdmin.value) {
      items.push({ to: '/app/reporting', label: 'Звітність', icon: '⬒' })
    }
  }
  if (isSuperAdmin.value) {
    items.push({ to: '/app/admin/users', label: 'Користувачі', icon: '◎' })
  }
  return items
})

const studentNav = computed(() => {
  if (!canStudentPortal.value) return []
  return [
    { to: '/app/my-applications', label: 'Мої заявки', icon: '▸' },
    { to: '/app/my-profile', label: 'Мій профіль', icon: '◉' },
    { to: '/app/teams', label: 'Моя команда', icon: '◍' },
  ]
})

const organizationNav = computed(() => {
  if (!isOrgUser.value || !firmChecked.value || !firmHasOrg.value) return []
  return [
    { to: '/app/org/profile', label: 'My Organization', icon: '◉' },
    { to: '/app/programs/my', label: 'Program B Proposals', icon: '◈' },
  ]
})

const mentorNav = computed(() => {
  if (!isMentor.value) return []
  return [{ to: '/app/mentor/my-mentorships', label: 'My Mentorships', icon: '◷' }]
})



function logout() {
  auth.logout()
  router.push('/')
}

function closeMobile() {
  mobileOpen.value = false
}

function isActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

onMounted(checkFirmOrg)

async function checkFirmOrg() {
  if (!isOrgUser.value) return
  try {
    const my = await orgStore.getMy()
    firmHasOrg.value = Array.isArray(my) ? my.length > 0 : (my?.length > 0)
  } catch {
    // keep nav usable even if endpoint fails
  } finally {
    firmChecked.value = true
  }
}
</script>

<template>
  <div class="shell">
    <div
      class="shell__scrim"
      :data-open="mobileOpen"
      aria-hidden="true"
      @click="closeMobile"
    />

    <aside class="shell__aside" :data-open="mobileOpen">
      <div class="shell__brand">
        <RouterLink to="/" class="shell__logo" @click="closeMobile">
          NTI Nitra
        </RouterLink>
        <p class="shell__tag">Особистий кабінет</p>
      </div>

      <nav class="shell__nav" aria-label="Головна навігація">
        <RouterLink
          to="/app/dashboard"
          class="shell__link"
          :class="{ active: isActive('/app/dashboard') }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">⌂</span>
          Дашборд
        </RouterLink>

        <p v-if="studentNav.length" class="shell__group-label">
          {{ studentNavGroupTitle }}
          <span
            v-if="showTeamLeaderBadge"
            class="shell__group-tag"
            title="Роль у системі: лідер команди"
          >Лідер</span>
        </p>
        <RouterLink
          v-for="item in studentNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>

        <p v-if="organizationNav.length" class="shell__group-label">
          Organization
        </p>
        <RouterLink
          v-for="item in organizationNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>

        <p v-if="mentorNav.length" class="shell__group-label">
          Mentor
        </p>
        <RouterLink
          v-for="item in mentorNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>

        <p v-if="adminNav.length" class="shell__group-label">
          Адміністрування
        </p>
        <RouterLink
          v-for="item in adminNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>

        <p class="shell__group-label">
          Програми
        </p>
        <RouterLink
          to="/programs/a"
          class="shell__link shell__link--ghost"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">A</span>
          Каталог програми A
        </RouterLink>
        <RouterLink
          to="/programs/b"
          class="shell__link shell__link--ghost"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">B</span>
          Каталог програми B
        </RouterLink>

        <p class="shell__group-label">
          Organizations
        </p>
        <RouterLink
          to="/organizations"
          class="shell__link shell__link--ghost"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">O</span>
          Organizations
        </RouterLink>

        <p class="shell__group-label">
          Mentors
        </p>
        <RouterLink
          to="/mentors"
          class="shell__link shell__link--ghost"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">M</span>
          Mentors
        </RouterLink>
      </nav>

      <div class="shell__user">
        <div class="shell__user-name">{{ auth.user?.name || 'Користувач' }}</div>
        <div class="shell__user-email">{{ auth.user?.email }}</div>
        <div v-if="showTeamLeaderBadge" class="shell__role-row" aria-label="Додаткові ролі">
          <span class="shell__pill shell__pill--leader">Лідер команди</span>
        </div>
        <button type="button" class="shell__logout" @click="logout">
          Вийти
        </button>
      </div>
    </aside>

    <div class="shell__main">
      <header class="shell__top">
        <button
          type="button"
          class="shell__burger"
          aria-label="Відкрити меню"
          @click="mobileOpen = !mobileOpen"
        >
          <span />
          <span />
          <span />
        </button>
        <h1 class="shell__title">
          {{ route.meta.title || 'Кабінет' }}
        </h1>
        <RouterLink to="/" class="shell__site-link">
          На головну сайту
        </RouterLink>
      </header>
      <main class="shell__content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(165deg, #eef2ff 0%, #f8fafc 45%, #eef2ff 100%);
  color: #0f172a;
}

.shell__scrim {
  display: none;
}

.shell__aside {
  width: 280px;
  flex-shrink: 0;
  padding: 1.25rem 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.92);
  border-right: 1px solid rgba(79, 70, 229, 0.12);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  z-index: 40;
  backdrop-filter: blur(16px);
}

.shell__brand {
  padding: 0.35rem 0.65rem 1rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  margin-bottom: 1rem;
}

.shell__logo {
  font-weight: 800;
  font-size: 1.2rem;
  color: #1e293b;
  text-decoration: none;
  letter-spacing: -0.02em;
}

.shell__tag {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.shell__nav {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.shell__group-label {
  margin: 1rem 0 0.45rem 0.65rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.shell__group-tag {
  display: inline-block;
  padding: 0.12rem 0.42rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: none;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.shell__role-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.shell__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.shell__pill--leader {
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  color: #3730a3;
  border: 1px solid rgba(79, 70, 229, 0.28);
}

.shell__link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  margin-bottom: 0.2rem;
  border-radius: 12px;
  text-decoration: none;
  color: #475569;
  font-weight: 600;
  font-size: 0.92rem;
  transition: background 0.15s ease, color 0.15s ease;
}

.shell__link:hover {
  background: rgba(79, 70, 229, 0.08);
  color: #3730a3;
}

.shell__link.active {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(99, 102, 241, 0.12));
  color: #312e81;
  box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.2);
}

.shell__link--ghost {
  font-weight: 500;
  opacity: 0.92;
}

.shell__ico {
  width: 1.5rem;
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.85;
}

.shell__user {
  margin-top: auto;
  padding: 1rem 0.65rem 0.25rem;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.shell__user-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #1e293b;
}

.shell__user-email {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.15rem;
  word-break: break-all;
}

.shell__logout {
  margin-top: 0.75rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: white;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.shell__logout:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.shell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.shell__top {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(79, 70, 229, 0.1);
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.shell__burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: white;
  cursor: pointer;
  padding: 0 10px;
}

.shell__burger span {
  display: block;
  height: 2px;
  background: #4338ca;
  border-radius: 1px;
}

.shell__title {
  flex: 1;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.shell__site-link {
  font-size: 0.88rem;
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
  white-space: nowrap;
}

.shell__site-link:hover {
  text-decoration: underline;
}

.shell__content {
  flex: 1;
  padding: 1.5rem clamp(1rem, 3vw, 2.5rem) 3rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 960px) {
  .shell__burger {
    display: flex;
  }

  .shell__aside {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-105%);
    transition: transform 0.22s ease;
    box-shadow: 8px 0 32px rgba(15, 23, 42, 0.12);
  }

  .shell__aside[data-open='true'] {
    transform: translateX(0);
  }

  .shell__scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    z-index: 35;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .shell__scrim[data-open='true'] {
    opacity: 1;
    pointer-events: auto;
  }

  .shell__site-link {
    display: none;
  }
}
</style>
