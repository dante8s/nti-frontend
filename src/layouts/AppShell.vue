<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { applicationsApi } from '@/api/applications'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import NotificationBell from '@/components/NotificationBell.vue'

const { t } = useI18n()
const auth = useAuthStore()
const orgStore = useOrganizationStore()
const route = useRoute()
const router = useRouter()

const mobileOpen = ref(false)

const isSuperAdmin = computed(() => auth.roles?.includes('SUPER_ADMIN'))
const isAdmin = computed(() =>
  auth.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'),
)
const isContentEditor = computed(() => auth.roles?.includes('CONTENT_EDITOR'))
const isStudent = computed(() => auth.roles?.includes('STUDENT'))
const showStudentNav = computed(() =>
  isStudent.value || auth.roles?.includes('SUPER_ADMIN'),
)
const isOrgUser = computed(() => auth.roles?.some((r) => r === 'FIRM'))
const isMentor = computed(() => auth.roles?.includes('MENTOR'))
const isCommissionMember = computed(() =>
  auth.roles?.some((r) => r === 'EVALUATOR' || r === 'SUPER_EVALUATOR'),
)
const showReportingNav = computed(
  () => isAdmin.value || isSuperAdmin.value,
)

const firmChecked = ref(false)
const firmHasOrg = ref(false)
const firmIsOwner = ref(false)

const adminNav = computed(() => {
  const items = []
  if (isAdmin.value) {
    items.push( 
      { to: '/app/admin/completion-requests', label: t('nav.completionRequests'), icon: '⊘' },
      { to: '/app/admin/applications', label: t('nav.applications'), icon: '◆' },
      { to: '/app/admin/milestone-approvals', label: t('nav.milestoneApprovals'), icon: '✓' },
      { to: '/app/admin/programs', label: t('nav.programs'), icon: '◇' },
      { to: '/app/admin/qualification-stacks', label: t('nav.qualificationStacks'), icon: '◧' },
      { to: '/app/admin/program-review-queue', label: t('nav.programBReview'), icon: '◬' },
      { to: '/app/admin/organizations', label: t('nav.organizations'), icon: '◈' },
      { to: '/app/admin/mentorships', label: t('nav.mentorships'), icon: '✦' },
      { to: '/app/admin/email-templates', label: t('nav.emailTemplates'), icon: '✉' },
      { to: '/app/admin/project-reports', label: t('nav.projectReports'), icon: '📊' },
      { to: '/app/admin/bulk-message', label: t('nav.bulkMessage'), icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>' },

    )
  }
  if (isSuperAdmin.value) {
    items.push(
      { to: '/app/admin/users', label: t('nav.users'), icon: '◎' },
      { to: '/app/admin/audit', label: t('nav.auditLog'), icon: '◑' },
    )
  }
  return items
})

const contentEditorNav = computed(() => {
  if (!isAdmin.value && !isContentEditor.value) return []
  return [
    { to: '/app/admin/about-page', label: t('nav.aboutPage'), icon: '◫' },
    { to: '/app/admin/news', label: t('nav.news'), icon: '◰' },
    { to: '/app/admin/success-stories', label: t('nav.successStories'), icon: '◆' },
    { to: '/app/admin/faq', label: t('nav.faqManagement'), icon: '?' },
  ]
})

const studentNav = computed(() => {
  if (!showStudentNav.value) return []
  return [
    { to: '/app/my-applications', label: t('nav.myApplications'), icon: '▸' },
    { to: '/app/my-profile', label: t('nav.myProfile'), icon: '◉' },
    { to: '/app/teams', label: t('nav.myTeam'), icon: '◍' },
  ]
})

const organizationNav = computed(() => {
  if (!isOrgUser.value || !firmChecked.value || !firmHasOrg.value) return []

  // 1. Initialize the base array with items all organization users can see
  const items = [
    { to: '/app/org/profile', label: t('nav.myOrganization'), icon: '◉' },
  ]

  // 2. Conditionally add the proposals link only if they are the owner
  if (firmIsOwner.value) {
    items.push({
      to: '/app/programs/my',
      label: t('nav.programBProposals'),
      icon: '◈'
    })
  }

  return items
})

const mentorNav = computed(() => {
  if (!isMentor.value) return []
  return [{ to: '/app/mentor/my-mentorships', label: t('nav.myMentorships'), icon: '◷' }]
})

const commissionNav = computed(() => {
  if (!isCommissionMember.value && !isAdmin.value && !isSuperAdmin.value) return []
  return [{ to: '/app/commission', label: t('nav.commissionLabel'), icon: '◌' }]
})

const reportingNav = computed(() => {
  if (!showReportingNav.value) return []
  return [{ to: '/app/reporting', label: t('nav.reportingLabel'), icon: '⬒' }]
})

const hasPORequests = ref(false)
const isOrgMember = computed(() =>
  auth.roles?.some((r) => r === 'FIRM' || r === 'FIRM_USER')
)

const poNav = computed(() => {
  if (!isOrgMember.value && !hasPORequests.value) return []
  return [{
    to: '/app/product-owner/completion-requests',
    label: t('nav.completionRequests'),
    icon: '✦',
    badge: hasPORequests.value
  }]
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

onMounted(async () => {
  await auth.hydrateUserFromSession()
  checkFirmOrg()
  checkPORequests()
})

async function checkPORequests() {
  try {
    const res = await applicationsApi.getPOCompletionRequests()
    hasPORequests.value = (res.data?.length ?? 0) > 0
  } catch {
    hasPORequests.value = false
  }
}

async function checkFirmOrg() {
  if (!isOrgUser.value) return
  firmIsOwner.value = false
  try {
    const my = await orgStore.getMy()
    const orgs = Array.isArray(my) ? my : []
    firmHasOrg.value = orgs.length > 0
    if (!firmHasOrg.value) return

    const primaryOrg = orgs[0]
    const members = await orgStore.getMembers(primaryOrg.id)
    const myEmail = auth.user?.email?.toLowerCase()
    const myUserId = auth.user?.id
    const membership = (members || []).find((member) => {
      if (myUserId != null && member?.userId != null) {
        return Number(member.userId) === Number(myUserId)
      }
      if (!myEmail) return false
      return String(member?.userEmail || '').toLowerCase() === myEmail
    })
    firmIsOwner.value = membership?.role === 'OWNER'
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
          {{ t('nav.brand') }}
        </RouterLink>
        <p class="shell__tag">{{ t('nav.tag') }}</p>
      </div>

      <nav class="shell__nav" :aria-label="t('nav.dashboard')">
        <RouterLink
          to="/app/dashboard"
          class="shell__link"
          :class="{ active: isActive('/app/dashboard') }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true">⌂</span>
          {{ t('nav.dashboard') }}
        </RouterLink>

        <p v-if="studentNav.length" class="shell__group-label">
          {{ t('nav.student') }}
        </p>
        <RouterLink
          v-for="item in studentNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>

        <p v-if="organizationNav.length" class="shell__group-label">
          {{ t('nav.organization') }}
        </p>
        <RouterLink
          v-for="item in organizationNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>

        <p v-if="mentorNav.length" class="shell__group-label">
          {{ t('nav.mentor') }}
        </p>
        <RouterLink
          v-for="item in mentorNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>

        <p v-if="commissionNav.length" class="shell__group-label">
          {{ t('nav.commission') }}
        </p>
        <RouterLink
          v-for="item in commissionNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>

        <p v-if="reportingNav.length" class="shell__group-label">
          {{ t('nav.reporting') }}
        </p>
        <RouterLink
          v-for="item in reportingNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>

        <p v-if="adminNav.length" class="shell__group-label">
          {{ t('nav.admin') }}
        </p>
        <RouterLink
          v-for="item in adminNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>

        <p v-if="contentEditorNav.length" class="shell__group-label">
          {{ t('nav.contentEditor') }}
        </p>
        <RouterLink
          v-for="item in contentEditorNav"
          :key="item.to"
          :to="item.to"
          class="shell__link"
          :class="{ active: isActive(item.to) }"
          @click="closeMobile"
        >
          <span class="shell__ico" aria-hidden="true" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>
        <template v-if="poNav.length">
          <p class="shell__group-label">{{ t('nav.productOwner') }}</p>
          <RouterLink
            v-for="item in poNav"
            :key="item.to"
            :to="item.to"
            class="shell__link"
            :class="{ active: isActive(item.to) }"
            @click="closeMobile"
          >
            <span class="shell__ico" aria-hidden="true">{{ item.icon }}</span>
            {{ item.label }}
            <span v-if="item.badge" class="shell__badge">!</span>
          </RouterLink>
        </template>

        <p class="shell__group-label">
          {{ t('nav.publicPrograms') }}
        </p>
        <RouterLink to="/programs/a" class="shell__link shell__link--ghost" @click="closeMobile">
          <span class="shell__ico" aria-hidden="true">A</span>
          {{ t('nav.catalogA') }}
        </RouterLink>
        <RouterLink to="/programs/b" class="shell__link shell__link--ghost" @click="closeMobile">
          <span class="shell__ico" aria-hidden="true">B</span>
          {{ t('nav.catalogB') }}
        </RouterLink>

        <p class="shell__group-label">
          {{ t('nav.publicOrganizations') }}
        </p>
        <RouterLink to="/organizations" class="shell__link shell__link--ghost" @click="closeMobile">
          <span class="shell__ico" aria-hidden="true">O</span>
          {{ t('nav.publicOrganizations') }}
        </RouterLink>

        <p class="shell__group-label">
          {{ t('nav.publicMentors') }}
        </p>
        <RouterLink to="/mentors" class="shell__link shell__link--ghost" @click="closeMobile">
          <span class="shell__ico" aria-hidden="true">M</span>
          {{ t('nav.publicMentors') }}
        </RouterLink>
      </nav>

      <div class="shell__user">
        <div class="shell__user-name">{{ auth.user?.name || t('nav.user') }}</div>
        <div class="shell__user-email">{{ auth.user?.email }}</div>
        <RouterLink to="/app/privacy" class="shell__privacy-link" @click="closeMobile">
          {{ t('nav.privacySettings') }}
        </RouterLink>
        <button type="button" class="shell__logout" @click="logout">
          {{ t('nav.logout') }}
        </button>
      </div>
    </aside>

    <div class="shell__main">
      <header class="shell__top">
        <button
          type="button"
          class="shell__burger"
          :aria-label="t('nav.openMenu')"
          @click="mobileOpen = !mobileOpen"
        >
          <span />
          <span />
          <span />
        </button>
        <h1 class="shell__title">
          {{ route.meta.title || t('nav.dashboard') }}
        </h1>
        <NotificationBell />
        <LanguageSwitcher />
        <RouterLink to="/" class="shell__site-link">
          {{ t('nav.toSite') }}
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
}

.shell__badge {
  margin-left: auto;
  background: #ef4444;
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 1px 5px;
  line-height: 1.4;
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

.shell__privacy-link {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: #64748b;
  text-decoration: none;
  text-align: center;
}

.shell__privacy-link:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.shell__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
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
  min-height: 0;
  padding: 1.5rem clamp(1rem, 3vw, 2.5rem) 3rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  overflow-y: auto;
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
