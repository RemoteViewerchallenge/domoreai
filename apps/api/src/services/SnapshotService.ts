import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Snapshot metadata interface
 */
interface SnapshotMetadata {
  id: string;
  timestamp: string;
  type: 'role' | 'coorp-graph' | 'orchestration' | 'other';
  entityId: string;
  entityName: string;
  action: 'create' | 'update' | 'delete';
  user?: string;
}

/**
 * Snapshot data interface
 */
interface SnapshotData<T = any> {
  metadata: SnapshotMetadata;
  data: T;
}

/**
 * SnapshotService - Handles versioning and snapshots of critical objects
 * 
 * Features:
 * - Create JSON snapshots of critical object changes (Role, Coorp graph, etc.)
 * - Save snapshots to snapshots/ directory
 * - Automatically commit with dedicated user (when git is allowed)
 * - Use signed commits (when configured)
 * - Controlled by env var (GIT_SNAPSHOTS_ENABLED)
 */
export class SnapshotService {
  private snapshotsDir: string;
  private gitEnabled: boolean;
  private gitUser: string;
  private gitEmail: string;
  private signCommits: boolean;

  constructor(options?: {
    snapshotsDir?: string;
    gitEnabled?: boolean;
    gitUser?: string;
    gitEmail?: string;
    signCommits?: boolean;
  }) {
    this.snapshotsDir = options?.snapshotsDir || path.resolve(process.cwd(), 'snapshots');
    this.gitEnabled = options?.gitEnabled ?? process.env.GIT_SNAPSHOTS_ENABLED === 'true';
    this.gitUser = options?.gitUser || process.env.GIT_SNAPSHOT_USER || 'CORE Snapshot Service';
    this.gitEmail = options?.gitEmail || process.env.GIT_SNAPSHOT_EMAIL || 'snapshots@core.local';
    this.signCommits = options?.signCommits ?? process.env.GIT_SIGN_COMMITS === 'true';

    // Log configuration
    console.log('[SnapshotService] Initialized:', {
      snapshotsDir: this.snapshotsDir,
      gitEnabled: this.gitEnabled,
      gitUser: this.gitUser,
      signCommits: this.signCommits,
    });
  }

  /**
   * Ensure snapshots directory exists
   */
  private async ensureSnapshotsDir(): Promise<void> {
    try {
      await fs.mkdir(this.snapshotsDir, { recursive: true });
    } catch (error) {
      console.error('[SnapshotService] Failed to create snapshots directory:', error);
      throw error;
    }
  }

  /**
   * Generate snapshot filename
   */
  private generateFilename(metadata: SnapshotMetadata): string {
    const timestamp = new Date(metadata.timestamp).toISOString().replace(/[:.]/g, '-');
    const sanitizedName = metadata.entityName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${timestamp}_${metadata.type}_${metadata.action}_${sanitizedName}_${metadata.entityId}.json`;
  }

  /**
   * Create a snapshot of an object
   * 
   * @param type - Type of entity being snapshotted
   * @param entityId - Unique identifier of the entity
   * @param entityName - Human-readable name of the entity
   * @param action - Action being performed (create, update, delete)
   * @param data - The actual data to snapshot
   * @param user - Optional user performing the action
   * @returns Path to the created snapshot file
   */
  async createSnapshot<T = any>(
    type: 'role' | 'coorp-graph' | 'orchestration' | 'other',
    entityId: string,
    entityName: string,
    action: 'create' | 'update' | 'delete',
    data: T,
    user?: string
  ): Promise<string> {
    try {
      // Ensure directory exists
      await this.ensureSnapshotsDir();

      // Create metadata
      const metadata: SnapshotMetadata = {
        id: `${entityId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        entityId,
        entityName,
        action,
        user,
      };

      // Create snapshot data
      const snapshot: SnapshotData<T> = {
        metadata,
        data,
      };

      // Generate filename and path
      const filename = this.generateFilename(metadata);
      const filePath = path.join(this.snapshotsDir, filename);

      // Write snapshot file
      await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf8');

      console.log('[SnapshotService] Snapshot created:', {
        type,
        entityId,
        entityName,
        action,
        path: filePath,
      });

      // Commit to git if enabled
      if (this.gitEnabled) {
        await this.commitSnapshot(filePath, metadata);
      }

      return filePath;
    } catch (error) {
      console.error('[SnapshotService] Failed to create snapshot:', error);
      throw error;
    }
  }

  /**
   * Commit snapshot to git
   * 
   * @param filePath - Path to the snapshot file
   * @param metadata - Snapshot metadata for commit message
   */
  private async commitSnapshot(filePath: string, metadata: SnapshotMetadata): Promise<void> {
    try {
      // Check if git is available
      try {
        execSync('git --version', { stdio: 'pipe' });
      } catch {
        console.warn('[SnapshotService] Git not available, skipping commit');
        return;
      }

      // Configure git user for this commit
      const relativePath = path.relative(process.cwd(), filePath);
      const commitMessage = `[SNAPSHOT] ${metadata.action} ${metadata.type}: ${metadata.entityName} (${metadata.entityId})`;

      // Add file
      execSync(`git add "${relativePath}"`, {
        cwd: process.cwd(),
        stdio: 'pipe',
      });

      // Commit with configured user and optional signing
      const commitCmd = [
        'git commit',
        `-m "${commitMessage}"`,
        `--author="${this.gitUser} <${this.gitEmail}>"`,
        this.signCommits ? '-S' : '',
      ]
        .filter(Boolean)
        .join(' ');

      execSync(commitCmd, {
        cwd: process.cwd(),
        stdio: 'pipe',
      });

      console.log('[SnapshotService] Snapshot committed to git:', {
        path: relativePath,
        message: commitMessage,
        signed: this.signCommits,
      });
    } catch (error) {
      // Log error but don't throw - snapshot file was created successfully
      console.error('[SnapshotService] Failed to commit snapshot to git:', error);
      console.warn('[SnapshotService] Snapshot file was created but not committed to git');
    }
  }

  /**
   * List all snapshots for a specific entity
   * 
   * @param entityId - Entity ID to filter by
   * @returns Array of snapshot file paths
   */
  async listSnapshots(entityId?: string): Promise<string[]> {
    try {
      await this.ensureSnapshotsDir();

      const files = await fs.readdir(this.snapshotsDir);
      const snapshotFiles = files
        .filter((file) => file.endsWith('.json'))
        .filter((file) => !entityId || file.includes(entityId))
        .map((file) => path.join(this.snapshotsDir, file))
        .sort()
        .reverse(); // Most recent first

      return snapshotFiles;
    } catch (error) {
      console.error('[SnapshotService] Failed to list snapshots:', error);
      return [];
    }
  }

  /**
   * Load a specific snapshot
   * 
   * @param snapshotPath - Path to the snapshot file
   * @returns Snapshot data
   */
  async loadSnapshot<T = any>(snapshotPath: string): Promise<SnapshotData<T> | null> {
    try {
      const content = await fs.readFile(snapshotPath, 'utf8');
      return JSON.parse(content) as SnapshotData<T>;
    } catch (error) {
      console.error('[SnapshotService] Failed to load snapshot:', error);
      return null;
    }
  }

  /**
   * Get the latest snapshot for an entity
   * 
   * @param entityId - Entity ID
   * @returns Latest snapshot data or null
   */
  async getLatestSnapshot<T = any>(entityId: string): Promise<SnapshotData<T> | null> {
    const snapshots = await this.listSnapshots(entityId);
    if (snapshots.length === 0) return null;

    return this.loadSnapshot<T>(snapshots[0]);
  }
}

// Export singleton instance
export const snapshotService = new SnapshotService();
