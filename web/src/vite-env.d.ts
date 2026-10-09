/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL; defaults to "/api/v1", proxied to the Go server by Vite in dev. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
