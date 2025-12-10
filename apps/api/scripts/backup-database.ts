#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Creates PostgreSQL database dumps and optionally uploads to S3
 * Can be run manually or scheduled via cron
 * 
 * Usage:
 *   node backup-database.js [--s3] [--local-only]
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   BACKUP_DIR - Local backup directory (default: ./backups)
 *   S3_BUCKET - S3 bucket name (required for S3 uploads)
 *   S3_REGION - S3 region (default: us-east-1)
 *   S3_ACCESS_KEY - AWS access key
 *   S3_SECRET_KEY - AWS secret key
 *   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 30)
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  databaseUrl: process.env.DATABASE_URL || '',
  backupDir: process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups'),
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3AccessKey: process.env.S3_ACCESS_KEY || '',
  s3SecretKey: process.env.S3_SECRET_KEY || '',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
};

// Parse command line arguments
const args = process.argv.slice(2);
const useS3 = args.includes('--s3');
const localOnly = args.includes('--local-only');

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir() {
  try {
    await fs.mkdir(config.backupDir, { recursive: true });
    console.log(`[Backup] Backup directory: ${config.backupDir}`);
  } catch (error) {
    console.error('[Backup] Failed to create backup directory:', error);
    throw error;
  }
}

/**
 * Parse DATABASE_URL to extract connection parameters
 */
function parseDatabaseUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: urlObj.port || '5432',
      database: urlObj.pathname.slice(1), // Remove leading /
      username: urlObj.username,
      password: urlObj.password,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

/**
 * Create database backup using pg_dump
 */
async function createBackup() {
  try {
    console.log('[Backup] Starting database backup...');

    // Parse database URL
    const dbParams = parseDatabaseUrl(config.databaseUrl);

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const backupPath = path.join(config.backupDir, filename);

    // Construct pg_dump command
    const pgDumpCmd = [
      'pg_dump',
      `-h ${dbParams.host}`,
      `-p ${dbParams.port}`,
      `-U ${dbParams.username}`,
      `-d ${dbParams.database}`,
      `--file="${backupPath}"`,
      '--format=plain',
      '--verbose',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
    ].join(' ');

    // Set PGPASSWORD environment variable for password
    const env = {
      ...process.env,
      PGPASSWORD: dbParams.password,
    };

    console.log(`[Backup] Executing pg_dump to ${backupPath}...`);
    
    // Execute pg_dump
    execSync(pgDumpCmd, {
      env,
      stdio: 'inherit',
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
    });

    // Get file size
    const stats = await fs.stat(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`[Backup] Backup created successfully: ${filename} (${sizeMB} MB)`);

    return {
      path: backupPath,
      filename,
      size: stats.size,
    };
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error);
    throw error;
  }
}

/**
 * Upload backup to S3 (optional)
 */
async function uploadToS3(backupPath, filename) {
  if (!useS3 || localOnly) {
    console.log('[Backup] Skipping S3 upload (not requested)');
    return;
  }

  if (!config.s3Bucket || !config.s3AccessKey || !config.s3SecretKey) {
    console.warn('[Backup] S3 credentials not configured, skipping upload');
    return;
  }

  try {
    console.log(`[Backup] Uploading to S3: s3://${config.s3Bucket}/${filename}`);

    // Use AWS CLI if available
    const awsCmd = [
      'aws s3 cp',
      `"${backupPath}"`,
      `s3://${config.s3Bucket}/${filename}`,
      `--region ${config.s3Region}`,
    ].join(' ');

    execSync(awsCmd, {
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: config.s3AccessKey,
        AWS_SECRET_ACCESS_KEY: config.s3SecretKey,
      },
      stdio: 'inherit',
    });

    console.log('[Backup] Upload to S3 completed successfully');
  } catch (error) {
    console.error('[Backup] Failed to upload to S3:', error);
    // Don't throw - local backup is still successful
  }
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups() {
  try {
    console.log(`[Backup] Cleaning up backups older than ${config.retentionDays} days...`);

    const files = await fs.readdir(config.backupDir);
    const now = Date.now();
    const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      if (!file.startsWith('backup-') || !file.endsWith('.sql')) continue;

      const filePath = path.join(config.backupDir, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > retentionMs) {
        await fs.unlink(filePath);
        console.log(`[Backup] Deleted old backup: ${file}`);
        deletedCount++;
      }
    }

    if (deletedCount === 0) {
      console.log('[Backup] No old backups to clean up');
    } else {
      console.log(`[Backup] Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    console.error('[Backup] Failed to clean up old backups:', error);
    // Don't throw - not critical
  }
}

/**
 * Main backup routine
 */
async function main() {
  try {
    console.log('[Backup] ========================================');
    console.log('[Backup] Database Backup Started');
    console.log('[Backup] ========================================');
    console.log(`[Backup] Timestamp: ${new Date().toISOString()}`);
    console.log(`[Backup] S3 Upload: ${useS3 ? 'Enabled' : 'Disabled'}`);
    console.log(`[Backup] Retention: ${config.retentionDays} days`);
    console.log('[Backup] ========================================');

    // Ensure backup directory exists
    await ensureBackupDir();

    // Create backup
    const backup = await createBackup();

    // Upload to S3 if requested
    await uploadToS3(backup.path, backup.filename);

    // Clean up old backups
    await cleanupOldBackups();

    console.log('[Backup] ========================================');
    console.log('[Backup] Backup completed successfully!');
    console.log('[Backup] ========================================');
    process.exit(0);
  } catch (error) {
    console.error('[Backup] ========================================');
    console.error('[Backup] Backup failed!');
    console.error('[Backup] ========================================');
    console.error(error);
    process.exit(1);
  }
}

// Run main routine
main();
