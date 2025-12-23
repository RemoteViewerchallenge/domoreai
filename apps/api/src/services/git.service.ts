import { simpleGit, type SimpleGit } from 'simple-git';
import { TRPCError } from '@trpc/server';
// import { getVfsForWorkspace, type FsPromises } from './vfsService.js'; // Commented out as unused
// import path from 'path'; // Commented out as unused

// Define a safe base directory for all workspaces
// const WORKSPACE_BASE_DIR = path.resolve(process.cwd(), 'workspaces'); // Commented out as unused

export class GitService {
  // constructor(private _getVfs: (workspaceId: string) => FsPromises) {} // Commented out as unused

  private getGit(_vfsToken: string): { git: SimpleGit; systemPath: string } {
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
      const { git } = this.getGit(vfsToken);
      const log = await git.log({ maxCount: count });
      return log.all;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Git Log failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async checkoutAndPull(vfsToken: string, branchName: string) {
    try {
      const { git } = this.getGit(vfsToken);
      // Ensure we have latest refs
      await git.fetch();
      await git.checkout(branchName);
      await git.pull();
      return { success: true, branch: branchName };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Checkout and Pull failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async commit(vfsToken: string, message: string) {
    try {
      const { git } = this.getGit(vfsToken);
      const status = await git.status();
      
      if (status.files.length === 0) {
        throw new Error('No changes to commit');
      }

      await git.add('.');
      const commit = await git.commit(message);
      return { hash: commit.commit, summary: commit.summary };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Git Commit failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  
  async createGhostBranch(vfsToken: string, taskId: string, customName?: string) {
    try {
      const { git } = this.getGit(vfsToken);
      const branchName = customName || `volcano/task-${taskId}`;
      
      // Ensure we are on main and up to date
      await git.checkout('main');
      await git.pull();
      
      // Create and checkout new branch
      await git.checkoutLocalBranch(branchName);
      
      return branchName;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Create Ghost Branch failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async checkoutBranch(vfsToken: string, branchName: string) {
    try {
      const { git } = this.getGit(vfsToken);
      await git.checkout(branchName);
      return { success: true, branch: branchName };
    } catch (error) {
       throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Checkout Branch failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async ratifyBranch(vfsToken: string, branchName: string) {
    try {
      const { git } = this.getGit(vfsToken);
      
      // Validate branch name
      if (!branchName.startsWith('volcano/')) {
        throw new Error('Can only ratify volcano/* branches');
      }

      await git.checkout('main');
      await git.pull();
      
      // Squash merge
      await git.merge([branchName, '--squash']);
      
      // Commit the squash
      await git.commit(`Ratified: ${branchName}`);
      
      // Push changes
      await git.push('origin', 'main');
      
      // Delete local branch
      await git.deleteLocalBranch(branchName);

      return { success: true, ratified: branchName };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Ratify Branch failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async getBranches(vfsToken: string) {
    try {
      const { git } = this.getGit(vfsToken);
      const branchSummary = await git.branch();
      
      // Filter for volcano branches + main
      const interestingBranches = branchSummary.all.filter(b => 
        b === 'main' || b.startsWith('volcano/')
      );

      return {
        all: interestingBranches,
        current: branchSummary.current
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Get Branches failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  async discardChanges(vfsToken: string) {
    try {
      const { git } = this.getGit(vfsToken);
      await git.checkout('.');
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Discard Changes failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}