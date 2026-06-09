import { create } from 'zustand'
import type { Message } from '@/types'
import { api } from '@/lib/api'

interface MessageState {
  messages: Message[]
  unreadCount: number
  fetchMessages: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  getUnreadCount: () => number
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  unreadCount: 0,

  fetchMessages: async () => {
    const res = await api.get<Message[]>('/messages')
    if (res.success && res.data) {
      const unread = res.data.filter((m) => !m.isRead).length
      set({ messages: res.data, unreadCount: unread })
    }
  },

  markAsRead: async (id: string) => {
    const res = await api.put(`/messages/${id}/read`)
    if (res.success) {
      set((state) => {
        const messages = state.messages.map((m) =>
          m.id === id ? { ...m, isRead: true } : m
        )
        return {
          messages,
          unreadCount: messages.filter((m) => !m.isRead).length,
        }
      })
    }
  },

  getUnreadCount: () => get().unreadCount,
}))
