import path from 'node:path';
import express from 'express';
import { createApiApp } from './app.mjs';

const host = process.env.API_HOST || '127.0.0.1';
const port = Number(process.env.API_PORT || 47823);
const token = process.env.API_TOKEN || '';
const dataDir = process.env.DATA_DIR || path.resolve('.local-data');
const { app: api } = await createApiApp({ dataDir, token });
const app = express();
app.use('/api', api);
app.listen(port, host, () => {
  console.log(`回溯错题本接口：http://${host}:${port}/api`);
  if (host !== '127.0.0.1' && host !== '::1' && !token) {
    console.warn('警告：非本地接口必须设置 API_TOKEN，并建议使用 HTTPS 反向代理。');
  }
});
