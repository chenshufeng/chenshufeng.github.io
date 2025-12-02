import type { RouteRecordRaw } from 'vue-router'
import Home from '@/views/Home.vue'
import ToolDetail from '@/views/ToolDetail.vue'
import ImageCompress from '@/views/ImageCompress.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: Home },
  { path: '/tools/:id', name: 'ToolDetail', component: ToolDetail, props: true },
  { path: '/image-compress', name: 'ImageCompress', component: ImageCompress }
]

export default routes
