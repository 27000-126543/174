import { create } from 'zustand'
import type { Message } from '@/types'
import { api } from '@/lib/api'

interface MessageState {
  messages: Message[]
  unreadCount: number
  fetchMessages: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  getUnreadCount: () => number
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  unreadCount: 0,

  fetchMessages: async () => {
    try {
      const res = await api.get<any>('/messages')
      if (res.success && res.data) {
        const items = res.data.items || res.data
        const messages: Message[] = (Array.isArray(items) ? items : []).map((m: any) => ({
          id: String(m.id),
          userId: String(m.userId),
          type: m.type === 'data_lock' ? 'datalock' : ['system', 'visit', 'ethics', 'performance', 'randomization'].includes(m.type) ? 'other' : m.type,
          title: m.title || '',
          content: m.content || '',
          isRead: !!m.read,
          certificateUrl: m.relatedId ? `/api/messages/${m.id}/certificate` : null,
          createdAt: m.createdAt || '',
          relatedId: m.relatedId ? String(m.relatedId) : null,
        } as any))
        const apiUnreadCount = typeof res.data.unreadCount === 'number' ? res.data.unreadCount : messages.filter((m) => !m.isRead).length
        set({ messages, unreadCount: apiUnreadCount })
      }
    } catch {}
  },

  markAsRead: async (id: string) => {
    const state = get()
    const msg = state.messages.find(m => m.id === id)
    if (msg && msg.isRead) return
    try {
      await api.put(`/messages/${id}/read`)
      set((state) => {
        const wasUnread = state.messages.find(m => m.id === id && !m.isRead)
        return {
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, isRead: true } : m
          ),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        }
      })
    } catch {}
  },

  markAllRead: async () => {
    try {
      await api.put('/messages/read-all')
      set((state) => ({
        messages: state.messages.map((m) => ({ ...m, isRead: true })),
        unreadCount: 0,
      }))
    } catch {}
  },

  getUnreadCount: () => get().unreadCount,
}))
