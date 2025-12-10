# Database Safety Guidelines

This document outlines critical database safety rules and conventions to prevent data loss in the C.O.R.E. system.

## 🚨 CRITICAL DATABASE SAFETY RULES

### For Humans and AI Agents

**NEVER** run destructive database commands without explicit authorization and safety checks:

1. **NEVER** run `prisma db push --accept-data-loss` - This deletes user data
2. **NEVER** run `DROP TABLE` commands directly without CASCADE handling
3. **NEVER** run `DELETE FROM` commands on production data without soft-delete
4. **NEVER** run `TRUNCATE` commands on tables with user data
5. **ALWAYS** use `prisma migrate dev` for schema changes (creates migration files)
6. **ALWAYS** check for dynamic tables (e.g., `tgthr`, `orouter`) before database resets

## Environment Variable Convention

### `APP_ALLOW_DESTRUCTIVE_DB` 

This environment variable controls whether destructive database operations are permitted.

- **Default**: `false` (safe mode)
- **Set to `true`**: Only in manual admin contexts with explicit authorization
- **Purpose**: Prevents accidental data loss from automated scripts or AI agents

#### Usage in Scripts

```typescript
const ALLOW_DESTRUCTIVE = process.env.APP_ALLOW_DESTRUCTIVE_DB === 'true';

if (!ALLOW_DESTRUCTIVE) {
  throw new Error(
    'Destructive DB operations are disabled. ' +
    'Set APP_ALLOW_DESTRUCTIVE_DB=true to enable (admin only).'
  );
}
```

## Soft Delete Pattern

Critical tables use soft-delete with a `deletedAt` timestamp instead of hard deletes:

### Tables with Soft Delete
- `Role`
- `ProviderConfig` 
- `Model`
- `ModelConfig`
- `Workspace`
- `WorkOrderCard`
- `Project`
- `Job`
- `Task`

### Querying Non-Deleted Records

Always filter out soft-deleted records in queries:

```typescript
// Find active roles only
const activeRoles = await prisma.role.findMany({
  where: {
    deletedAt: null
  }
});
```

### Soft Delete Operation

```typescript
// Soft delete (mark as deleted)
await prisma.role.update({
  where: { id: roleId },
  data: { deletedAt: new Date() }
});
```

## Audit Logging

All create/update/delete operations on critical tables are logged in the `AuditLog` table:

- **Who**: User ID or 'system'
- **What**: Table name and record ID
- **When**: Timestamp
- **Action**: 'CREATE', 'UPDATE', 'DELETE'
- **Changes**: JSON diff of changes (optional)

## Database Triggers

PostgreSQL triggers prevent hard DELETE operations on protected tables unless the session variable `app.allow_delete` is set to `true`.

### Using the Admin Delete Script

For legitimate hard deletes (e.g., GDPR data removal), use the admin script:

```bash
cd apps/api
tsx src/scripts/admin-delete.ts --table Role --id <role-id>
```

This script:
1. Checks `APP_ALLOW_DESTRUCTIVE_DB` environment variable
2. Sets the `app.allow_delete` session variable
3. Logs the operation to audit logs
4. Performs the hard delete

## Migration Safety Checklist

Before running any database migration:

- [ ] Review the generated migration SQL
- [ ] Check for `DROP TABLE` or `DROP COLUMN` statements
- [ ] Verify foreign key CASCADE behaviors
- [ ] Ensure no data loss will occur
- [ ] Backup critical data if needed
- [ ] Test migration on a copy of production data first

## Recovery Procedures

### Recovering Soft-Deleted Records

```typescript
// Restore a soft-deleted record
await prisma.role.update({
  where: { id: roleId },
  data: { deletedAt: null }
});
```

### Checking Audit Logs

```typescript
// View recent delete operations
const deleteLogs = await prisma.auditLog.findMany({
  where: {
    action: 'DELETE',
    createdAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }
  },
  orderBy: { createdAt: 'desc' }
});
```

## Best Practices

1. **Use Transactions**: Wrap multiple related database operations in transactions
2. **Validate Input**: Always validate IDs and foreign keys before operations
3. **Log Everything**: Use audit logs for accountability
4. **Test Locally First**: Test destructive operations on local/dev databases
5. **Read-Only by Default**: Production API keys should use read-only database users when possible
6. **Regular Backups**: Maintain automated daily backups of production databases

## AI Agent Guidelines

When working with the database as an AI agent:

1. **NEVER** suggest or run commands that delete data without soft-delete
2. **ALWAYS** check `APP_ALLOW_DESTRUCTIVE_DB` before any destructive operation
3. **ALWAYS** create audit log entries for significant operations
4. **ASK** the user before running any migration or schema change
5. **PREFER** additive changes (new columns, new tables) over modifications
6. **DOCUMENT** any schema changes in migration files with clear comments

## Safe Mode (Default)

In safe mode (`APP_ALLOW_DESTRUCTIVE_DB=false` or unset):

- ✅ SELECT queries
- ✅ INSERT operations
- ✅ UPDATE operations (including soft-delete)
- ✅ Schema migrations via `prisma migrate dev`
- ❌ Hard DELETE operations (blocked by triggers)
- ❌ DROP TABLE/DATABASE commands
- ❌ TRUNCATE commands
- ❌ `prisma db push --accept-data-loss`

## Admin Mode (Explicit Authorization Required)

Only enable admin mode for:

- GDPR data deletion requests
- Database cleanup/maintenance (with backups)
- Migration rollbacks (with caution)
- Test data reset in development environments

**ALWAYS** disable admin mode immediately after completing the authorized operation.

---

## Emergency Contacts

If you accidentally run a destructive operation:

1. **STOP** immediately - don't run any more commands
2. **NOTIFY** the database administrator
3. **CHECK** audit logs for what was affected
4. **RESTORE** from the most recent backup
5. **DOCUMENT** the incident and lessons learned

## References

- Prisma Migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- PostgreSQL Triggers: https://www.postgresql.org/docs/current/sql-createtrigger.html
- GDPR Right to Erasure: https://gdpr.eu/right-to-be-forgotten/
