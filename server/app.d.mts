export function createApiApp(options: { dataDir: string; token?: string }): Promise<{ app: import('express').Express; store: unknown }>;
