import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
          meta: { title: 'Мої заявки', requiresAnyRole: ['STUDENT', 'SUPER_ADMIN'] },
          component: () => import('@/views/student/MyApplications.vue'),
        },
        {
          path: 'my-profile',
          name: 'my-profile',
          meta: { title: 'Мій профіль', requiresAnyRole: ['STUDENT', 'SUPER_ADMIN'] },
          component: () => import('@/views/student/StudentProfilePage.vue'),
        },
        {
          path: 'teams',
          name: 'teams',
          meta: { title: 'Моя команда', requiresAnyRole: ['STUDENT', 'SUPER_ADMIN'] },
          component: () => import('@/views/student/TeamsPage.vue'),
        },
        {
          path: 'applications/:id',
          name: 'application-details',
          meta: {
            title: 'Application details',
            requiresAnyRole: ['STUDENT', 'MENTOR', 'ADMIN', 'SUPER_ADMIN', 'FIRM', 'FIRM_USER'],
          },
          component: () => import('@/views/ApplicationDetails.vue'),
        },
        {
          path: 'apply/a/:callId',
          name: 'apply-a',
          meta: { title: 'Заявка — програма A', requiresAnyRole: ['STUDENT', 'SUPER_ADMIN'] },
          component: () => import('@/views/student/ApplicationFormA.vue'),
        },
        {
          path: 'apply/b/:callId',
          name: 'apply-b',
          meta: { title: 'Заявка — програма B', requiresAnyRole: ['STUDENT', 'SUPER_ADMIN'] },
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
          path: 'commission/:programType',
          name: 'commission-participants',
          meta: {
            title: 'Комісія — учасники',
            requiresAnyRole: ['EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'],
          },
          component: () => import('@/views/commission/CommissionParticipantsView.vue'),
        },
        {
          path: 'commission/:programType/call/:callId/application/:applicationId',
          name: 'commission-evaluate',
          meta: {
            title: 'Оцінювання заявки',
            requiresAnyRole: ['EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'],
          },
          component: () => import('@/views/commission/CommissionApplicationEvaluateView.vue'),
        },
        {
          path: 'members/:userId',
          name: 'member-profile',
          meta: {
            title: 'Профіль учасника',
            requiresAnyRole: [
              'STUDENT',
              'MENTOR',
              'EVALUATOR',
              'SUPER_EVALUATOR',
              'ADMIN',
              'SUPER_ADMIN',
            ],
          },
          component: () => import('@/views/student/MemberProfileView.vue'),
        },
        {
          path: 'reporting',
          component: () => import('@/views/reporting/ReportingLayout.vue'),
          meta: {
            title: 'Звітність',
            requiresAnyRole: ['EVALUATOR', 'SUPER_EVALUATOR', 'ADMIN', 'SUPER_ADMIN'],
          },
          children: [
            {
              path: '',
              name: 'reporting',
              component: () => import('@/views/reporting/ReportingIndexRedirect.vue'),
            },
            {
              path: 'admin',
              name: 'reporting-admin',
              meta: { title: 'Звітність — зведення та експорт' },
              component: () => import('@/views/reporting/ReportingAdminView.vue'),
            },
            {
              path: 'student',
              name: 'reporting-student',
              meta: { title: 'Панель студента' },
              component: () => import('@/views/reporting/ReportingStudentPanelView.vue'),
            },
            {
              path: 'firm',
              name: 'reporting-firm',
              meta: { title: 'Панель компанії' },
              component: () => import('@/views/reporting/ReportingFirmPanelView.vue'),
            },
          ],
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

function metaFromMatched(to, key) {
  for (let i = to.matched.length - 1; i >= 0; i--) {
    const value = to.matched[i].meta[key]
    if (value !== undefined) return value
  }
  return undefined
}

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.matched.some((r) => r.meta.requiresAuth) && !auth.isLoggedIn) {
    return { name: 'login' }
  }

  const requiresRole = metaFromMatched(to, 'requiresRole')
  if (requiresRole) {
    const ok = auth.user?.roles?.includes(requiresRole)
    if (!ok) {
      return { name: 'dashboard' }
    }
  }

  const requiresAnyRole = metaFromMatched(to, 'requiresAnyRole')
  if (requiresAnyRole) {
    const required = Array.isArray(requiresAnyRole) ? requiresAnyRole : []
    const ok = required.some((r) => auth.user?.roles?.includes(r))
    if (!ok) {
      return { name: 'dashboard' }
    }
  }

  if (to.matched.some((r) => r.meta.requiresSuperAdmin)) {
    if (!auth.user?.roles?.includes('SUPER_ADMIN')) {
      return { name: 'dashboard' }
    }
  }

  if (to.matched.some((r) => r.meta.requiresAdmin)) {
    if (!hasAdminRole(auth.user?.roles)) {
      return { name: 'dashboard' }
    }
  }
})

export default router
