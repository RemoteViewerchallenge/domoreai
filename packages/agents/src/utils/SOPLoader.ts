import * as fs from 'fs/promises';
import * as path from 'path';

export async function loadSOP(name: string, context: object): Promise<string> {
  const sopPath = path.join(process.cwd(), 'packages', 'agents', 'sops', `${name}.md`);
  let content = await fs.readFile(sopPath, 'utf-8');

  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, String(value));
  }

  return content;
}
