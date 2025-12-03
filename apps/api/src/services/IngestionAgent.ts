import { onFileWrite } from './vfs/events.js';
import * as path from 'path';
import fs from 'fs/promises';
import { IVfsProvider } from './vfs/IVfsProvider.js';
import { vectorStore, chunkText, createEmbedding } from './vector.service.js';
import ignore from 'ignore';

class IngestionAgent {
  private pdfParse: any;
  private ignoreFilter: any;
  private readonly textExtensions = ['.ts', '.js', '.tsx', '.jsx', '.md', '.json', '.css', '.html', '.txt', '.yaml', '.yml', '.sql'];
  private readonly binaryExtensions = ['.pdf', '.docx', '.png'];

  constructor() {
    this.subscribeToVfsEvents();
    this.initializeIgnoreFilter();
  }

  private async initializeIgnoreFilter(): Promise<void> {
    try {
      const gitignoreContent = await this.readGitIgnore();
      this.ignoreFilter = ignore().add(gitignoreContent);
    } catch (error) {
      console.warn('Failed to read .gitignore.  Indexing all files.', error);
      this.ignoreFilter = () => false; // Allow all files if .gitignore can't be read
    }
  }

  private async readGitIgnore(): Promise<string> {
    const rootPath = '/home/guy/mono'; // Hardcoded root path for now.  Ideally, this would be passed in.
    const gitignorePath = path.join(rootPath, '.gitignore');
    return await fs.readFile(gitignorePath, 'utf-8');
  }

  private subscribeToVfsEvents() {
    onFileWrite((data) => {
      this.handleFileWrite(data.provider, data.filePath, data.content);
    });
  }

  private async handleFileWrite(provider: IVfsProvider, filePath: string, content: Buffer) {
    const fileExtension = path.extname(filePath).toLowerCase();

    if (this.textExtensions.includes(fileExtension)) {
       // Check if the file should be ignored
       if (this.ignoreFilter && !this.ignoreFilter(filePath)) {
          const text = content.toString('utf-8');
          await this.indexFile(filePath, text);
       } else {
          // console.log(`Ignoring file: ${filePath}`);
       }
    } else if (this.binaryExtensions.includes(fileExtension)) {
      try {
        const markdownContent = await this.parseFile(fileExtension, content);
        const shadowFilePath = await this.generateShadowFile(provider, filePath, markdownContent);

        // Check if the file should be ignored
        if (!this.ignoreFilter(shadowFilePath)) {
          await this.indexFile(shadowFilePath, markdownContent);
        } else {
          console.log(`Ignoring file: ${shadowFilePath}`);
        }

      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
  }

  public async ingestRepository(dir: string) {
      console.log(`Scanning directory: ${dir}`);
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.domoreai' || entry.name === 'dist' || entry.name === '.turbo') continue;
                await this.ingestRepository(fullPath);
            } else {
                // Check ignore
                // Note: ignoreFilter expects relative paths usually, but let's see. 
                // If ignoreFilter is set up with root, we might need relative path.
                // For now, let's try passing the full path or relative to root.
                // Assuming this.ignoreFilter works with the paths we have.
                if (this.ignoreFilter && this.ignoreFilter(fullPath)) continue;
                
                const ext = path.extname(fullPath).toLowerCase();
                if (this.textExtensions.includes(ext)) {
                     const content = await fs.readFile(fullPath);
                     const text = content.toString('utf-8');
                     await this.indexFile(fullPath, text);
                }
            }
        }
      } catch (err) {
          console.error(`Error scanning directory ${dir}:`, err);
      }
  }

  private async indexFile(filePath: string, content: string) {
    const chunks = chunkText(content);
    const vectors = await Promise.all(chunks.map(async (chunk, i) => {
      const embedding = await createEmbedding(chunk);
      return {
        id: `${filePath}#${i}`,
        vector: embedding,
        metadata: {
          filePath,
          chunk,
        },
      };
    }));

    await vectorStore.add(vectors);
  }

  private async generateShadowFile(provider: IVfsProvider, originalPath: string, markdownContent: string): Promise<string> {
    const originalPathInfo = path.parse(originalPath);
    const shadowFileName = `${originalPathInfo.name}.md`;
    const shadowFilePath = path.join(originalPathInfo.dir, '.domoreai', 'shadow', shadowFileName);

    await provider.write(shadowFilePath, markdownContent);
    console.log(`Shadow file created: ${shadowFilePath}`);
    return shadowFilePath;
  }

  private async parseFile(fileExtension: string, content: Buffer): Promise<string> {
    if (this.textExtensions.includes(fileExtension)) {
      return content.toString('utf-8');
    }

    switch (fileExtension) {
      case '.pdf':
        if (!this.pdfParse) {
          const mod = await import('pdf-parse') as any;
          this.pdfParse = mod.default || mod;
        }
        const data = await this.pdfParse(content);
        return data.text;
      case '.docx':
        // TODO: Implement DOCX parsing, potentially using a library like 'mammoth'
        console.log('DOCX parsing not yet implemented.');
        return 'DOCX content placeholder';
      case '.png':
        // TODO: Implement PNG parsing using a multimodal LLM
        console.log('PNG parsing not yet implemented.');
        return 'PNG content placeholder';
      default:
        throw new Error(`Unsupported file type for parsing: ${fileExtension}`);
    }
  }
}

export const ingestionAgent = new IngestionAgent();
