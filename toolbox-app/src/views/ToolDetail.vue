<template>
  <main class="detail">
    <div class="container">
      <h1>{{ tool?.name || '工具详情' }}</h1>
      <p>{{ tool?.description || '' }}</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const tool = ref<Record<string, any> | null>(null)

onMounted(async () => {
  const id = String(route.params.id)
  try {
    const res = await api.getToolById(id)
    tool.value = res.data
  } catch {}
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
</style>
