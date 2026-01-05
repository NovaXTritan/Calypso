import { create } from 'zustand'
export const useUI = create(set => ({
  reducedMotion: false,
  setReducedMotion: v => set({ reducedMotion: v }),
}))
