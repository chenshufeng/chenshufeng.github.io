import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useToolsStore = defineStore('tools', () => {
  const tools = ref<Array<Record<string, any>>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const favorites = ref<string[]>([])
  const history = ref<string[]>([])
  const pageNum = ref(1)
  const pageSize = ref(12)
  const total = ref(0)
  const searchQuery = ref('')

  const fetchTools = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.getTools()
      tools.value = response.data
    } catch (e) {
      error.value = 'Failed to fetch tools. Please try again.'
    } finally {
      loading.value = false
    }
  }

  const fetchToolsPage = async (page?: number) => {
    loading.value = true
    error.value = null
    if (typeof page === 'number') pageNum.value = page
    try {
      const res = await api.getToolsPaged({ pageNum: pageNum.value, pageSize: pageSize.value })
      const d = res.data
      tools.value = Array.isArray(d?.list) ? d.list : []
      total.value = Number(d?.total ?? tools.value.length)
    } catch (e) {
      error.value = 'Failed to fetch tools. Please try again.'
    } finally {
      loading.value = false
    }
  }

  const toggleFavorite = (toolId: string) => {
    const index = favorites.value.indexOf(toolId)
    if (index === -1) {
      favorites.value.push(toolId)
    } else {
      favorites.value.splice(index, 1)
    }
  }

  const addToHistory = (toolId: string) => {
    const index = history.value.indexOf(toolId)
    if (index !== -1) {
      history.value.splice(index, 1)
    }
    history.value.unshift(toolId)
    if (history.value.length > 10) {
      history.value.pop()
    }
  }

  const favoriteTools = computed(() => {
    return tools.value.filter(tool => favorites.value.includes(tool.id))
  })

  const recentTools = computed(() => {
    return tools.value.filter(tool => history.value.includes(tool.id))
  })

  const setSearchQuery = (q: string) => {
    searchQuery.value = q
  }

  return {
    tools,
    loading,
    error,
    favorites,
    history,
    pageNum,
    pageSize,
    total,
    searchQuery,
    fetchTools,
    fetchToolsPage,
    toggleFavorite,
    addToHistory,
    favoriteTools,
    recentTools,
    setSearchQuery
  }
})
