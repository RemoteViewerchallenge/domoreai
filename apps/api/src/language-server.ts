import { spawn, ChildProcess } from 'child_process';

export function launchLanguageServer(): ChildProcess {
  const command = 'typescript-language-server';
  const args = ['--stdio'];

  console.log(`Spawning language server: ${command} ${args.join(' ')}`);

  const languageServerProcess = spawn(command, args, {
    shell: true, // Using shell to help find the command in path
  });

  languageServerProcess.on('error', (err) => {
    console.error('Failed to start language server process.', err);
  });

  languageServerProcess.stderr.on('data', (data) => {
    console.error(`LSP STDERR: ${data.toString()}`);
  });

  languageServerProcess.on('exit', (code) => {
    console.log(`Language server exited with code ${code}`);
  });

  console.log('Language server process created.');

  return languageServerProcess;
}
