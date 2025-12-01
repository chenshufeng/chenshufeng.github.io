<template>
  <main class="home">
    <Navbar />
    <section class="hero">
      <div class="container">
        <h1>发现并使用强大的在线工具</h1>
        <p>一站式解决您的日常工作需求</p>
      </div>
    </section>
    <section class="tools-section">
      <div class="container">
        <div class="section-header">
          <h2>所有工具</h2>
          <div class="filter-controls">
            <button class="btn" @click="sortBy('name')">按名称排序</button>
            <button class="btn" @click="sortBy('popularity')">按热度排序</button>
          </div>
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
      </div>
    </section>
    <Footer />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToolsStore } from '@/stores/tools'
import Navbar from '@/components/ui/Navbar.vue'
import Footer from '@/components/ui/Footer.vue'
import ToolCard from '@/components/ui/ToolCard.vue'

const toolsStore = useToolsStore()
const { tools, loading, error } = storeToRefs(toolsStore)
const searchQuery = ref('')
const sortKey = ref<'name' | 'popularity'>('name')

onMounted(() => {
  toolsStore.fetchTools()
})

const fetchTools = () => toolsStore.fetchTools()

const filteredTools = computed(() => {
  return tools.value
    .filter((tool: any) =>
      String(tool.name).toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      String(tool.description).toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortKey.value === 'name') return String(a.name).localeCompare(String(b.name))
      if (sortKey.value === 'popularity') return Number(b.popularity) - Number(a.popularity)
      return 0
    })
})

const sortBy = (key: 'name' | 'popularity') => {
  sortKey.value = key
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
