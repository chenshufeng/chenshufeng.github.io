<template>
  <main class="home">
    <Navbar />
    <section class="hero">
      <div class="container">
        <div class="brand-logo" aria-label="网站Logo">
          <svg viewBox="0 0 24 24" width="64" height="64" role="img" aria-hidden="true">
            <path fill="currentColor" d="M10 4h4a2 2 0 0 1 2 2v2h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1h3V6a2 2 0 0 1 2-2zm4 4V6h-4v2h4z"/>
          </svg>
          <span class="brand-text">ToolBox</span>
        </div>
        <h1>你的高效数字工具箱</h1>
        <p>一站式解决您的日常工作需求</p>
      </div>
    </section>
    <section class="tools-section">
      <div class="container">
        <div class="section-header">
          <h2>所有工具</h2>
<!--          <div class="filter-controls">
            <button class="btn" @click="sortBy('name')">按名称排序</button>
            <button class="btn" @click="sortBy('popularity')">按热度排序</button>
          </div>-->
        </div>
        <div v-if="loading" class="skeleton-grid">
          <div class="skeleton-card" v-for="i in 6" :key="i"></div>
        </div>
        <div v-else-if="error" class="error-message">
          <p>{{ error }}</p>
          <button class="btn" @click="fetchTools">重试</button>
        </div>
        <div v-else class="tools-grid">
          <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
        </div>
        <div class="pagination" v-if="pageCount > 1">
          <button class="btn" :disabled="pageNum === 1" @click="goPrev">上一页</button>
          <span class="page-info">{{ pageNum }} / {{ pageCount }}</span>
          <button class="btn" :disabled="pageNum === pageCount" @click="goNext">下一页</button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToolsStore } from '@/stores/tools'
import Navbar from '@/components/ui/Navbar.vue'
import ToolCard from '@/components/ui/ToolCard.vue'

const toolsStore = useToolsStore()
const { tools, loading, error, pageNum, pageSize, total, searchQuery } = storeToRefs(toolsStore)
const sortKey = ref<'name' | 'popularity'>('name')

onMounted(() => {
  toolsStore.fetchToolsPage(1)
})

const fetchTools = () => toolsStore.fetchToolsPage(pageNum.value)

const filteredTools = computed(() => {
  return tools.value
    .filter((tool: any) =>
      String(tool.name).toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      String((tool.description ?? '')).toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortKey.value === 'name') return String(a.name).localeCompare(String(b.name))
      if (sortKey.value === 'popularity') return Number(b.popularity || 0) - Number(a.popularity || 0)
      return 0
    })
})


const pageCount = computed(() => {
  const t = Number(total.value || 0)
  const size = Number(pageSize.value || 1)
  return Math.max(1, Math.ceil(t / size))
})

const goPrev = () => {
  if (pageNum.value > 1) toolsStore.fetchToolsPage(pageNum.value - 1)
}

const goNext = () => {
  if (pageNum.value < pageCount.value) toolsStore.fetchToolsPage(pageNum.value + 1)
}
</script>

<style scoped lang="scss">
.home {
  background-color: $bg-primary;
  min-height: 100vh;
}
.hero {
  background-color: $bg-secondary;
  padding: 64px 0;
  text-align: center;
}
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: $border-radius;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: $shadow;
  margin: 0 auto 16px;
  color: $primary-color;
}
.brand-logo svg {
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08));
}
.brand-text {
  font-size: 20px;
  font-weight: 700;
}
.hero h1 {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  color: $text-primary;
}
.hero p {
  font-size: 20px;
  color: $text-secondary;
  max-width: 600px;
  margin: 0 auto;
}
.tools-section {
  padding: 64px 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}
.section-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: $text-primary;
}
.filter-controls {
  display: flex;
  gap: 12px;
}
.filter-controls .btn {
  padding: 8px 16px;
  border: none;
  border-radius: $border-radius;
  background-color: $bg-secondary;
  color: $text-primary;
  cursor: pointer;
  transition: $transition;
}
.filter-controls .btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}
.pagination .page-info {
  color: $text-secondary;
}
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
.skeleton-card {
  height: 280px;
  background-color: $bg-secondary;
  border-radius: $border-radius;
  animation: pulse 1.5s infinite;
}
.error-message {
  text-align: center;
  padding: 64px 0;
}
.error-message p {
  font-size: 18px;
  color: $text-secondary;
  margin-bottom: 24px;
}
.error-message .btn {
  padding: 12px 24px;
  background-color: $primary-color;
  color: white;
  border: none;
  border-radius: $border-radius;
  cursor: pointer;
  transition: $transition;
}
.error-message .btn:hover {
  background-color: $primary-hover;
}
@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.8; }
  100% { opacity: 0.6; }
}
</style>
