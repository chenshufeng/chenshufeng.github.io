import axios from 'axios'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const trimSlash = (s: string) => s.replace(/\/$/, '')
const withBase = (path: string) => (API_BASE ? `${trimSlash(API_BASE)}${path}` : path)

const api = axios.create({ baseURL: API_BASE ? `${trimSlash(API_BASE)}/api` : '/api', timeout: 5000 })

api.interceptors.request.use(config => config, error => Promise.reject(error))
api.interceptors.response.use(response => response, error => Promise.reject(error))

const getTools = async () => {
  try {
    return await api.get('/tools')
  } catch {
    return axios.get('/tools.json')
  }
}

const getToolById = async (id: string) => {
  try {
    const res = await axios.get(withBase(`/websit/tools/${id}`))
    const d = res.data
    const raw = d?.data ?? d ?? {}
    const item = {
      id: raw.toolId ?? raw.id ?? id,
      name: raw.toolName ?? raw.name ?? '',
      description: raw.toolDesc ?? raw.description ?? '',
      icon: raw.icon ?? raw.logo ?? '/vite.svg',
      popularity: Number(raw.popularity ?? raw.hot ?? 0),
      url: raw.toolUrl ?? raw.url ?? ''
    }
    return { data: item }
  } catch {
    const res = await axios.get('/tools.json')
    const found = Array.isArray(res.data) ? res.data.find((t: any) => String(t.id) === String(id)) : null
    return { data: found }
  }
}

const getToolsPaged = async (params: { pageNum: number; pageSize: number; keyword?: string }) => {
  try {
    const res = await axios.get(withBase('/websit/tools/pcList'), { params })
    const d = res.data
    const rows = Array.isArray(d?.rows)
      ? d.rows
      : Array.isArray(d?.list)
      ? d.list
      : Array.isArray(d?.data?.rows)
      ? d.data.rows
      : Array.isArray(d?.data?.list)
      ? d.data.list
      : Array.isArray(d?.data)
      ? d.data
      : []
    const list = rows.map((r: any) => ({
      id: r.toolId ?? r.id,
      name: r.toolName ?? r.name,
      description: r.toolDesc ?? r.description ?? '',
      icon: r.icon ?? r.logo ?? '/vite.svg',
      popularity: Number(r.popularity ?? r.hot ?? 0)
    }))
    const total = Number(d?.total ?? d?.data?.total ?? rows.length)
    return { data: { list, total } }
  } catch {
    const fallback = await axios.get('/tools.json')
    const all = Array.isArray(fallback.data) ? fallback.data : []
    const start = (params.pageNum - 1) * params.pageSize
    const end = start + params.pageSize
    const list = all.slice(start, end)
    return { data: { list, total: all.length } }
  }
}

export default { getTools, getToolById, getToolsPaged }
