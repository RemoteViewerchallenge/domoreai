import { Git, createGit } from 'git-client';
import { VfsSessionService } from './vfsSession.service';
import { VfsSessionToken } from '@repo/common/types/agent.types';
import { Jsvfs } from '@jsvfs/core';

export class GitService {
  private vfsSessionService: VfsSessionService;

  constructor(vfsSessionService: VfsSessionService) {
    this.vfsSessionService = vfsSessionService;
  }

  /**
   * Helper function to get the sandboxed VFS instance and its real disk path.
   * This assumes your VFS adapter has a 'path' property, like a disk adapter.
   * @param vfsToken The user's VFS token.
   * @returns A scoped VFS and the absolute path to its root.
   */
  private async getScopedRepo(vfsToken: VfsSessionToken): Promise<{ vfs: Jsvfs, repoPath: string }> {
    const vfs = await this.vfsSessionService.getScopedVfs(vfsToken);

    // This is the critical part. We need the *real* file system path
    // from the VFS adapter to pass to the 'git-client'.
    // @ts-ignore - We're assuming the adapter has a 'path' property.
    const repoPath = vfs.adapter.path;

    if (!repoPath) {
      throw new Error('VFS adapter does not provide a real file path.');
    }

    return { vfs, repoPath };
  }

  /**
   * Gets the git log for the workspace specified in the VFS token.
   * @param vfsToken The user's VFS token.
   * @param count The number of log entries to retrieve.
   * @returns An array of log objects.
   */
  public async gitLog(vfsToken: VfsSessionToken, count: number = 10) {
    const { repoPath } = await this.getScopedRepo(vfsToken);
    const git = createGit({ cwd: repoPath });

    try {
      const log = await git.log({ maxCount: count });
      return log;
    } catch (error) {
      console.error('Git log failed:', error);
      throw new Error(`Failed to get git log: ${error.message}`);
    }
  }

  /**
   * Commits all changes in the workspace specified in the VFS token.
   * @param vfsToken The user's VFS token.
   * @param message The commit message.
   * @returns An object containing the new commit ID.
   */
  public async gitCommit(vfsToken: VfsSessionToken, message: string) {
    const { repoPath } = await this.getScopedRepo(vfsToken);
    const git = createGit({ cwd: repoPath });

    try {
      // Stage all changes
      await git.add('.');

      // Commit
      const commitId = await git.commit(message);

      return { commitId };
    } catch (error) {
      console.error('Git commit failed:', error);
      // Handle "nothing to commit" gracefully
      if (error.message.includes('nothing to commit')) {
        return { commitId: null };
      }
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }
}
