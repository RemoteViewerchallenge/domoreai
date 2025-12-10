import { prisma } from '../db.js';
import { vfsManager } from './vfsSession.service.js';
import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';

/**
 * ContextSource types for building AI context
 */
export type ContextSource =
  | { type: 'role'; roleId?: string }
  | { type: 'coorp-node'; nodeId?: string }
  | { type: 'vfs'; paths?: string[] }
  | { type: 'custom'; payload?: any };

/**
 * File excerpt with content and metadata
 */
export interface FileExcerpt {
  path: string;
  content: string;
  size: number;
  tokenEstimate: number;
}

/**
 * Structured context returned by buildContext
 */
export interface StructuredContext {
  roleMetadata?: {
    id: string;
    name: string;
    basePrompt: string;
    category?: string | null;
    requirements: {
      needsVision: boolean;
      needsReasoning: boolean;
      needsCoding: boolean;
      needsTools: boolean;
      needsJson: boolean;
      needsUncensored: boolean;
    };
    tools: string[];
    vfsConfig?: {
      selectedPaths: string[];
      maxFileSize?: number;
      excludePatterns?: string[];
    };
  };
  vfsList: string[];
  fileExcerpts: FileExcerpt[];
  sizeEstimate: {
    totalBytes: number;
    totalTokens: number;
    fileCount: number;
  };
}

/**
 * ContextService - Builds structured context for AI operations
 * 
 * Responsibilities:
 * - Build context from various sources (role, vfs, coorp-node)
 * - Extract role metadata and requirements
 * - List VFS files based on role's vfsConfig
 * - Read file excerpts with size limits
 * - Estimate token count (bytes/4 approximation)
 */
export class ContextService {
  /**
   * Build structured context from a source
   * 
   * @param source - The context source (role, vfs, coorp-node, custom)
   * @param roleId - Optional role ID override
   * @returns Structured context with metadata, file list, excerpts, and size estimate
   */
  async buildContext(source: ContextSource, roleId?: string): Promise<StructuredContext> {
    const context: StructuredContext = {
      vfsList: [],
      fileExcerpts: [],
      sizeEstimate: {
        totalBytes: 0,
        totalTokens: 0,
        fileCount: 0,
      },
    };

    // Extract role metadata if roleId is provided or source is role type
    const effectiveRoleId = roleId || (source.type === 'role' ? source.roleId : undefined);
    if (effectiveRoleId) {
      const role = await prisma.role.findUnique({
        where: { id: effectiveRoleId },
      });

      if (role) {
        context.roleMetadata = {
          id: role.id,
          name: role.name,
          basePrompt: role.basePrompt,
          category: role.category,
          requirements: {
            needsVision: role.needsVision,
            needsReasoning: role.needsReasoning,
            needsCoding: role.needsCoding,
            needsTools: role.needsTools,
            needsJson: role.needsJson,
            needsUncensored: role.needsUncensored,
          },
          tools: role.tools || [],
          vfsConfig: role.vfsConfig as any,
        };
      }
    }

    // Build VFS context based on source type
    if (source.type === 'vfs' && source.paths) {
      // Direct VFS paths provided
      await this.processVfsPaths(source.paths, context);
    } else if (source.type === 'role' && context.roleMetadata?.vfsConfig) {
      // Use role's vfsConfig
      const vfsConfig = context.roleMetadata.vfsConfig;
      if (vfsConfig.selectedPaths && vfsConfig.selectedPaths.length > 0) {
        await this.processVfsPaths(
          vfsConfig.selectedPaths,
          context,
          vfsConfig.maxFileSize,
          vfsConfig.excludePatterns
        );
      }
    }

    return context;
  }

  /**
   * Process VFS paths and populate context with file list and excerpts
   */
  private async processVfsPaths(
    paths: string[],
    context: StructuredContext,
    maxFileSize?: number,
    excludePatterns?: string[]
  ): Promise<void> {
    const provider = await vfsManager.getProvider({
      provider: 'local',
    });

    // Create ignore matcher if exclude patterns provided
    const ig = excludePatterns && excludePatterns.length > 0 ? ignore().add(excludePatterns) : null;

    for (const filePath of paths) {
      try {
        const exists = await provider.exists(filePath);
        if (!exists) continue;

        // Check if this is a file or directory
        const entries = await provider.list(path.dirname(filePath));
        const entry = entries.find((e) => e.path === filePath || path.basename(e.path) === path.basename(filePath));

        if (entry?.type === 'directory') {
          // Recursively list directory contents
          await this.processDirectory(filePath, provider, context, maxFileSize, ig);
        } else if (entry?.type === 'file') {
          // Process single file
          await this.processFile(filePath, provider, context, maxFileSize, ig);
        }
      } catch (error) {
        console.warn(`[ContextService] Failed to process path ${filePath}:`, error);
      }
    }
  }

  /**
   * Recursively process directory contents
   */
  private async processDirectory(
    dirPath: string,
    provider: any,
    context: StructuredContext,
    maxFileSize?: number,
    ig?: ReturnType<typeof ignore> | null
  ): Promise<void> {
    try {
      const entries = await provider.list(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Check if path should be excluded
        if (ig && ig.ignores(fullPath)) {
          continue;
        }

        if (entry.type === 'directory') {
          await this.processDirectory(fullPath, provider, context, maxFileSize, ig);
        } else if (entry.type === 'file') {
          await this.processFile(fullPath, provider, context, maxFileSize, ig);
        }
      }
    } catch (error) {
      console.warn(`[ContextService] Failed to process directory ${dirPath}:`, error);
    }
  }

  /**
   * Process a single file and add to context
   */
  private async processFile(
    filePath: string,
    provider: any,
    context: StructuredContext,
    maxFileSize?: number,
    ig?: ReturnType<typeof ignore> | null
  ): Promise<void> {
    try {
      // Check if path should be excluded
      if (ig && ig.ignores(filePath)) {
        return;
      }

      // Add to VFS list
      context.vfsList.push(filePath);

      // Read file content (with size limit)
      const content = await provider.read(filePath);
      const size = Buffer.byteLength(content, 'utf8');

      // Skip if exceeds max file size
      if (maxFileSize && size > maxFileSize) {
        console.warn(`[ContextService] Skipping ${filePath}: size ${size} exceeds max ${maxFileSize}`);
        return;
      }

      // Calculate token estimate (bytes/4 approximation)
      const tokenEstimate = Math.ceil(size / 4);

      // Add file excerpt
      const excerpt: FileExcerpt = {
        path: filePath,
        content,
        size,
        tokenEstimate,
      };
      context.fileExcerpts.push(excerpt);

      // Update size estimates
      context.sizeEstimate.totalBytes += size;
      context.sizeEstimate.totalTokens += tokenEstimate;
      context.sizeEstimate.fileCount += 1;
    } catch (error) {
      console.warn(`[ContextService] Failed to process file ${filePath}:`, error);
    }
  }

  /**
   * Estimate tokens for a given text (bytes/4 approximation)
   * 
   * @param text - The text to estimate tokens for
   * @returns Approximate token count
   */
  estimateTokens(text: string): number {
    const bytes = Buffer.byteLength(text, 'utf8');
    return Math.ceil(bytes / 4);
  }
}

// Export singleton instance
export const contextService = new ContextService();
