import { createRouter, createWebHistory, RouterView } from 'vue-router'
import Tr from "@/i18n/translation"

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes: [
    {
      path: "/:locale?",
      component: RouterView,
      beforeEnter: Tr.routeMiddleware,
      children: [
        {
          path: ':pathMatch(.*)*',
          component: () => import('@/views/404.vue')
        },
        {
          path: '',
          name: 'home',
          component: () => import('@/views/Home.vue')
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/Auth/Login.vue')
        },
        {
          path: 'registration',
          name: 'registration',
          component: () => import('@/views/Auth/Reg.vue')
        },
        {
          path: 'regsuccess',
          name: 'regsuccess',
          component: () => import('@/views/Auth/RegSuccess.vue')
        },
        {
          path: 'restore',
          name: 'restore',
          component: () => import('@/views/Auth/Restore.vue')
        },
        {
          path: 'newpass',
          name: 'newpass',
          component: () => import('@/views/Auth/NewPass.vue')
        },
        {
          path: 'personal',
          name: 'personal',
          component: () => import('@/views/Personal.vue')
        },
        {
          path: 'articles',
          name: 'articles',
          component: () => import('@/views/Articles.vue')
        },
        {
          path: 'faq',
          name: 'faq',
          component: () => import('@/views/Faq.vue')
        },
        {
          path: 'partner',
          name: 'partner',
          component: () => import('@/views/Partner.vue')
        },
        {
          path: 'release',
          name: 'release',
          component: () => import('@/views/Quiz.vue'),
          beforeEnter: async (to) => {
            const payment = to.query.payment;
            const pv = Array.isArray(payment) ? payment[0] : payment;
            if (pv === 'success' || pv === 'error') return true;
            try {
              const { fetchReleaseProfileReadiness } = await import(
                '@/utils/releaseProfileReadiness'
              );
              const result = await fetchReleaseProfileReadiness();
              if (result.ok) return true;
              return Tr.i18nRoute({
                name: 'setting',
                query: {
                  releaseBlocked: '1',
                  focus: result.focus,
                },
              });
            } catch {
              return true;
            }
          },
        },
        {
          path: 'setting',
          name: 'setting',
          component: () => import('@/views/Setting.vue')
        },
        {
          path: 'support',
          name: 'support',
          component: () => import('@/views/Support.vue')
        },
      ]
    }
  ],
  // scrollBehavior(to, savedPosition) {
  scrollBehavior(to) {
    if (to.hash) {
      return ({
        el: to.hash,
        behavior: 'auto',
      })
    // } else if (savedPosition) {
    //     return (savedPosition);
    } else {
      return {left: 0, top: 0}
    }
  },
})

// Глобальный перехватчик ошибок навигации
router.onError((error) => {
  // Проверяем, связана ли ошибка с 401 (Unauthorized)
  if (error.message?.includes('401') || error.response?.status === 401) {
    // Перенаправляем на страницу логина
    router.push({ name: 'login' })
  }
  console.error('Router error:', error)
})

export default router