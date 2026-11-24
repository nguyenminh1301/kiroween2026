import { createStore } from 'zustand/vanilla'

/** Sandbox wall light, toggled by the wall switch. */
export const lightStore = createStore<{ on: boolean }>()(() => ({ on: true }))
