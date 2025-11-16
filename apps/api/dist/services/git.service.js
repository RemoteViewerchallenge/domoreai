import { simpleGit } from 'simple-git';
import { TRPCError } from '@trpc/server';
// import { getVfsForWorkspace, type FsPromises } from './vfsService.js'; // Commented out as unused
// import path from 'path'; // Commented out as unused
// Define a safe base directory for all workspaces
// const WORKSPACE_BASE_DIR = path.resolve(process.cwd(), 'workspaces'); // Commented out as unused
export class GitService {
    // constructor(private _getVfs: (workspaceId: string) => FsPromises) {} // Commented out as unused
    async getGit(_vfsToken) {
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
    async gitLog(vfsToken, count = 10) {
        try {
            const { git } = await this.getGit(vfsToken);
            const log = await git.log({ maxCount: count });
            return log.all;
        }
        catch (error) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Git Log failed: ${error.message}`,
            });
        }
    }
    async gitCommit(vfsToken, message) {
        try {
            const { git } = await this.getGit(vfsToken);
            const status = await git.status();
            if (status.files.length === 0) {
                throw new Error('No changes to commit');
            }
            await git.add('.');
            const commit = await git.commit(message);
            return { hash: commit.commit, summary: commit.summary };
        }
        catch (error) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Git Commit failed: ${error.message}`,
            });
        }
    }
}
//# sourceMappingURL=git.service.js.map