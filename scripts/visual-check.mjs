import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], { cwd: root, shell: true, stdio: 'ignore' });
const stop = (child) => {
  if (child.killed) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
};
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://127.0.0.1:5173/api/health')).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error('开发服务器未就绪');
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  await new Promise((resolve, reject) => {
    const browser = spawn(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1440,1000',
      '--virtual-time-budget=4000', `--screenshot=${path.join(root, 'artifacts', 'backtrack-overview.png')}`,
      'http://127.0.0.1:5173/',
    ], { stdio: 'ignore' });
    browser.once('error', reject);
    browser.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`浏览器退出码 ${code}`)));
  });
  console.log('界面截图已生成：artifacts/backtrack-overview.png');
} finally {
  stop(server);
}
