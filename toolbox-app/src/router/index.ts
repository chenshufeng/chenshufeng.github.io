import type { RouteRecordRaw } from 'vue-router'
import Home from '@/views/Home.vue'
import ToolDetail from '@/views/ToolDetail.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: Home },
  { path: '/tools/:id', name: 'ToolDetail', component: ToolDetail, props: true }
]

export default routes
