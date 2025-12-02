import { onFileWrite } from '../../../../apps/api/src/services/vfs/events.js';
import * as path from 'path';
import { IVfsProvider } from '../../../../apps/api/src/services/vfs/IVfsProvider.js';
import { vectorStore, chunkText, createEmbedding } from '../../../../apps/api/src/services/vector.service.js';

class IngestionAgent {
  private pdfParse: any;

  constructor() {
    this.subscribeToVfsEvents();
  }

  private subscribeToVfsEvents() {
    onFileWrite((data) => {
      this.handleFileWrite(data.provider, data.filePath, data.content);
    });
  }

  private async handleFileWrite(provider: IVfsProvider, filePath: string, content: Buffer) {
    const fileExtension = path.extname(filePath).toLowerCase();

    if (['.pdf', '.docx', '.png'].includes(fileExtension)) {
      try {
        const markdownContent = await this.parseFile(fileExtension, content);
        const shadowFilePath = await this.generateShadowFile(provider, filePath, markdownContent);

        // Index the shadow file
        this.indexFile(shadowFilePath, markdownContent);

      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
  }

  private indexFile(filePath: string, content: string) {
    const chunks = chunkText(content);
    const vectors = chunks.map((chunk, i) => {
      const embedding = createEmbedding(chunk);
      return {
        id: `${filePath}#${i}`,
        vector: embedding,
        metadata: {
          filePath,
          chunk,
        },
      };
    });

    vectorStore.add(vectors);
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
    switch (fileExtension) {
      case '.pdf':
        if (!this.pdfParse) {
          this.pdfParse = (await import('pdf-parse')).default;
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
