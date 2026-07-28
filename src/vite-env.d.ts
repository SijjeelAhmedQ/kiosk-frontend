/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_IDLE_TIMEOUT_MS: string;
  readonly VITE_CURRENCY: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
