import { spawn } from 'child_process';

console.log('Spawning script pty...');
const shell = spawn('script', ['-q', '-c', '/bin/bash', '/dev/null'], {
  env: { ...process.env, TERM: 'xterm-256color' },
  cwd: process.cwd()
});

shell.stdout.on('data', (data) => {
  console.log('STDOUT:', JSON.stringify(data.toString()));
});

shell.stderr.on('data', (data) => {
  console.log('STDERR:', JSON.stringify(data.toString()));
});

shell.on('exit', (code) => {
  console.log('EXIT:', code);
});

// Write 'ls' after a second
setTimeout(() => {
  console.log('Writing ls...');
  shell.stdin.write('ls\n');
}, 1000);

// Exit after 3 seconds
setTimeout(() => {
  console.log('Killing...');
  shell.kill();
}, 3000);
