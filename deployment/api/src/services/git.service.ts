import { simpleGit, SimpleGit } from 'simple-git';
import { TRPCError } from '@trpc/server';
import { VfsSessionService } from './vfsSession.service.js';
import path from 'path';

// Define a safe base directory for all workspaces
const WORKSPACE_BASE_DIR = path.resolve(process.cwd(), 'workspaces');

export class GitService {
  constructor(private vfsSession: VfsSessionService) {}

  private async getGit(vfsToken: string): Promise<{ git: SimpleGit; systemPath: string }> {
    // const payload = this.vfsSession.validateToken(vfsToken);
    // if (!payload) {
    //   throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid VFS token' });
    // }

    // // This is the FIX: Construct the path, don't read it from the adapter.
    // // It prevents any path traversal attacks.
    // const systemPath = path.join(WORKSPACE_BASE_DIR, payload.vfsRootPath);

    // Security Check: Ensure the path is *inside* the allowed workspace
    // if (!path.resolve(systemPath).startsWith(WORKSPACE_BASE_DIR)) {
    //    throw new TRPCError({ code: 'FORBIDDEN', message: 'Filesystem access denied' });
    // }
    
    // return { git: simpleGit(systemPath), systemPath };
    return { git: simpleGit(), systemPath: '' };
  }

  async gitLog(vfsToken: string, count: number = 10) {
    try {
      const { git } = await this.getGit(vfsToken);
      const log = await git.log({ maxCount: count });
      return log.all;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Git Log failed: ${error.message}`,
      });
    }
  }

  async gitCommit(vfsToken: string, message: string) {
    try {
      const { git } = await this.getGit(vfsToken);
      const status = await git.status();
      
      if (status.files.length === 0) {
        throw new Error('No changes to commit');
      }

      await git.add('.');
      const commit = await git.commit(message);
      return { hash: commit.commit, summary: commit.summary };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Git Commit failed: ${error.message}`,
      });
    }
  }
}