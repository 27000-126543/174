import { create } from 'zustand'
import type { User, UserRole } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    })
    if (res.success && res.data) {
      localStorage.setItem('token', res.data.token)
      set({
        token: res.data.token,
        user: res.data.user,
        isAuthenticated: true,
      })
    } else {
      throw new Error(res.error || '登录失败')
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    if (!get().token) return
    const res = await api.get<User>('/auth/me')
    if (res.success && res.data) {
      set({ user: res.data, isAuthenticated: true })
    } else {
      localStorage.removeItem('token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))

const initAuth = () => {
  const token = localStorage.getItem('token')
  if (token) {
    useAuthStore.getState().fetchMe()
  }
}
initAuth()
