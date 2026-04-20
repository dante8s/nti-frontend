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
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
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
      path: '/apply/a/:callId',
      name: 'apply-a',
      component: () => import('@/views/student/ApplicationFormA.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/apply/b/:callId',
      name: 'apply-b',
      component: () => import('@/views/student/ApplicationFormB.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/admin/AdminUsers.vue'),
      meta: {
        requiresAuth: true,
      },
    },
  ],
})

// Захист маршрутів
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }

  if (to.meta.requiresRole) {
    const hasRole = auth.user?.roles?.includes(to.meta.requiresRole)
    if (!hasRole) {
      return { name: 'dashboard' }
    }
  }
})

export default router
