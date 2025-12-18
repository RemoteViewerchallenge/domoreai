import { prisma } from '../db.js';

export type ComplexityScore = {
  decision: 'single-agent' | 'swarm';
  complexityLevel: 'simple' | 'moderate' | 'complex';
  recommendedModel: string;
  requiredSpecializations: string[];
  estimatedDurationMinutes: number;
  riskFactors: string[];
  dependencies: string[];
  workflowPhase: string;
  emergencyMode?: boolean;
  reasoningSteps: string[];
};

const SIMPLE_KEYWORDS = ['list','show','display','format','simple','basic','status','copy','move','rename','delete','create file','read file','update text','replace text','generate template','convert format','extract data','validate input'];
const MODERATE_KEYWORDS = ['implement','develop','build','create component','add feature','update logic','refactor','optimize','configure','setup','integrate','connect','transform','analyze','process','parse','validate','test','debug','fix bug'];
const COMPLEX_KEYWORDS = ['architect','design system','orchestrate','coordinate','multi-agent','workflow','planning','strategy','research','analysis','infrastructure','migration','scalability','performance','security','automation','deployment','ci/cd','monitoring','distributed','microservices','api design','database design'];

export class ComplexityRouter {
  constructor() {}

  async analyzeTask(taskDescription: string, _config: Record<string, unknown> = {}): Promise<ComplexityScore> {
    const reasoning: string[] = [];
    const lower = (taskDescription || '').toLowerCase();

    // Check frustration
    const pissed = ['fuck','wtf','wth','damn','shit','you suck','idiot','hate'].filter(k => lower.includes(k));
    const emergency = pissed.length > 0;
    if (emergency) {
      reasoning.push('Emergency mode: user frustration indicators detected: ' + pissed.join(', '));
    }

    // Complexity scoring
    let score = 0;
    for (const k of SIMPLE_KEYWORDS) if (lower.includes(k)) score -= 1;
    for (const k of MODERATE_KEYWORDS) if (lower.includes(k)) score += 1;
    for (const k of COMPLEX_KEYWORDS) if (lower.includes(k)) score += 2;
    if (lower.length > 500) score += 1;

    let level: 'simple'|'moderate'|'complex' = 'moderate';
    if (emergency) level = 'complex';
    else if (score <= -1) level = 'simple';
    else if (score >= 3) level = 'complex';

    reasoning.push(`Complexity score ${score} => ${level}`);

    // Specializations
    const specs = [] as string[];
    const mapping: Record<string,string[]> = {
      frontend: ['ui','react','css','html'],
      backend: ['api','server','database','authentication'],
      testing: ['test','spec','unit test','integration test'],
      documentation: ['docs','documentation','readme','guide'],
      devops: ['deploy','infrastructure','ci/cd','kubernetes'] ,
      researcher: ['research','analyse','analysis','benchmark'],
      architect: ['architect','design','orchestrate','workflow']
    };
    for (const [spec, keys] of Object.entries(mapping)) {
      for (const k of keys) if (lower.includes(k)) { specs.push(spec); break; }
    }
    if (specs.length === 0) specs.push('generalist');
    reasoning.push('Detected specializations: ' + specs.join(', '));

    // --- THE NEW ROUTING LOGIC (Zero-Burn) ---
    let recommendedModel = (await prisma.model.findFirst({
      where: { capabilities: { has: 'fallback' } }
    }))?.id;

    if (!recommendedModel) {
      const fallback = await prisma.model.findFirst({
        where: { capabilities: { has: 'text' } },
        orderBy: { costPer1k: 'asc' }
      });
      if (fallback) recommendedModel = fallback.id;
      else throw new Error("No models available in database for fallback.");
    }

    try {
      // Helper to find best free model with capability
      const findBestModel = async (capability: string, minContext = 4096) => {
        return await prisma.model.findFirst({
          where: {
            OR: [
              { isFree: true },
              { costPer1k: 0 }
            ],
            capabilities: { has: capability },
            specs: {
               path: ['contextWindow'],
               gte: minContext
            }
          },
          orderBy: [
            // { specs: { path: ['speed'], sort: 'desc' } }, // Removed to avoid non-standard Prisma JSON sort typing issues
            { costPer1k: 'asc' }
          ]
        });
      };

      // 1. HEAVY DUTY (Code/Arch) -> Needs large context and coding capability
      if (taskDescription.includes('code') || taskDescription.length > 500) {
           const model = await findBestModel('coding', 16000) || await findBestModel('text', 16000);
           if (model) recommendedModel = model.id;
      }
      // 2. REASONING/WRITING -> Needs reasoning capability
      else if (taskDescription.includes('plan') || taskDescription.includes('write')) {
           const model = await findBestModel('reasoning', 8000) || await findBestModel('text', 8000);
           if (model) recommendedModel = model.id;
      }
      // 3. FAST/SIMPLE -> Any text model
      else {
           const model = await findBestModel('text', 4096);
           if (model) recommendedModel = model.id;
      }
    } catch (e) {
      console.warn('DB Model routing failed, using fallback:', e);
    }

    reasoning.push('Routed via Zero-Burn Protocol');

    // Duration estimate (minutes)
    let duration = level === 'simple' ? 15 : level === 'moderate' ? 45 : 180;
    duration += Math.max(0, specs.length - 1) * 15;

    // Risk and dependencies (simple heuristics)
    const risks: string[] = [];
    if (lower.includes('migration') || lower.includes('production') || lower.includes('data loss')) risks.push('high');
    if (lower.includes('integration') || lower.includes('third party')) risks.push('medium');
    const deps: string[] = [];
    if (lower.includes('test') && !lower.includes('unit test')) deps.push('Implementation before testing');
    if (lower.includes('deploy')) deps.push('Testing before deployment');

    const workflow = lower.includes('research') ? 'research' : lower.includes('plan') ? 'planning' : 'execution';

    const decision = level === 'complex' ? 'swarm' : 'single-agent';

    return {
      decision: decision,
      complexityLevel: level,
      recommendedModel,
      requiredSpecializations: specs,
      estimatedDurationMinutes: duration,
      riskFactors: risks,
      dependencies: deps,
      workflowPhase: workflow,
      emergencyMode: emergency || undefined,
      reasoningSteps: reasoning
    };
  }
}

export const complexityRouter = new ComplexityRouter();
