/// <reference types="vite/client" />

interface Window {
  /** Debug contract, set only when the URL has ?debug. Never rename. */
  __los?: import('./app/debug').LosDebug
}
