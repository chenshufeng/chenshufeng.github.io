# 苹果风格工具箱网站开发方案

## 一、项目初始化

### 1. 项目创建与依赖安装

```bash
# 创建项目
npm create vite@latest toolbox-app -- --template vue-ts

# 进入项目目录
cd toolbox-app

# 安装依赖
npm install axios pinia vue-router@4

# 安装开发依赖
npm install -D sass
```

### 2. 项目结构目录

```
toolbox-app/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/            # 静态资源
│   │   ├── icons/         # 工具图标
│   │   └── styles/        # 全局样式
│   │       ├── variables.scss  # 颜色变量
│   │       └── main.scss       # 全局样式
│   ├── components/        # 组件
│   │   ├── ui/            # UI组件
│   │   │   ├── ToolCard.vue   # 工具卡片组件
│   │   │   ├── Navbar.vue     # 导航栏组件
│   │   │   └── Footer.vue     # 页脚组件
│   │   └── layouts/       # 布局组件
│   │       └── MainLayout.vue # 主布局组件
│   ├── router/            # 路由配置
│   │   └── index.ts
│   ├── stores/            # Pinia状态管理
│   │   ├── tools.ts       # 工具列表store
│   │   └── history.ts     # 使用历史store
│   ├── services/          # 服务层
│   │   └── api.ts         # API封装
│   ├── views/             # 页面组件
│   │   ├── Home.vue       # 主页
│   │   └── ToolDetail.vue # 工具详情页
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 二、核心代码实现

### 1. Vite配置文件 (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/styles/variables.scss";`
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
```

### 2. 全局样式变量 (`variables.scss`)

```scss
// 苹果设计风格颜色
$bg-primary: #f5f5f7;
$bg-secondary: #ffffff;
$text-primary: #1d1d1f;
$text-secondary: #86868b;
$primary-color: #0071e3;
$primary-hover: #0077ed;
$border-radius: 12px;
$shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
$transition: all 0.3s ease;

// 字体
$font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### 3. 主入口文件 (`main.ts`)

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import routes from './router'
import './assets/styles/main.scss'

const app = createApp(App)
const pinia = createPinia()
const router = createRouter({
  history: createWebHistory(),
  routes
})

app.use(pinia)
app.use(router)
app.mount('#app')
```

### 4. 路由配置 (`router/index.ts`)

```typescript
import { RouteRecordRaw } from 'vue-router'
import Home from '@/views/Home.vue'
import ToolDetail from '@/views/ToolDetail.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/tools/:id',
    name: 'ToolDetail',
    component: ToolDetail,
    props: true
  }
]

export default routes
```

### 5. Pinia Store (`stores/tools.ts`)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useToolsStore = defineStore('tools', () => {
  const tools = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const favorites = ref<string[]>([])
  const history = ref<string[]>([])
  
  // 获取工具列表
  const fetchTools = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.getTools()
      tools.value = response.data
    } catch (err) {
      error.value = 'Failed to fetch tools. Please try again.'
      console.error(err)
    } finally {
      loading.value = false
    }
  }
  
  // 添加到收藏
  const toggleFavorite = (toolId: string) => {
    const index = favorites.value.indexOf(toolId)
    if (index === -1) {
      favorites.value.push(toolId)
    } else {
      favorites.value.splice(index, 1)
    }
  }
  
  // 添加到历史记录
  const addToHistory = (toolId: string) => {
    // 移除已存在的记录
    const index = history.value.indexOf(toolId)
    if (index !== -1) {
      history.value.splice(index, 1)
    }
    // 添加到顶部
    history.value.unshift(toolId)
    // 限制历史记录数量
    if (history.value.length > 10) {
      history.value.pop()
    }
  }
  
  // 获取收藏的工具
  const favoriteTools = computed(() => {
    return tools.value.filter(tool => favorites.value.includes(tool.id))
  })
  
  // 获取最近使用的工具
  const recentTools = computed(() => {
    return tools.value.filter(tool => history.value.includes(tool.id))
  })
  
  return {
    tools,
    loading,
    error,
    favorites,
    history,
    fetchTools,
    toggleFavorite,
    addToHistory,
    favoriteTools,
    recentTools
  }
})
```

### 6. Axios封装 (`services/api.ts`)

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 可以在这里添加认证信息等
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response
  },
  error => {
    // 可以在这里统一处理错误
    return Promise.reject(error)
  }
)

// API方法
export default {
  getTools: () => api.get('/tools'),
  getToolById: (id: string) => api.get(`/tools/${id}`)
}
```

### 7. 导航栏组件 (`components/ui/Navbar.vue`)

```vue
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
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')

const toggleTheme = () => {
  // 切换主题逻辑
}

const goToUserCenter = () => {
  // 跳转到用户中心
}
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
  
  .navbar-brand {
    .logo {
      font-size: 24px;
      font-weight: 600;
      color: $text-primary;
      text-decoration: none;
    }
  }
  
  .search-bar {
    flex: 1;
    max-width: 400px;
    margin: 0 20px;
    
    input {
      width: 100%;
      padding: 10px 16px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: $border-radius;
      background-color: $bg-primary;
      font-size: 14px;
      transition: $transition;
      
      &:focus {
        outline: none;
        border-color: $primary-color;
        box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.2);
      }
    }
  }
  
  .navbar-actions {
    display: flex;
    gap: 12px;
    
    .btn {
      padding: 8px 12px;
      border: none;
      border-radius: $border-radius;
      background-color: transparent;
      cursor: pointer;
      transition: $transition;
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .icon {
        font-size: 18px;
      }
    }
  }
}
</style>
```

### 8. 工具卡片组件 (`components/ui/ToolCard.vue`)

```vue
<template>
  <div 
    class="tool-card" 
    @click="handleClick"
    :class="{ 'is-favorite': isFavorite }"
  >
    <div class="card-icon">
      <img :src="tool.icon" :alt="tool.name" />
    </div>
    <h3 class="card-title">{{ tool.name }}</h3>
    <p class="card-desc">{{ tool.description }}</p>
    <button 
      class="favorite-btn" 
      @click.stop="toggleFavorite"
      :aria-label="isFavorite ? '取消收藏' : '收藏'"
    >
      <span>{{ isFavorite ? '❤️' : '🤍' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToolsStore } from '@/stores/tools'

const props = defineProps({
  tool: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const toolsStore = useToolsStore()

const isFavorite = computed(() => {
  return toolsStore.favorites.includes(props.tool.id)
})

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
  
  &:hover {
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
    
    img {
      width: 32px;
      height: 32px;
    }
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
    
    &:hover {
      transform: scale(1.1);
    }
  }
}
</style>
```

### 9. 主页组件 (`views/Home.vue`)

```vue
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
          <!-- 骨架屏 -->
          <div class="skeleton-card" v-for="i in 6" :key="i"></div>
        </div>
        
        <div v-else-if="error" class="error-message">
          <p>{{ error }}</p>
          <button class="btn" @click="fetchTools">重试</button>
        </div>
        
        <div v-else class="tools-grid">
          <ToolCard 
            v-for="tool in filteredTools" 
            :key="tool.id" 
            :tool="tool"
          />
        </div>
      </div>
    </section>
    
    <Footer />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToolsStore } from '@/stores/tools'
import Navbar from '@/components/ui/Navbar.vue'
import Footer from '@/components/ui/Footer.vue'
import ToolCard from '@/components/ui/ToolCard.vue'

const toolsStore = useToolsStore()
const searchQuery = ref('')
const sortKey = ref('name')

onMounted(() => {
  toolsStore.fetchTools()
})

const filteredTools = computed(() => {
  return toolsStore.tools
    .filter(tool => 
      tool.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey.value === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortKey.value === 'popularity') {
        return b.popularity - a.popularity
      }
      return 0
    })
})

const sortBy = (key: string) => {
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
  
  h1 {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 16px;
    color: $text-primary;
  }
  
  p {
    font-size: 20px;
    color: $text-secondary;
    max-width: 600px;
    margin: 0 auto;
  }
}

.tools-section {
  padding: 64px 0;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
    
    h2 {
      font-size: 28px;
      font-weight: 600;
      color: $text-primary;
    }
    
    .filter-controls {
      display: flex;
      gap: 12px;
      
      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: $border-radius;
        background-color: $bg-secondary;
        color: $text-primary;
        cursor: pointer;
        transition: $transition;
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        &.active {
          background-color: $primary-color;
          color: white;
        }
      }
    }
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
    
    p {
      font-size: 18px;
      color: $text-secondary;
      margin-bottom: 24px;
    }
    
    .btn {
      padding: 12px 24px;
      background-color: $primary-color;
      color: white;
      border: none;
      border-radius: $border-radius;
      cursor: pointer;
      transition: $transition;
      
      &:hover {
        background-color: $primary-hover;
      }
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.6;
  }
}
</style>
```

## 三、苹果设计风格实现说明

1. **圆角元素**：使用统一的`$border-radius`变量（12px），应用于卡片、按钮、输入框等元素

2. **半透明效果**：导航栏使用`backdrop-filter: blur(8px)`实现毛玻璃效果

3. **细腻阴影**：使用`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08)`创建柔和阴影

4. **过渡动画**：所有交互元素（按钮、卡片）使用`transition: all 0.3s ease`实现平滑过渡

5. **色彩方案**：使用苹果风格的浅色调背景（#f5f5f7）和主色调（#0071e3）

6. **排版层次**：清晰的标题和正文区分，使用不同的字体大小和颜色

7. **留白**：在组件之间使用充足的间距，提高可读性和呼吸感

## 四、开发与部署步骤

### 开发步骤

1. 克隆项目仓库
2. 安装依赖：`npm install`
3. 启动开发服务器：`npm run dev`
4. 访问`http://localhost:3000`进行开发

### 部署步骤

1. 构建生产版本：`npm run build`
2. 部署`dist`目录到服务器
3. 配置服务器以支持历史模式路由（如Nginx配置）

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 五、总结

本方案提供了一个基于Vue3、Vite、Pinia和Axios的苹果风格工具箱网站的完整开发方案。通过模块化的组件设计、状态管理和API封装，实现了一个功能完整、交互流畅的工具平台。网站采用苹果设计风格，具有简洁干净的界面、细腻的动画效果和良好的用户体验。
</solution>
