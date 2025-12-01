import { spawn } from 'child_process';

const shell = spawn('/bin/bash', ['-i'], {
    env: process.env
});

shell.stdout.on('data', (data) => {
    console.log('STDOUT:', data.toString());
});

shell.stderr.on('data', (data) => {
    console.log('STDERR:', data.toString());
});

shell.on('exit', (code) => {
    console.log('Exited:', code);
});

// Write a command
setTimeout(() => {
    console.log('Writing ls...');
    shell.stdin.write('ls\n');
}, 1000);

// Write exit
setTimeout(() => {
    shell.stdin.write('exit\n');
}, 2000);
