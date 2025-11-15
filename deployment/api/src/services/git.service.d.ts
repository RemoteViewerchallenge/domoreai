import { VfsSessionService } from './vfsSession.service.js';
export declare class GitService {
    private vfsSession;
    constructor(vfsSession: VfsSessionService);
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
