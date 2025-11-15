import { FsPromises } from './vfsService.js';
export declare class GitService {
    private getVfs;
    constructor(getVfs: (workspaceId: string) => FsPromises);
    private getGit;
    gitLog(vfsToken: string, count?: number): Promise<readonly (import("simple-git").DefaultLogFields & import("simple-git").ListLogLine)[]>;
    gitCommit(vfsToken: string, message: string): Promise<{
        hash: string;
        summary: {
            changes: number;
            insertions: number;
            deletions: number;
        };
    }>;
}
//# sourceMappingURL=git.service.d.ts.map