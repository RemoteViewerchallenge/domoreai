# ROBUST DATA COLLECTION & BACKUP SYSTEM

## Overview

This document describes the **Persistent Model Doctor** and **Automatic Backup** systems that ensure C.O.R.E. has complete, accurate model metadata and data safety.

---

## 🎯 **The Problem**

Your system needs complete data for every model:
- **Context Window** (for Cell Division)
- **Rate Limits** (RPM, TPM, RPD)
- **Capabilities** (vision, TTS, multimodal, image_gen, embedding)
- **Pricing** (for Zero-Burn optimization)

**Without this data**, the orchestrator can't make intelligent decisions.

---

## 🏗️ **The Solution: Three-Layer Architecture**

### **Layer 1: Surveyor (Fast Path - 90% of models)**
- **Location**: `apps/api/src/services/Surveyor.ts`
- **Strategy**: Regex pattern matching on model names
- **Speed**: Instant (no API calls, no tokens burned)
- **Coverage**: ~90% of models follow naming conventions

**Example**:
```typescript
// Pattern: /gemini-1\.5-pro/i
// Instantly knows: 2M context, vision, audio, tools, $1.25/1M tokens
```

**Zoning Map** (Provider Patterns):
- **Google**: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash-exp, text-embedding
- **OpenAI**: gpt-4o, gpt-3.5-turbo, dall-e, tts, whisper
- **Anthropic**: claude-3.5-sonnet, claude-3-opus, claude-3-haiku
- **Mistral**: mistral-large, codestral
- **Groq**: llama-70b, llama-8b, mixtral
- **Ollama**: All local models (catch-all)

### **Layer 2: ModelDoctor (Slow Path - Unknown models)**
- **Location**: `apps/api/src/services/ModelDoctor.ts`
- **Strategy**: AI-powered research (inference + web scraping)
- **Speed**: Slow (uses LLM + web requests)
- **Coverage**: Handles the 10% that Surveyor can't identify

**Process**:
1. **Inference**: Ask LLM to infer specs from model name
2. **Research**: If unsure, scrape documentation
3. **Save**: Store in `aiData` field with source attribution

### **Layer 3: PersistentModelDoctor (Orchestrator)**
- **Location**: `apps/api/src/services/PersistentModelDoctor.ts`
- **Strategy**: Runs continuously until 100% complete
- **Frequency**: Every 5 minutes (reduces to 1 hour when complete)

**Workflow**:
```
┌─────────────────────────────────────┐
│  1. Health Check                    │
│     - Count complete vs incomplete  │
│     - Track missing fields          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Create Safety Backup            │
│     - Before ANY healing            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Run Surveyor (Fast)             │
│     - Pattern match all models      │
│     - ~90% identified instantly     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Run ModelDoctor (Slow)          │
│     - Only for unknown models       │
│     - AI inference + research       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Report Progress                 │
│     - Log completion rate           │
│     - List missing fields           │
└─────────────────────────────────────┘
```

---

## 💾 **Automatic Backup System**

### **BackupService**
- **Location**: `apps/api/src/services/BackupService.ts`
- **Strategy**: Regular snapshots + pre-operation safety

**Retention Policy**:
- **Hourly**: Keep last 24
- **Daily**: Keep last 7
- **Weekly**: Keep last 4
- **Manual**: Keep forever
- **Pre-operation**: Keep forever

**Automatic Triggers**:
1. **Hourly** (scheduled)
2. **Before model healing** (safety)
3. **Before schema changes** (safety)
4. **Manual** (via UI or API)

**Storage**:
```
backups/
├── core_db_hourly_2025-12-16T00-00-00.sql
├── core_db_hourly_2025-12-16T00-00-00.sql.meta.json
├── core_db_pre-operation_2025-12-16T01-30-00.sql
└── core_db_manual_2025-12-16T02-00-00.sql
```

---

## 🚀 **How It Works**

### **Startup Sequence** (`apps/api/src/index.ts`)

```typescript
// 1. Initialize Provider Manager
await ProviderManager.initialize();

// 2. Load raw JSON files
await autoLoadRawJsonFiles();

// 3. Start server
server.listen(4000, async () => {
  // 4. Display model inventory
  console.log('Total Models: 150');
  console.log('Free Models: 45');
  
  // 5. Start background services
  await backupService.start();          // Hourly backups
  await persistentModelDoctor.start();  // Continuous healing
});
```

### **Graceful Shutdown**

```typescript
const gracefulShutdown = (signal: string) => {
  // 1. Stop background services first
  backupService.stop();
  persistentModelDoctor.stop();
  
  // 2. Close server
  server.close(async () => {
    wsService.close();
    await shutdownDb();
    process.exit(0);
  });
};
```

---

## 📊 **Monitoring & Control**

### **tRPC Endpoints** (`systemHealth.router.ts`)

**Backup Operations**:
- `systemHealth.createBackup` - Manual backup
- `systemHealth.listBackups` - View all backups
- `systemHealth.restoreBackup` - Restore from backup

**Model Health**:
- `systemHealth.getModelHealth` - Get completion status
- `systemHealth.healModelsNow` - Force healing cycle
- `systemHealth.surveyModels` - Run Surveyor only
- `systemHealth.getDoctorStatus` - Check if running

**Example Response** (`getModelHealth`):
```json
{
  "total": 150,
  "complete": 135,
  "incomplete": 15,
  "completionRate": 90.0,
  "missingFields": {
    "contextWindow": 10,
    "rateLimit": 5
  }
}
```

---

## 🎯 **Completion Criteria**

A model is considered **complete** when it has:

1. ✅ **contextWindow** (number)
2. ✅ **capabilities** (array of strings)
3. ✅ **costPer1k** (number, 0 for free)

**Optional but valuable**:
- `rateLimit.rpm` (requests per minute)
- `rateLimit.tpm` (tokens per minute)
- `rateLimit.rpd` (requests per day)
- `maxOutput` (max output tokens)

---

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Required for backups
DATABASE_URL=postgresql://user:pass@localhost:5432/core

# Optional
BACKUP_DIR=/path/to/backups  # Default: ./backups
```

### **Tuning Parameters**

**PersistentModelDoctor**:
```typescript
private checkIntervalMs = 5 * 60 * 1000;  // 5 minutes
// Reduces to 1 hour when 100% complete
```

**BackupService**:
```typescript
// Hourly backups
this.interval = setInterval(async () => {
  await this.createBackup('hourly');
  await this.cleanup();
}, 60 * 60 * 1000);
```

---

## 🛡️ **Safety Features**

1. **Pre-operation backups**: Always backup before healing
2. **Graceful degradation**: If backup fails, skip healing
3. **Incremental progress**: Never lose progress between cycles
4. **Metadata tracking**: Every backup has a `.meta.json` file
5. **Automatic cleanup**: Old backups are removed per retention policy

---

## 📈 **Expected Performance**

**Initial Run** (150 models):
- **Surveyor**: ~135 models identified instantly (90%)
- **ModelDoctor**: ~15 models researched (10%)
- **Time**: ~5-10 minutes for first complete cycle

**Subsequent Runs**:
- **Surveyor**: Skips already-complete models
- **ModelDoctor**: Only runs on new/failed models
- **Time**: ~1-2 minutes per cycle

**Completion Timeline**:
- **Hour 1**: 90% complete (Surveyor)
- **Hour 2**: 95% complete (ModelDoctor inference)
- **Hour 3**: 98% complete (ModelDoctor research)
- **Hour 4**: 100% complete

---

## 🎓 **Key Concepts**

### **"The Map of Florida"**
The Surveyor doesn't need to visit every house (model) to know what's there. It uses the city zoning map (regex patterns) to instantly know that "all houses in Zone A have pools" (all gemini-1.5-pro models have 2M context).

### **"Zero-Burn Mode"**
By using the Surveyor for 90% of models, we avoid burning tokens on API calls or LLM inference. Only the truly unknown 10% require AI assistance.

### **"Cell Division"**
The complete context window data enables the ContextManager to split large jobs across multiple agents when a single model can't fit the entire context.

---

## 🚨 **Troubleshooting**

**Problem**: Persistent doctor not starting
```bash
# Check logs
tail -f logs/api.log | grep PersistentDoctor

# Manual trigger via tRPC
curl -X POST http://localhost:4000/trpc/systemHealth.healModelsNow
```

**Problem**: Backups failing
```bash
# Check pg_dump is installed
which pg_dump

# Check DATABASE_URL
echo $DATABASE_URL

# Check disk space
df -h
```

**Problem**: Models stuck at 90% complete
```bash
# Check which fields are missing
curl http://localhost:4000/trpc/systemHealth.getModelHealth

# Force ModelDoctor to research
curl -X POST http://localhost:4000/trpc/systemHealth.healModelsNow
```

---

## ✅ **Success Metrics**

You'll know the system is working when:

1. ✅ Backups appear in `./backups` directory hourly
2. ✅ Model completion rate increases over time
3. ✅ Console shows: `"All models are healthy! Reducing check frequency..."`
4. ✅ Zero-Burn mode stays active (no unexpected costs)
5. ✅ Cell Division works (large jobs split correctly)

---

## 🎉 **What You Now Have**

1. ✅ **Automatic backups** (hourly, with retention)
2. ✅ **Persistent data collection** (runs until 100%)
3. ✅ **Fast pattern matching** (Surveyor - 90% instant)
4. ✅ **AI-powered research** (ModelDoctor - 10% slow)
5. ✅ **Safety-first approach** (backup before healing)
6. ✅ **UI monitoring** (tRPC endpoints for status)
7. ✅ **Graceful shutdown** (clean service termination)

**Your system is now ROBUST!** 🚀
