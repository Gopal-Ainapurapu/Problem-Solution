import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🚀 Starting LocalLens MERN stack (Server + Client)...');
console.log('• Backend API:  http://localhost:5001');
console.log('• Frontend App: http://localhost:5173');
console.log('====================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const server = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'server'),
  stdio: 'pipe',
  shell: true,
});

const client = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'client'),
  stdio: 'pipe',
  shell: true,
});

server.stdout.on('data', (chunk) => {
  process.stdout.write(`[SERVER] ${chunk}`);
});

server.stderr.on('data', (chunk) => {
  process.stderr.write(`[SERVER ERROR] ${chunk}`);
});

client.stdout.on('data', (chunk) => {
  process.stdout.write(`[CLIENT] ${chunk}`);
});

client.stderr.on('data', (chunk) => {
  process.stderr.write(`[CLIENT ERROR] ${chunk}`);
});

const handleExit = () => {
  console.log('\nStopping LocalLens services...');
  server.kill();
  client.kill();
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
