import { prisma } from '../db.js';
import { vectorStore, chunkText, createEmbedding } from './vector.service.js';
import crypto from 'crypto';

/**
 * LibrarianService - The Memory Keeper
 * 
 * Purpose: Prevent "Context Rot" by saving only proven, high-quality execution results
 * as "Golden Records" that can be recalled for future tasks.
 * 
 * Difference from IngestionAgent:
 * - IngestionAgent: Indexes raw documentation and source code
 * - LibrarianService: Stores proven execution logs and successful patterns
 */
export class LibrarianService {
  
  /**
   * Store a successful execution as a "Golden Record"
   * @param executionId - The orchestration execution that succeeded
   * @param qualityScore - Quality score from the Judge (0-1)
   * @param tags - Searchable tags for this record
   */
  static async storeGoldenRecord(
    executionId: string,
    qualityScore: number,
    tags: string[] = []
  ): Promise<void> {
    const execution = await prisma.orchestrationExecution.findUnique({
      where: { id: executionId },
      include: {
        orchestration: {
          include: {
            steps: true
          }
        }
      }
    });

    if (!execution || execution.status !== 'completed') {
      console.warn(`[Librarian] Cannot store incomplete execution: ${executionId}`);
      return;
    }

    // Only store high-quality executions (threshold: 0.7)
    if (qualityScore < 0.7) {
      console.log(`[Librarian] Skipping low-quality execution (score: ${qualityScore})`);
      return;
    }

    // Create a searchable summary of the execution
    const summary = this.createExecutionSummary(execution);
    
    // Generate embedding for semantic search
    const embedding = await createEmbedding(summary);

    // Create a unique ID for this golden record
    const recordId = `golden_${executionId}_${Date.now()}`;
    const contentHash = crypto.createHash('sha256').update(summary).digest('hex');

    // Store in vector database
    await vectorStore.add([{
      id: recordId,
      vector: embedding,
      metadata: {
        type: 'golden_record',
        executionId,
        orchestrationId: execution.orchestrationId,
        orchestrationName: execution.orchestration.name,
        qualityScore,
        tags,
        summary,
        input: execution.input,
        output: execution.output,
        stepLogs: execution.stepLogs,
        context: execution.context,
        contentHash,
        createdAt: new Date().toISOString()
      }
    }]);

    console.log(`[Librarian] ✅ Stored Golden Record: ${recordId} (score: ${qualityScore})`);
  }

  /**
   * Recall relevant past executions for a new task
   * @param query - Natural language description of the current task
   * @param limit - Maximum number of records to return
   * @returns Array of relevant golden records with similarity scores
   */
  static async recall(query: string, limit: number = 5): Promise<any[]> {
    console.log(`[Librarian] 🔍 Recalling memories for: "${query.substring(0, 100)}..."`);

    // Generate embedding for the query
    const queryEmbedding = await createEmbedding(query);

    // Search vector store for similar executions
    const results = await vectorStore.search(queryEmbedding, limit);

    // Filter for golden records only
    const goldenRecords = results
      .filter((r: any) => r.metadata?.type === 'golden_record')
      .map((r: any) => ({
        executionId: r.metadata.executionId,
        orchestrationName: r.metadata.orchestrationName,
        qualityScore: r.metadata.qualityScore,
        summary: r.metadata.summary,
        input: r.metadata.input,
        output: r.metadata.output,
        stepLogs: r.metadata.stepLogs,
        tags: r.metadata.tags,
        similarity: r.similarity || 0,
        createdAt: r.metadata.createdAt
      }));

    console.log(`[Librarian] 📚 Found ${goldenRecords.length} relevant memories`);
    
    return goldenRecords;
  }

  /**
   * Inject recalled context into an orchestration's initial context
   * @param orchestrationContext - The current orchestration context
   * @param memories - Recalled golden records
   */
  static injectMemories(
    orchestrationContext: Record<string, any>,
    memories: any[]
  ): Record<string, any> {
    if (memories.length === 0) {
      return orchestrationContext;
    }

    // Add memories to context under a special key
    orchestrationContext.librarian = {
      memories: memories.map(m => ({
        orchestration: m.orchestrationName,
        quality: m.qualityScore,
        similarity: m.similarity,
        summary: m.summary,
        // Include successful patterns
        successfulApproach: m.stepLogs?.map((log: any) => ({
          step: log.stepName,
          status: log.status,
          duration: log.duration
        })),
        // Include example output
        exampleOutput: m.output
      })),
      guidance: this.generateGuidance(memories)
    };

    console.log(`[Librarian] 💡 Injected ${memories.length} memories into context`);
    
    return orchestrationContext;
  }

  /**
   * Create a searchable summary of an execution
   */
  private static createExecutionSummary(execution: any): string {
    const parts: string[] = [];

    // Orchestration name and description
    parts.push(`Orchestration: ${execution.orchestration.name}`);
    if (execution.orchestration.description) {
      parts.push(`Description: ${execution.orchestration.description}`);
    }

    // Input summary
    parts.push(`Input: ${JSON.stringify(execution.input).substring(0, 500)}`);

    // Steps executed
    const stepNames = execution.stepLogs?.map((log: any) => log.stepName).join(' → ') || 'N/A';
    parts.push(`Workflow: ${stepNames}`);

    // Output summary
    parts.push(`Output: ${JSON.stringify(execution.output).substring(0, 500)}`);

    // Tags
    if (execution.orchestration.tags?.length > 0) {
      parts.push(`Tags: ${execution.orchestration.tags.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate guidance text from memories
   */
  private static generateGuidance(memories: any[]): string {
    if (memories.length === 0) return '';

    const topMemory = memories[0]; // Highest similarity
    
    return `Based on ${memories.length} similar past execution(s), the most relevant approach was:
- Orchestration: ${topMemory.orchestrationName}
- Quality Score: ${(topMemory.qualityScore * 100).toFixed(0)}%
- Similarity: ${(topMemory.similarity * 100).toFixed(0)}%
- Summary: ${topMemory.summary.substring(0, 200)}...

Consider following a similar pattern for best results.`;
  }

  /**
   * Clean up old or low-quality records
   * @param maxAge - Maximum age in days
   * @param minQuality - Minimum quality score to keep
   */
  static async cleanup(maxAge: number = 90, minQuality: number = 0.7): Promise<void> {
    // This would require implementing a cleanup mechanism in vector.service.ts
    // For now, we log the intent
    console.log(`[Librarian] 🧹 Cleanup requested: maxAge=${maxAge} days, minQuality=${minQuality}`);
    console.log(`[Librarian] ⚠️ Cleanup not yet implemented in vector store`);
  }

  /**
   * Get statistics about stored golden records
   */
  static async getStats(): Promise<{
    totalRecords: number;
    averageQuality: number;
    topOrchestrations: Array<{ name: string; count: number }>;
  }> {
    // This would require querying the vector store for metadata
    // For now, return placeholder stats
    return {
      totalRecords: 0,
      averageQuality: 0,
      topOrchestrations: []
    };
  }
}
