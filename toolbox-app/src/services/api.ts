import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 5000 })

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
    return await api.get(`/tools/${id}`)
  } catch {
    const res = await axios.get('/tools.json')
    const item = Array.isArray(res.data) ? res.data.find((t: any) => String(t.id) === String(id)) : null
    return { data: item }
  }
}

export default { getTools, getToolById }
