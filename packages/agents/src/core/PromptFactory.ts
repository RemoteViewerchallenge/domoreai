import { loadSOP } from '../utils/SOPLoader';

export interface AgentLesson {
  rule: string;
  confidence: number;
}

export interface LessonProvider {
  getLessons(keywords: string[]): Promise<AgentLesson[]>;
}

export class PromptFactory {
  constructor(private lessonProvider: LessonProvider) {}

  async build(
    role: string, 
    userQuery: string, 
    memoryConfig?: { useProjectMemory: boolean },
    tools?: string[],
    projectPrompt?: string
  ): Promise<string> {
    // 1. Load Static Layers
    // We try to load a global system prompt, falling back if not found (though usually it should exist)
    let globalPrompt = '';
    try {
      globalPrompt = await loadSOP('system_global', {});
    } catch {
      // Ignore if global prompt doesn't exist or handle gracefully
    }

    // Load the specific role prompt
    const rolePrompt = await loadSOP(role, {});

    // 2. Identify Context (Simple keyword matching for now)
    // 3. Load Dynamic Layer (The "Learning" Integration)
    let lessons: AgentLesson[] = [];
    
    if (memoryConfig?.useProjectMemory) {
      const keywords = this.extractKeywords(userQuery); 
      lessons = await this.lessonProvider.getLessons(keywords);
    }

    const memoryBlock = lessons.length > 0 
      ? `\n## 🧠 PREVIOUS LESSONS\n${lessons.map(l => `- ${l.rule}`).join('\n')}`
      : '';

    // 4. Load Tool Definitions & Examples
    let toolSection = '';
    try {
      // Dynamic import fs to avoid bundling issues if this package is ever used in browser
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Resolve path to .domoreai/tools
      // Assuming process.cwd() is the project root or apps/api
      let rootDir = process.cwd();
      if (rootDir.endsWith('apps/api')) {
          rootDir = path.resolve(rootDir, '../../');
      }
      
      const toolsDir = path.join(rootDir, '.domoreai/tools');
      
      const files = await fs.readdir(toolsDir).catch(() => []);
      
      let toolDefs = '';
      let toolExamples = '';

      for (const file of files) {
          // If tools list is provided, only include files that start with one of the tool names
          // The file naming convention is [serverName].d.ts or [serverName]_examples.md
          // We assume 'tools' array contains server names like 'git', 'postgres'
          
          let shouldInclude = true;
          if (tools && tools.length > 0) {
             const serverName = file.split('.')[0].split('_')[0];
             if (!tools.includes(serverName)) {
                 shouldInclude = false;
             }
          }

          if (shouldInclude) {
              if (file.endsWith('.d.ts')) {
                  const content = await fs.readFile(path.join(toolsDir, file), 'utf-8');
                  toolDefs += content + '\n';
              }
              if (file.endsWith('_examples.md')) {
                  const content = await fs.readFile(path.join(toolsDir, file), 'utf-8');
                  toolExamples += content + '\n';
              }
          }
      }

      if (toolDefs) {
        toolSection = `
## 🛠️ AVAILABLE TOOLS (TYPE DEFINITIONS)
\`\`\`typescript
${toolDefs}
\`\`\`

## 💡 USAGE EXAMPLES
${toolExamples}
`;
      }
    } catch {
      // Ignore errors if tools directory doesn't exist or can't be read
    }

    // 5. Project Specific Prompt
    const projectSection = projectPrompt ? `\n## 🏗️ PROJECT CONTEXT & GUIDELINES\n${projectPrompt}\n` : '';

    return `${globalPrompt}\n\n${rolePrompt}\n${projectSection}\n${memoryBlock}${toolSection}`;
  }

  private extractKeywords(query: string): string[] {
    // Simple logic: split by space, filter common words
    // Or use a lightweight NLP library
    return query.toLowerCase().split(' ').filter(w => w.length > 3);
  }
}
