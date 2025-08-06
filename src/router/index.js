import { createRouter, createWebHistory } from 'vue-router';
import { defineAsyncComponent } from 'vue';
import Home from '../views/Home.vue'

// const Home = defineAsyncComponent(() => import('../views/Home.vue'));
// const Upgrade = defineAsyncComponent(() => import('../views/Upgrade.vue'));
// const Battle = defineAsyncComponent(() => import('../views/Battle.vue'));

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    }
  ]
});

router.beforeEach( async (to,from,next) => {
      next()
})

export default router
