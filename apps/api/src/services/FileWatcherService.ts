import chokidar from 'chokidar';
import * as path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { vectorStore, chunkText, createEmbedding } from './vector.service.js';
import { getWebSocketService } from './websocket.singleton.js';

/**
 * FileWatcherService
 * 
 * Watches the filesystem for changes and automatically re-indexes modified files.
 * Uses content hashing to avoid re-indexing unchanged files.
 */
class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private readonly textExtensions = ['.ts', '.js', '.tsx', '.jsx', '.md', '.json', '.css', '.html', '.txt', '.yaml', '.yml', '.sql', '.prisma'];
  private isIndexing = false;
  private indexQueue: Set<string> = new Set();

  /**
   * Start watching a directory for file changes
   */
  async startWatching(rootPath: string) {
    if (this.watcher) {
      console.log('[FileWatcher] Already watching. Stopping previous watcher...');
      await this.stopWatching();
    }

    console.log(`[FileWatcher] 👁️  Starting file watcher for: ${rootPath}`);

    this.watcher = chokidar.watch(rootPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.turbo/**',
        '**/.next/**',
        '**/build/**',
        '**/.domoreai/shadow/**', // Don't watch shadow files
      ],
      persistent: true,
      ignoreInitial: true, // Don't trigger on initial scan
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    // File added or changed
    this.watcher.on('add', (filePath) => this.handleFileChange(filePath, 'added'));
    this.watcher.on('change', (filePath) => this.handleFileChange(filePath, 'changed'));
    
    // File deleted
    this.watcher.on('unlink', (filePath) => this.handleFileDelete(filePath));

    this.watcher.on('error', (error) => {
      console.error('[FileWatcher] ❌ Error:', error);
    });

    this.watcher.on('ready', () => {
      console.log('[FileWatcher] ✅ Ready and watching for changes');
      try {
        getWebSocketService()?.broadcast({ 
          type: 'filewatcher.ready', 
          path: rootPath 
        });
      } catch (e) {
        // Ignore WS errors
      }
    });
  }

  /**
   * Stop watching
   */
  async stopWatching() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('[FileWatcher] 🛑 Stopped watching');
    }
  }

  /**
   * Handle file change (add or modify)
   */
  private async handleFileChange(filePath: string, changeType: 'added' | 'changed') {
    const ext = path.extname(filePath).toLowerCase();
    
    // Only process text files
    if (!this.textExtensions.includes(ext)) {
      return;
    }

    console.log(`[FileWatcher] 📝 File ${changeType}: ${path.basename(filePath)}`);
    
    try {
      getWebSocketService()?.broadcast({ 
        type: 'filewatcher.change', 
        file: path.basename(filePath),
        filePath,
        changeType 
      });
    } catch (e) {
      // Ignore WS errors
    }

    // Add to queue and process
    this.indexQueue.add(filePath);
    await this.processQueue();
  }

  /**
   * Handle file deletion
   */
  private async handleFileDelete(filePath: string) {
    console.log(`[FileWatcher] 🗑️  File deleted: ${path.basename(filePath)}`);
    
    try {
      // Remove from FileIndex
      await prisma.$executeRawUnsafe(
        `DELETE FROM "FileIndex" WHERE "filePath" = $1`,
        filePath
      );

      // Remove from VectorEmbedding
      await prisma.$executeRawUnsafe(
        `DELETE FROM "VectorEmbedding" WHERE "filePath" = $1`,
        filePath
      );

      console.log(`[FileWatcher] ✅ Removed ${filePath} from index`);
      
      try {
        getWebSocketService()?.broadcast({ 
          type: 'filewatcher.delete', 
          file: path.basename(filePath),
          filePath 
        });
      } catch (e) {
        // Ignore WS errors
      }
    } catch (error) {
      console.error(`[FileWatcher] ❌ Error removing ${filePath} from index:`, error);
    }
  }

  /**
   * Process the index queue
   */
  private async processQueue() {
    if (this.isIndexing || this.indexQueue.size === 0) {
      return;
    }

    this.isIndexing = true;

    try {
      const filesToProcess = Array.from(this.indexQueue);
      this.indexQueue.clear();

      for (const filePath of filesToProcess) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          await this.indexFile(filePath, content);
        } catch (error) {
          console.error(`[FileWatcher] ❌ Error indexing ${filePath}:`, error);
        }
      }
    } finally {
      this.isIndexing = false;

      // Process any files that were added while we were indexing
      if (this.indexQueue.size > 0) {
        await this.processQueue();
      }
    }
  }

  /**
   * Index a single file (same logic as IngestionAgent)
   */
  private async indexFile(filePath: string, content: string) {
    // Compute content hash to detect unchanged files
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

    try {
      const existing: any = await prisma.$queryRawUnsafe(
        `SELECT "contentHash" FROM "FileIndex" WHERE "filePath" = $1 LIMIT 1`,
        filePath
      );

      if (existing && existing.length > 0 && existing[0].contentHash === hash) {
        console.log(`[FileWatcher] ⏭️  Skipping ${path.basename(filePath)} — content unchanged`);
        return;
      }
    } catch (err) {
      console.warn(`[FileWatcher] Could not check FileIndex for ${filePath}:`, err);
      // fall through to re-embed
    }

    console.log(`[FileWatcher] 🔄 Re-indexing ${path.basename(filePath)}...`);

    const chunks = chunkText(content);
    console.log(`[FileWatcher] 📦 Created ${chunks.length} chunks`);
    
    const vectors = await Promise.all(chunks.map(async (chunk, i) => {
      const embedding = await createEmbedding(chunk);
      return {
        id: `${filePath}#${i}`,
        vector: embedding,
        metadata: {
          filePath,
          chunk,
          contentHash: hash,
        },
      };
    }));

    // Delete old vectors for this file
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "VectorEmbedding" WHERE "filePath" = $1`,
        filePath
      );
    } catch (err) {
      console.warn(`[FileWatcher] Could not delete old vectors for ${filePath}:`, err);
    }

    // Add new vectors
    await vectorStore.add(vectors);
    console.log(`[FileWatcher] 💾 Stored ${vectors.length} vectors for ${path.basename(filePath)}`);

    // Update FileIndex
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "FileIndex" ("filePath", "contentHash", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT ("filePath") DO UPDATE SET "contentHash" = EXCLUDED."contentHash", "updatedAt" = CURRENT_TIMESTAMP`,
        filePath,
        hash
      );
      console.log(`[FileWatcher] 🔖 Updated FileIndex for ${path.basename(filePath)}`);
      
      try {
        getWebSocketService()?.broadcast({ 
          type: 'filewatcher.indexed', 
          file: path.basename(filePath),
          filePath,
          chunks: vectors.length,
          hash 
        });
      } catch (e) {
        // Ignore WS errors
      }
    } catch (err) {
      console.warn(`[FileWatcher] Failed to update FileIndex for ${filePath}:`, err);
    }
  }

  /**
   * Get watcher status
   */
  getStatus() {
    return {
      isWatching: this.watcher !== null,
      isIndexing: this.isIndexing,
      queueSize: this.indexQueue.size,
    };
  }
}

export const fileWatcherService = new FileWatcherService();
