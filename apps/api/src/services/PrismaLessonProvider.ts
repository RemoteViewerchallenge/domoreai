import { prisma } from '../db.js';
import { LessonProvider, AgentLesson } from '@repo/agents';

export class PrismaLessonProvider implements LessonProvider {
  async getLessons(keywords: string[]): Promise<AgentLesson[]> {
    if (!keywords || keywords.length === 0) return [];

    try {
      const lessons = await prisma.agentLesson.findMany({
        where: {
          OR: keywords.map(k => ({
            trigger: {
              contains: k,
              mode: 'insensitive',
            },
          })),
        },
        take: 5,
        orderBy: {
          confidence: 'desc',
        },
      });

      return lessons.map(l => ({
        rule: l.rule,
        confidence: l.confidence
      }));
    } catch (error) {
      console.error('[PrismaLessonProvider] Failed to fetch lessons:', error);
      return [];
    }
  }
}
