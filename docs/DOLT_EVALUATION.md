# D3: Git-First Database Evaluation - Dolt

## Overview

Dolt is a SQL database with Git-like version control features. This document evaluates whether Dolt would be beneficial for the C.O.R.E. project as an alternative to traditional PostgreSQL + manual snapshot system.

## What is Dolt?

- **Git for Data**: Branch, merge, diff, and version database tables like Git repositories
- **SQL Compatible**: MySQL-compatible SQL interface
- **ACID Compliant**: Full ACID transaction support
- **Version Control**: Built-in versioning for every row and schema change
- **Audit Trail**: Complete history of all data changes with commit messages

## Potential Use Cases in C.O.R.E.

### 1. Role Management
**Current**: Manual JSON snapshots in `snapshots/` directory  
**With Dolt**: Automatic versioning of Role table with:
- Branch-based role development (test role changes in branches)
- Rollback to any previous role state
- Diff between role versions
- Blame/history for who changed what

### 2. COORP Graph Versioning
**Current**: Snapshot on node/edge changes  
**With Dolt**: Native graph versioning:
- Experiment with graph structures in branches
- Merge successful experiments into main
- Compare graph states at different points in time
- Revert destructive changes easily

### 3. Model Registry
**Current**: PostgreSQL with manual migrations  
**With Dolt**: Version-controlled model metadata:
- Track model availability over time
- Branch-based model testing
- Historical analysis of model performance

## Evaluation Criteria

### ✅ Advantages

1. **Native Versioning**: No need for manual snapshot code
2. **Time Travel Queries**: Query data as it was at any point in history
3. **Branching**: Test changes without affecting production
4. **Audit Trail**: Built-in, immutable change history
5. **Conflict Resolution**: Merge conflicts are explicit and resolvable
6. **Diffs**: Built-in diff capabilities for data and schema
7. **Git Workflow**: Familiar paradigm for developers

### ❌ Disadvantages

1. **Storage Overhead**: Full history increases storage requirements
2. **Performance**: Versioning adds overhead to write operations
3. **Migration Effort**: Significant work to migrate from PostgreSQL
4. **Learning Curve**: Team needs to learn Dolt-specific concepts
5. **Ecosystem**: Smaller ecosystem than PostgreSQL
6. **Compatibility**: MySQL-compatible, not PostgreSQL (would need code changes)
7. **Maturity**: Newer technology with potential stability concerns
8. **Hosted Solutions**: Limited cloud hosting options compared to PostgreSQL

## Hybrid Approach Recommendation

### What to Use Dolt For

1. **Role Definitions** (`Role` table)
   - High value from versioning
   - Moderate write frequency
   - Critical changes that need audit trail

2. **COORP Graph** (`CoorpNode`, `CoorpEdge` tables)
   - Experimental nature benefits from branching
   - Moderate data volume
   - Need to track evolution

3. **Configuration Tables** (feature flags, settings)
   - Small data volume
   - High audit value
   - Infrequent changes

### What to Keep in PostgreSQL

1. **Model Registry** (`Model` table)
   - High write frequency from syncs
   - Large data volume
   - Current snapshot approach is sufficient

2. **Usage Logs** (`ModelUsage` table)
   - High write volume
   - Large data volume
   - Historical analysis done via time series queries, not versioning

3. **Temporary Data** (sessions, caches)
   - No versioning needed
   - High write frequency

4. **Large Tables** (ingested repositories, vector embeddings)
   - Storage overhead would be significant
   - Versioning less valuable

## Implementation Plan (If Pursuing)

### Phase 1: Proof of Concept (2-4 weeks)
1. Set up Dolt server locally
2. Migrate `Role` table to Dolt
3. Implement basic CRUD with versioning
4. Test branching workflow
5. Measure performance impact
6. Evaluate developer experience

### Phase 2: Extended Pilot (4-8 weeks)
1. Migrate `CoorpNode` and `CoorpEdge`
2. Implement cross-database queries (Dolt + PostgreSQL)
3. Build UI for viewing history/diffs
4. Train team on Dolt workflows
5. Run in staging environment

### Phase 3: Production (If successful)
1. Implement backup strategy for Dolt
2. Set up monitoring and alerting
3. Deploy to production
4. Migrate remaining suitable tables
5. Document workflows and best practices

## Cost-Benefit Analysis

### Costs
- **Development Time**: 6-12 weeks for full implementation
- **Learning Curve**: Team training and documentation
- **Infrastructure**: Additional database server
- **Maintenance**: New system to monitor and maintain
- **Risk**: Potential stability/compatibility issues

### Benefits
- **Better Audit Trail**: Native versioning vs. manual snapshots
- **Experimentation**: Safe branching for testing changes
- **Debugging**: Time-travel queries for investigating issues
- **Compliance**: Immutable change history for regulations
- **Simplified Code**: Remove manual snapshot logic

## Recommendation

### For Current C.O.R.E. Implementation: **NO**

**Reasoning:**
1. **Manual snapshot system is working**: SnapshotService provides adequate versioning
2. **High migration cost**: Significant effort to migrate and maintain dual databases
3. **Team capacity**: Better to focus on core features
4. **PostgreSQL ecosystem**: Mature, well-supported, team is familiar
5. **Storage efficiency**: Manual snapshots only for critical changes

### For Future Consideration: **MAYBE**

**When to reconsider:**
1. Manual snapshot system becomes unmaintainable
2. Team grows and can dedicate resources to Dolt
3. Compliance requirements demand better audit trails
4. Need for complex branching workflows emerges
5. Dolt ecosystem matures significantly

### Compromise: Enhanced Snapshot System

Instead of Dolt, enhance the current SnapshotService:

1. **Add Diffing**: Implement JSON diff between snapshots
2. **Web UI**: Build interface to browse snapshot history
3. **Restore Tool**: Script to restore from snapshots
4. **Compression**: Compress old snapshots to save storage
5. **Indexing**: Database index of snapshot metadata
6. **Search**: Full-text search across snapshot history

This provides many Dolt benefits without the migration cost.

## Resources

- **Dolt Website**: https://www.dolthub.com/
- **Documentation**: https://docs.dolthub.com/
- **GitHub**: https://github.com/dolthub/dolt
- **Blog**: https://www.dolthub.com/blog/
- **DoltHub**: Public Dolt databases (like GitHub for data)

## Conclusion

While Dolt is an interesting technology with genuine benefits, it's not recommended for immediate adoption in C.O.R.E. The current SnapshotService + PostgreSQL approach provides adequate versioning with less complexity and risk. The project should focus on core features and revisit Dolt when:

1. The team has bandwidth for significant infrastructure changes
2. There's a concrete need for branching/merging workflows
3. Compliance requirements justify the investment
4. Dolt's ecosystem has matured further

For now, continue with the pragmatic approach: PostgreSQL for data, SnapshotService for versioning, Git for code.
