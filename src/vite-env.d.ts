/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    backtrackDesktop?: {
      getApiInfo: () => Promise<{ baseUrl: string; token: string }>;
      selectDirectory: () => Promise<string | null>;
    };
  }
}
