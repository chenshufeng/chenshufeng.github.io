<template>
  <main class="detail">
    <div class="container">
      <h1>{{ tool?.name || '工具详情' }}</h1>
      <p>{{ tool?.description || '' }}</p>
      <div class="detail-actions" v-if="tool">
        <img v-if="tool.icon" :src="tool.icon" alt="icon" class="detail-icon" />
        <a v-if="tool.url" class="btn primary" :href="tool.url" target="_blank">打开工具</a>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const tool = ref<Record<string, any> | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  const id = String(route.params.id)
  loading.value = true
  try {
    const res = await api.getToolById(id)
    tool.value = res.data
  } catch (e) {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.detail {
  padding: 64px 0;
}
.detail h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 16px;
}
.detail p {
  font-size: 16px;
  color: $text-secondary;
}
.detail-actions {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.detail-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: $bg-primary;
}
.btn.primary {
  padding: 12px 20px;
  background-color: $primary-color;
  color: #fff;
  border: none;
  border-radius: $border-radius;
  text-decoration: none;
}
.btn.primary:hover {
  background-color: $primary-hover;
}
</style>
