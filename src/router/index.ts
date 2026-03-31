import { createRouter, createWebHistory } from 'vue-router'

import AboutView from '../views/AboutView.vue'
import HomeView from '../views/HomeView.vue'
import PreviewPage from '../views/PreviewPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      path: '/preview',
      name: 'preview',
      component: PreviewPage,
    },
  ],
})

export default router
