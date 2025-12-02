<template>
  <div class="tool-card" @click="handleClick" :class="{ 'is-favorite': isFavorite }">
    <div class="card-icon">
      <template v-if="props.tool.id === 'img-compress'">
        <svg viewBox="0 0 24 24" width="32" height="32" role="img" aria-hidden="true">
          <path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm2 0v14h12V5H6z"/>
          <path fill="currentColor" d="M8.5 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 0 0-3 0zm6.2 1.3l3.3 4.7H6l3.4-4.2l1.8 2.2l1.5-1.9z"/>
          <path fill="currentColor" d="M9 4h6v2H9zM7 18h10v2H7z"/>
        </svg>
      </template>
      <img v-else :src="tool.icon" :alt="tool.name" />
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
  if (typeof props.tool.url === 'string' && props.tool.url.startsWith('/')) {
    router.push(props.tool.url)
    return
  }
  if (props.tool.id === 'img-compress') {
    router.push('/image-compress')
    return
  }
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
  color: $primary-color;
}
.card-icon img {
  width: 32px;
  height: 32px;
}
.card-icon svg {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08));
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
