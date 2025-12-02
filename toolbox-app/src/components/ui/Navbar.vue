<template>
  <nav class="navbar">
    <div class="container">
      <div class="navbar-brand">
        <router-link to="/" class="logo" aria-label="网站Logo">
          <svg viewBox="0 0 24 24" width="28" height="28" role="img" aria-hidden="true">
            <path fill="currentColor" d="M10 4h4a2 2 0 0 1 2 2v2h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1h3V6a2 2 0 0 1 2-2zm4 4V6h-4v2h4z"/>
          </svg>
          <span class="brand-text">ToolBox</span>
        </router-link>
      </div>
      <div class="search-bar">
        <input type="text" placeholder="搜索工具..." v-model="queryRef" />
      </div>
<!--      <div class="navbar-actions">
        <button class="btn" @click="toggleTheme">
          <span class="icon">☀️</span>
        </button>
        <button class="btn" @click="goToUserCenter">
          <span class="icon">👤</span>
        </button>
      </div>-->
    </div>
  </nav>
  </template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToolsStore } from '@/stores/tools'

const toolsStore = useToolsStore()
const queryRef = computed({
  get: () => toolsStore.searchQuery,
  set: (val: string) => toolsStore.setSearchQuery(val)
})
</script>

<style scoped lang="scss">
.navbar {
  background-color: $bg-secondary;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  .container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
  }
  .navbar-brand .logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 700;
    color: $primary-color;
    text-decoration: none;
  }
  .navbar-brand .logo svg { filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.08)); }
  .navbar-brand .logo:hover { color: $primary-hover; }
  .search-bar {
    flex: 1;
    max-width: 400px;
    margin: 0 20px;
  }
  .search-bar input {
    width: 100%;
    padding: 10px 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: $border-radius;
    background-color: $bg-primary;
    font-size: 14px;
    transition: $transition;
  }
  .search-bar input:focus {
    outline: none;
    border-color: $primary-color;
    box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.2);
  }
  .navbar-actions {
    display: flex;
    gap: 12px;
  }
  .navbar-actions .btn {
    padding: 8px 12px;
    border: none;
    border-radius: $border-radius;
    background-color: transparent;
    cursor: pointer;
    transition: $transition;
  }
  .navbar-actions .btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  .navbar-actions .icon {
    font-size: 18px;
  }
}
</style>
