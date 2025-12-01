<template>
  <nav class="navbar">
    <div class="container">
      <div class="navbar-brand">
        <router-link to="/" class="logo">
          <span>ToolBox</span>
        </router-link>
      </div>
      <div class="search-bar">
        <input type="text" placeholder="搜索工具..." v-model="searchQuery" />
      </div>
      <div class="navbar-actions">
        <button class="btn" @click="toggleTheme">
          <span class="icon">☀️</span>
        </button>
        <button class="btn" @click="goToUserCenter">
          <span class="icon">👤</span>
        </button>
      </div>
    </div>
  </nav>
  </template>

<script setup lang="ts">
import { ref } from 'vue'

const searchQuery = ref('')
const toggleTheme = () => {}
const goToUserCenter = () => {}
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
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
    text-decoration: none;
  }
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
