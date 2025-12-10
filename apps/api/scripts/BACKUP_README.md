# Database Backup System

This directory contains scripts and configuration for automated database backups.

## Backup Script

The `backup-database.js` script creates PostgreSQL database dumps and optionally uploads them to S3.

### Usage

```bash
# Local backup only
node apps/api/scripts/backup-database.js

# Local backup + S3 upload
node apps/api/scripts/backup-database.js --s3

# Local only (explicit)
node apps/api/scripts/backup-database.js --local-only
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `BACKUP_DIR` | Local backup directory | `./backups` | No |
| `S3_BUCKET` | S3 bucket name | - | For S3 uploads |
| `S3_REGION` | S3 region | `us-east-1` | No |
| `S3_ACCESS_KEY` | AWS access key | - | For S3 uploads |
| `S3_SECRET_KEY` | AWS secret key | - | For S3 uploads |
| `BACKUP_RETENTION_DAYS` | Days to keep backups | `30` | No |

### Scheduling with Cron

To run backups automatically, add to your crontab:

```bash
# Edit crontab
crontab -e

# Add one of these lines:

# Daily backup at 2 AM (local only)
0 2 * * * cd /path/to/domoreai && node apps/api/scripts/backup-database.js >> /var/log/backup.log 2>&1

# Daily backup at 2 AM with S3 upload
0 2 * * * cd /path/to/domoreai && node apps/api/scripts/backup-database.js --s3 >> /var/log/backup.log 2>&1

# Every 6 hours
0 */6 * * * cd /path/to/domoreai && node apps/api/scripts/backup-database.js >> /var/log/backup.log 2>&1
```

### Cron Schedule Examples

```
# Every day at 2 AM
0 2 * * *

# Every 6 hours
0 */6 * * *

# Every Sunday at 3 AM
0 3 * * 0

# Every hour
0 * * * *

# Every 30 minutes
*/30 * * * *
```

## Snapshot Service

The `SnapshotService` automatically creates JSON snapshots of critical object changes (Roles, COORP graphs, etc.).

### Configuration

Controlled by environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GIT_SNAPSHOTS_ENABLED` | Enable git commits for snapshots | `false` |
| `GIT_SNAPSHOT_USER` | Git commit user name | `CORE Snapshot Service` |
| `GIT_SNAPSHOT_EMAIL` | Git commit email | `snapshots@core.local` |
| `GIT_SIGN_COMMITS` | Sign commits with GPG | `false` |

### Snapshot Structure

Snapshots are saved to `snapshots/` directory with the following structure:

```
snapshots/
  2025-12-10T12-00-00-000Z_role_create_MyRole_abc123.json
  2025-12-10T12-05-00-000Z_role_update_MyRole_abc123.json
  2025-12-10T12-10-00-000Z_coorp-graph_create_MyNode_def456.json
```

Each snapshot file contains:

```json
{
  "metadata": {
    "id": "abc123-1702210800000",
    "timestamp": "2025-12-10T12:00:00.000Z",
    "type": "role",
    "entityId": "abc123",
    "entityName": "MyRole",
    "action": "create",
    "user": "admin@example.com"
  },
  "data": {
    // Full object data
  }
}
```

### Git Integration

When `GIT_SNAPSHOTS_ENABLED=true`:
- Snapshots are automatically committed to git
- Commits use dedicated user/email (configurable)
- Optionally signed with GPG (requires GPG setup)
- Commit message format: `[SNAPSHOT] create role: MyRole (abc123)`

**Important**: Git integration requires:
- Git to be installed and available
- Write permissions to the repository
- For signed commits: GPG key configured for the user

## Restore Procedures

### Restore from Local Backup

```bash
# Stop the application
docker-compose down

# Restore database
psql $DATABASE_URL < backups/backup-2025-12-10T12-00-00-000Z.sql

# Start the application
docker-compose up -d
```

### Restore from S3

```bash
# Download backup from S3
aws s3 cp s3://your-bucket/backup-2025-12-10T12-00-00-000Z.sql ./restore.sql

# Restore database
psql $DATABASE_URL < restore.sql
```

### Restore from Snapshot

Snapshots are JSON files that can be manually imported or used for auditing:

```bash
# View snapshot
cat snapshots/2025-12-10T12-00-00-000Z_role_create_MyRole_abc123.json | jq .

# The data field contains the full object state at that point in time
# You can use this to recreate objects or understand what changed
```

## Security Considerations

1. **Backup Files**: Contain full database dump including sensitive data
   - Store in secure location
   - Encrypt backups for S3 (use S3 encryption)
   - Restrict file permissions: `chmod 600 backups/*.sql`

2. **S3 Credentials**: 
   - Use IAM roles when possible
   - Restrict S3 bucket access
   - Enable S3 bucket encryption

3. **Git Snapshots**:
   - Review `.gitignore` to avoid committing secrets
   - Consider using a separate git repository for snapshots
   - Use signed commits for audit trail

4. **Environment Variables**:
   - Never commit `.env` files with credentials
   - Use secret management tools in production
   - Rotate credentials regularly

## Monitoring

Check backup logs:

```bash
# View recent backups
ls -lth backups/

# Check cron execution
grep backup /var/log/cron

# Check backup script logs
tail -f /var/log/backup.log
```

## Testing

Test backup script offline:

```bash
# Dry run (requires test database)
export DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
export BACKUP_DIR="./test-backups"
node apps/api/scripts/backup-database.js
```
