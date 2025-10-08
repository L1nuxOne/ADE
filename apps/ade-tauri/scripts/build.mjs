import { spawnSync } from 'node:child_process';

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });
  return result.status ?? 1;
};

const inCi = process.env.CI === 'true';

if (!inCi) {
  const tauriStatus = run('tauri', ['build']);
  if (tauriStatus === 0) {
    process.exit(0);
  }
  console.warn('[tauri build] failed or CLI missing, falling back to vite build');
}

const viteStatus = run('vite', ['build']);
process.exit(viteStatus);
