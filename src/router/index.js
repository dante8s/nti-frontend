import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasStudentPortalAccess } from '@/utils/roles'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
    },

    {
      path: '/programs/:type',
      name: 'programs',
      component: () => import('@/views/public/ProgramList.vue'),
    },
    {
      path: '/programs/:type/:id',
      name: 'program-detail',
      component: () => import('@/views/public/ProgramDetail.vue'),
    },

    {
      path: '/app',
      component: () => import('@/layouts/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: { name: 'dashboard' },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          meta: { title: 'Дашборд' },
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'my-applications',
          name: 'my-applications',
          meta: { title: 'Мої заявки', requiresRole: 'STUDENT' },
          component: () => import('@/views/student/MyApplications.vue'),
        },
        {
          path: 'my-profile',
          name: 'my-profile',
          meta: { title: 'Мій профіль', requiresRole: 'STUDENT' },
          component: () => import('@/views/student/StudentProfilePage.vue'),
        },
        {
          path: 'teams',
          name: 'teams',
          meta: { title: 'Моя команда', requiresRole: 'STUDENT' },
          component: () => import('@/views/student/TeamsPage.vue'),
        },
        {
          path: 'member-profile/:userId',
          name: 'member-profile',
          meta: { title: 'Профіль учасника', requiresRole: 'STUDENT' },
          component: () => import('@/views/student/MemberProfileView.vue'),
        },
        {
          path: 'apply/a/:callId',
          name: 'apply-a',
          meta: { title: 'Заявка — програма A', requiresRole: 'STUDENT' },
          component: () => import('@/views/student/ApplicationFormA.vue'),
        },
        {
          path: 'apply/b/:callId',
          name: 'apply-b',
          meta: { title: 'Заявка — програма B', requiresRole: 'STUDENT' },
          component: () => import('@/views/student/ApplicationFormB.vue'),
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          meta: { title: 'Користувачі', requiresSuperAdmin: true },
          component: () => import('@/views/admin/AdminUsers.vue'),
        },
        {
          path: 'admin/applications',
          name: 'admin-applications',
          meta: { title: 'Заявки', requiresAdmin: true },
          component: () => import('@/views/admin/AdminApplications.vue'),
        },
        {
          path: 'admin/programs',
          name: 'admin-programs',
          meta: { title: 'Програми та виклики', requiresAdmin: true },
          component: () => import('@/views/admin/AdminPrograms.vue'),
        },
        {
          path: 'evaluation',
          name: 'evaluation',
          meta: { title: 'Оцінювання', requiresAnyRole: ['EVALUATOR', 'ADMIN', 'SUPER_ADMIN'] },
          component: () => import('@/views/evaluator/EvaluationPage.vue'),
        },
        {
          path: 'reporting',
          name: 'reporting',
          meta: { title: 'Звітність', requiresAnyRole: ['ADMIN', 'SUPER_ADMIN', 'EVALUATOR'] },
          component: () => import('@/views/admin/ReportingPage.vue'),
        },
      ],
    },

    { path: '/dashboard', redirect: '/app/dashboard' },
    { path: '/admin/users', redirect: '/app/admin/users' },
    {
      path: '/apply/a/:callId',
      redirect: (to) => ({ path: `/app/apply/a/${to.params.callId}` }),
    },
    {
      path: '/apply/b/:callId',
      redirect: (to) => ({ path: `/app/apply/b/${to.params.callId}` }),
    },
  ],
})

function hasAdminRole(roles) {
  return roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN')
}

function isSuperAdmin(roles) {
  return roles?.includes('SUPER_ADMIN')
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)

  if (requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }

  if (requiresAuth && auth.isLoggedIn && !auth.sessionHydrated) {
    await auth.hydrateSession()
  }

  const roles = auth.user?.roles || []
  const superAdmin = isSuperAdmin(roles)

  // SUPER_ADMIN gets full access across portal pages for testing/operations.
  if (superAdmin) return true

  if (to.meta.requiresRole) {
    const required = to.meta.requiresRole
    const ok =
      required === 'STUDENT'
        ? hasStudentPortalAccess(roles)
        : roles.includes(required)
    if (!ok) {
      return { name: 'dashboard' }
    }
  }

  if (to.meta.requiresAnyRole) {
    const allowed = to.meta.requiresAnyRole
    const ok = allowed.some((role) => roles.includes(role))
    if (!ok) {
      return { name: 'dashboard' }
    }
  }

  if (to.meta.requiresSuperAdmin) {
    if (!superAdmin) {
      return { name: 'dashboard' }
    }
  }

  if (to.meta.requiresAdmin) {
    if (!hasAdminRole(roles)) {
      return { name: 'dashboard' }
    }
  }
})

export default router
