import { VirtualFileSystem } from '@jsvfs/core';
import { NodeFSAdapter } from '@jsvfs/adapter-node-fs';
/**
 * @deprecated
 *
 * This is a mock implementation of the VfsSessionService.
 * It is intended for use in a temporary branch and will be replaced
 * by a real implementation in the future.
 *
 * The real VfsSessionService will be responsible for generating and
 * validating short-lived, scoped VFS tokens that are linked to a
 * user session.
 */
export class VfsSessionService {
    /**
     * This is a mock implementation of getScopedVfs.
     * It returns a VFS instance that is scoped to the root of the
     * repository.
     *
     * In the real implementation, this method will take a VfsSessionToken
     * and return a VFS instance that is scoped to the user's workspace.
     *
     * @param vfsToken The user's VFS token.
     * @returns A VFS instance.
     */
    async getScopedVfs(vfsToken) {
        console.log('VfsSessionService: Using mock getScopedVfs. Token:', vfsToken);
        // In a real implementation, you would validate the token
        // and fetch the user's workspace path.
        // For now, we'll use the current working directory.
        const vfs = new VirtualFileSystem(new NodeFSAdapter({
            cwd: process.cwd()
        }));
        return vfs;
    }
}
