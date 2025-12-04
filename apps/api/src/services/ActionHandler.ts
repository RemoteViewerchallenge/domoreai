import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class ActionHandler {
  async executeActionsFromText(text: string, workspaceRoot: string) {
    const actions = [];

    const fileRegex = /```write:(.*?)[\n\r]+([\s\S]*?)```/g;
    let match;
    while ((match = fileRegex.exec(text)) !== null) {
      const relativePath = match[1].trim();
      const content = match[2];
      await this.writeFile(workspaceRoot, relativePath, content);
      actions.push({ type: 'write', path: relativePath });
    }

    const cmdRegex = /```bash:(.*?)[\n\r]+([\s\S]*?)```/g;
    while ((match = cmdRegex.exec(text)) !== null) {
      const command = match[2].trim();
      const output = await this.runCommand(workspaceRoot, command);
      actions.push({ type: 'command', command, output });
    }

    return actions;
  }

  private async writeFile(root: string, relPath: string, content: string) {
    const fullPath = path.join(root, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    console.log(`[ActionHandler] 📝 Wrote file: ${relPath}`);
  }

  private async runCommand(root: string, command: string) {
    try {
      console.log(`[ActionHandler] 💻 Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { cwd: root });
      return stdout || stderr;
    } catch (e: any) {
      return e.message;
    }
  }
}
