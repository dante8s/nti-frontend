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
      path: '/complete-registration',
      name: 'complete-registration',
      component: () => import('@/views/auth/CompleteRegistration.vue'),
    },
    {
      path: '/complete-org-invite',
      name: 'complete-org-invite',
      component: () => import('@/views/auth/CompleteOrgInvite.vue'),
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
      path: '/organizations',
      name: 'public-organizations',
      meta: { title: 'Organizations' },
      component: () => import('@/views/public/Organizations.vue'),
    },
    {
      path: '/organizations/:id',
      name: 'public-organization',
      meta: { title: 'Organization' },
      component: () => import('@/views/public/OrganizationPublicProfile.vue'),
    },
    {
      path:'/mentors',
      name: 'public-mentors',
      meta: {title: 'Mentors'},
      component: () => import('@/views/public/Mentors.vue'),
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
          meta: {
            title: 'Профіль учасника',
            requiresAnyRole: ['STUDENT', 'EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'],
          },
          component: () => import('@/views/student/MemberProfileView.vue'),
        },
        {
          path: 'applications/:id',
          name: 'application-details',
          meta: {
            title: 'Application details',
            requiresAnyRole: [
              'STUDENT',
              'MENTOR',
              'ADMIN',
              'SUPER_ADMIN',
              'EVALUATOR',
              'SUPER_EVALUATOR',
            ],
          },
          component: () => import('@/views/ApplicationDetails.vue'),
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
          path: 'admin/milestone-approvals',
          name: 'admin-milestone-approvals',
          meta: { title: 'Milestone approvals', requiresAdmin: true },
          component: () => import('@/views/admin/MilestoneApprovals.vue'),
        },
        {
          path: 'admin/programs',
          name: 'admin-programs',
          meta: { title: 'Програми та виклики', requiresAdmin: true },
          component: () => import('@/views/admin/AdminPrograms.vue'),
        },
        {
          path: 'evaluation',
          redirect: { name: 'commission-hub' },
        },
        {
          path: 'commission',
          name: 'commission-hub',
          meta: {
            title: 'Комісія',
            requiresAnyRole: ['EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'],
          },
          component: () => import('@/views/commission/CommissionProgramHub.vue'),
        },
        {
          path: 'commission/participants/:programType',
          name: 'commission-participants',
          meta: {
            title: 'Учасники програми',
            requiresAnyRole: ['EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'],
          },
          component: () => import('@/views/commission/CommissionParticipantsView.vue'),
        },
        {
          path: 'commission/call/:callId/application/:applicationId',
          name: 'commission-evaluate',
          meta: {
            title: 'Оцінювання заявки',
            requiresAnyRole: ['EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'],
          },
          component: () => import('@/views/commission/CommissionApplicationEvaluateView.vue'),
        },
        {
          path: 'reporting',
          component: () => import('@/views/reporting/ReportingLayout.vue'),
          meta: {
            title: 'Звітність',
            requiresAnyRole: ['ADMIN', 'SUPER_ADMIN', 'EVALUATOR', 'SUPER_EVALUATOR'],
          },
          children: [
            {
              path: '',
              name: 'reporting-index',
              meta: { title: 'Звітність' },
              component: () => import('@/views/reporting/ReportingIndexRedirect.vue'),
            },
            {
              path: 'admin',
              name: 'reporting-admin',
              meta: {
                title: 'Звітність — адміністрування',
                requiresAnyRole: ['ADMIN', 'SUPER_ADMIN', 'EVALUATOR', 'SUPER_EVALUATOR'],
              },
              component: () => import('@/views/reporting/ReportingAdminView.vue'),
            },
            {
              path: 'student',
              name: 'reporting-student',
              meta: {
                title: 'Звітність — студент / команда',
                requiresAnyRole: ['ADMIN', 'SUPER_ADMIN', 'EVALUATOR', 'SUPER_EVALUATOR'],
              },
              component: () => import('@/views/reporting/ReportingStudentPanelView.vue'),
            },
            {
              path: 'firm',
              name: 'reporting-firm',
              meta: {
                title: 'Звітність — компанія',
                requiresAnyRole: ['ADMIN', 'SUPER_ADMIN', 'EVALUATOR', 'SUPER_EVALUATOR'],
              },
              component: () => import('@/views/reporting/ReportingFirmPanelView.vue'),
            },
          ],
        },
        {
          path: 'admin/program-review-queue',
          name: 'admin-program-review-queue',
          meta: { title: 'Черга Program B', requiresAdmin: true },
          component: () => import('@/views/admin/ProgramReviewQueue.vue'),
        },
        {
          path: 'admin/organizations',
          name: 'admin-organizations',
          meta: { title: 'Організації', requiresAdmin: true },
          component: () => import('@/views/admin/Organizations.vue'),
        },
        {
          path: 'admin/organizations/:id',
          name: 'OrganizationDetails',
          meta: { title: 'Organization details', requiresAdmin: true },
          component: () => import('@/views/admin/OrganizationDetails.vue'),
        },
        {
          path: 'admin/mentorships',
          name: 'admin-mentorships',
          meta: { title: 'Mentorships', requiresAdmin: true },
          component: () => import('@/views/admin/MentorshipsManagement.vue'),
        },
        {
          path: 'org/register',
          name: 'org-register',
          meta: { title: 'Реєстрація організації', requiresRole: 'FIRM' },
          component: () => import('@/views/organization/OrgRegisterView.vue'),
        },
        {
          path: 'org/profile',
          name: 'org-profile',
          meta: { title: 'Профіль організації', requiresAnyRole: ['FIRM', 'FIRM_USER'] },
          component: () => import('@/views/organization/OrgProfileView.vue'),
        },
        {
          path: 'programs/my',
          name: 'my-programs',
          meta: { title: 'Мої програми B', requiresRole: 'FIRM' },
          component: () => import('@/views/programs/MyPrograms.vue'),
        },
        {
          path: 'mentor/my-mentorships',
          name: 'mentor-my-mentorships',
          meta: { title: 'My Mentorships', requiresRole: 'MENTOR' },
          component: () => import('@/views/mentor/MyMentorships.vue'),
        },
      ],
    },

    { path: '/dashboard', redirect: '/app/dashboard' },
    { path: '/admin/users', redirect: '/app/admin/users' },
    { path: '/admin/organizations', redirect: '/app/admin/organizations' },
    { path: '/app/org', redirect: '/app/org/profile' },
    {
      path: '/apply/a/:callId',
      redirect: (to) => ({ path: `/app/apply/a/${to.params.callId}` }),
    },
    {
      path: '/apply/b/:callId',
      redirect: (to) => ({ path: `/app/apply/b/${to.params.callId}` }),
    },
    {
      path: '/applications/:id',
      redirect: (to) => ({ path: `/app/applications/${to.params.id}` }),
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
