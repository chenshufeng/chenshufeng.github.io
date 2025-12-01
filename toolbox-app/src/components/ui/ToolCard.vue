<template>
  <div class="tool-card" @click="handleClick" :class="{ 'is-favorite': isFavorite }">
    <div class="card-icon">
      <img :src="tool.icon" :alt="tool.name" />
    </div>
    <h3 class="card-title">{{ tool.name }}</h3>
    <p class="card-desc">{{ tool.description }}</p>
    <button class="favorite-btn" @click.stop="toggleFavorite" :aria-label="isFavorite ? '取消收藏' : '收藏'">
      <span>{{ isFavorite ? '❤️' : '🤍' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToolsStore } from '@/stores/tools'

const props = defineProps<{ tool: Record<string, any> }>()

const router = useRouter()
const toolsStore = useToolsStore()

const isFavorite = computed(() => toolsStore.favorites.includes(props.tool.id))

const handleClick = () => {
  toolsStore.addToHistory(props.tool.id)
  router.push({ name: 'ToolDetail', params: { id: props.tool.id } })
}

const toggleFavorite = () => {
  toolsStore.toggleFavorite(props.tool.id)
}
</script>

<style scoped lang="scss">
.tool-card {
  background-color: $bg-secondary;
  border-radius: $border-radius;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: $transition;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.tool-card:hover {
  transform: translateY(-5px);
  box-shadow: $shadow;
}
.card-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background-color: $bg-primary;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-icon img {
  width: 32px;
  height: 32px;
}
.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: $text-primary;
}
.card-desc {
  font-size: 14px;
  color: $text-secondary;
  margin-bottom: 16px;
}
.favorite-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  transition: $transition;
}
.favorite-btn:hover {
  transform: scale(1.1);
}
</style>
