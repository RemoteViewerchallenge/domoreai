import { VirtualFileSystem } from '@jsvfs/core';
import { VfsSessionToken } from '@repo/common/agent';
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
export declare class VfsSessionService {
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
    getScopedVfs(vfsToken: VfsSessionToken): Promise<VirtualFileSystem>;
}
//# sourceMappingURL=vfsSession.service.d.ts.map