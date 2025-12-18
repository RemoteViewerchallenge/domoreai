import { prisma } from '../db.js';
import { createVolcanoAgent } from './AgentFactory.js';

/**
 * MetaRouter - The Traffic Controller
 * 
 * Purpose: Intelligently route tasks to the right orchestration template using LLM-based analysis
 * 
 * Difference from ComplexityRouter:
 * - ComplexityRouter: Simple keyword matching for complexity scoring
 * - MetaRouter: LLM-powered classification that selects specific orchestration templates
 */

export interface RoutingDecision {
  orchestrationTemplate: string | null;  // Name of the orchestration to use
  orchestrationId?: string;              // ID if found in database
  confidence: number;                    // 0-1 confidence score
  reasoning: string;                     // Why this orchestration was chosen
  fallbackToSingleAgent: boolean;        // If true, use single agent instead
  recommendedRole?: string;              // Role to use if single agent
  estimatedDuration: number;             // Estimated minutes
  requiredCapabilities: string[];        // Capabilities needed
}

export class MetaRouter {
  
  /**
   * Route a task to the appropriate orchestration template
   * @param taskDescription - Natural language description of the task
   * @param availableOrchestrations - Optional list of available orchestrations (fetched if not provided)
   * @returns Routing decision with orchestration selection
   */
  static async routeTask(
    taskDescription: string,
    availableOrchestrations?: Array<{ id: string; name: string; description?: string | null; tags: string[] }>
  ): Promise<RoutingDecision> {
    console.log(`[MetaRouter] 🚦 Routing task: "${taskDescription.substring(0, 100)}..."`);

    // 1. Load available orchestrations if not provided
    const orchestrations = availableOrchestrations || await prisma.orchestration.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        tags: true
      }
    });

    // 2. If no orchestrations available, fallback to single agent
    if (orchestrations.length === 0) {
      console.log('[MetaRouter] No orchestrations available, falling back to single agent');
      return {
        orchestrationTemplate: null,
        confidence: 1.0,
        reasoning: 'No orchestrations available in the system',
        fallbackToSingleAgent: true,
        recommendedRole: 'general_worker',
        estimatedDuration: 30,
        requiredCapabilities: ['text']
      };
    }

    // 3. Find or create a MetaRouter role for classification
    let routerRole = await prisma.role.findFirst({
      where: { name: 'MetaRouter' }
    });

    if (!routerRole) {
      console.log('[MetaRouter] Creating MetaRouter role...');
      routerRole = await prisma.role.create({
        data: {
          name: 'MetaRouter',
          basePrompt: `You are an expert Task Router for AI orchestration systems.

Your job is to analyze a task description and select the most appropriate orchestration template from the available options.

Consider:
1. Task complexity and requirements
2. Orchestration capabilities and steps
3. Tags and descriptions
4. Whether a multi-step workflow is needed or a single agent would suffice

Return your decision as a JSON object with this structure:
{
  "orchestrationName": "Code Review Pipeline",  // Name of the orchestration, or null
  "confidence": 0.9,  // 0-1 confidence score
  "reasoning": "This task requires code analysis which matches the Code Review Pipeline",
  "fallbackToSingleAgent": false,  // true if single agent is better
  "recommendedRole": "Code Reviewer",  // If single agent, which role
  "estimatedDuration": 45,  // Estimated minutes
  "requiredCapabilities": ["coding", "tools"]  // Capabilities needed
}`,
          tools: [],
          metadata: {
            defaultTemperature: 0.2,  // Low temperature for consistent routing
            defaultMaxTokens: 1024,
            defaultResponseFormat: 'json_object'
          }
        }
      });
    }

    // 4. Create the routing prompt
    const routingPrompt = this.createRoutingPrompt(taskDescription, orchestrations);

    // 5. Create router agent
    const routerAgent = await createVolcanoAgent({
      roleId: routerRole.id,
      modelId: null,  // Let orchestrator pick best model
      isLocked: false,
      temperature: 0.2,
      maxTokens: 1024
    });

    // 6. Get routing decision
    try {
      const response = await routerAgent.generate(routingPrompt);
      
      // Parse JSON response
      let decision;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          decision = JSON.parse(jsonMatch[0]);
        } else {
          decision = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('[MetaRouter] Failed to parse JSON response:', response);
        // Fallback to single agent
        return {
          orchestrationTemplate: null,
          confidence: 0.5,
          reasoning: 'Failed to parse router response, using single agent fallback',
          fallbackToSingleAgent: true,
          recommendedRole: 'general_worker',
          estimatedDuration: 30,
          requiredCapabilities: ['text']
        };
      }

      // 7. Find the orchestration ID if a template was selected
      let orchestrationId: string | undefined;
      if (decision.orchestrationName && !decision.fallbackToSingleAgent) {
        const orchestration = orchestrations.find(
          o => o.name.toLowerCase() === decision.orchestrationName.toLowerCase()
        );
        orchestrationId = orchestration?.id;

        if (!orchestrationId) {
          console.warn(`[MetaRouter] Orchestration "${decision.orchestrationName}" not found, falling back to single agent`);
          decision.fallbackToSingleAgent = true;
        }
      }

      const result: RoutingDecision = {
        orchestrationTemplate: decision.orchestrationName || null,
        orchestrationId,
        confidence: decision.confidence || 0.5,
        reasoning: decision.reasoning || 'No reasoning provided',
        fallbackToSingleAgent: decision.fallbackToSingleAgent !== false,
        recommendedRole: decision.recommendedRole || 'general_worker',
        estimatedDuration: decision.estimatedDuration || 30,
        requiredCapabilities: decision.requiredCapabilities || ['text']
      };

      console.log(`[MetaRouter] ✅ Routed to: ${result.orchestrationTemplate || 'Single Agent'} (confidence: ${result.confidence})`);
      
      return result;

    } catch (error: any) {
      console.error('[MetaRouter] Routing failed:', error);
      return {
        orchestrationTemplate: null,
        confidence: 0,
        reasoning: `Routing error: ${error.message}`,
        fallbackToSingleAgent: true,
        recommendedRole: 'general_worker',
        estimatedDuration: 30,
        requiredCapabilities: ['text']
      };
    }
  }

  /**
   * Create the routing prompt for the MetaRouter agent
   */
  private static createRoutingPrompt(
    taskDescription: string,
    orchestrations: Array<{ id: string; name: string; description?: string | null; tags: string[] }>
  ): string {
    const orchestrationList = orchestrations.map((o, i) => 
      `${i + 1}. ${o.name}
   Description: ${o.description || 'No description'}
   Tags: ${o.tags.join(', ') || 'None'}`
    ).join('\n\n');

    return `Analyze this task and select the best orchestration template:

TASK:
${taskDescription}

AVAILABLE ORCHESTRATIONS:
${orchestrationList}

If none of these orchestrations are a good fit, set "fallbackToSingleAgent" to true and recommend an appropriate role.

Provide your routing decision as a JSON object.`;
  }

  /**
   * Quick complexity check (lightweight, no LLM)
   * Useful for determining if MetaRouter should even be called
   */
  static quickComplexityCheck(taskDescription: string): 'simple' | 'moderate' | 'complex' {
    const lower = taskDescription.toLowerCase();
    
    const simpleKeywords = ['list', 'show', 'display', 'get', 'read', 'status'];
    const complexKeywords = ['orchestrate', 'workflow', 'multi-step', 'pipeline', 'coordinate', 'architect'];
    
    const hasSimple = simpleKeywords.some(k => lower.includes(k));
    const hasComplex = complexKeywords.some(k => lower.includes(k));
    const isLong = taskDescription.length > 300;
    
    if (hasComplex || isLong) return 'complex';
    if (hasSimple && !isLong) return 'simple';
    return 'moderate';
  }
}
