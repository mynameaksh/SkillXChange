import { create } from 'zustand'
import api from '../utils/api.js'

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: null,
  setToken: (token) => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    set({ token })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },
  fetchMe: async () => {
    const { data } = await api.get('/api/users/me')
    set({ user: data })
    return data
  }
}))


