/**
 * Trace Replay Utility
 * 
 * Reads and prints trace events from events.jsonl for debugging and UI replay.
 * Usage: pnpm --filter @domoreai/coc replay
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from '../src/config.js';

interface TraceEvent {
  type: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Read and parse JSONL trace file
 */
function readTraceEvents(filePath: string): TraceEvent[] {
  if (!fs.existsSync(filePath)) {
    console.error(`Trace file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  return lines
    .filter(line => line.trim().length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error(`Failed to parse line: ${line}`);
        return null;
      }
    })
    .filter((event): event is TraceEvent => event !== null);
}

/**
 * Format event for display
 */
function formatEvent(event: TraceEvent, index: number): string {
  const time = new Date(event.timestamp).toISOString();
  let details = '';
  
  switch (event.type) {
    case 'directive.started':
      details = `Directive ${event.directiveId} started (${event.taskCount} tasks)`;
      break;
    case 'directive.completed':
      details = `Directive ${event.directiveId} completed`;
      break;
    case 'task.queued':
      details = `Task ${event.taskId} queued (role: ${event.role})`;
      break;
    case 'task.started':
      details = `Task ${event.taskId} started`;
      break;
    case 'task.completed':
      details = `Task ${event.taskId} completed`;
      break;
    case 'task.failed':
      details = `Task ${event.taskId} failed: ${event.error}`;
      break;
    case 'task.retried':
      details = `Task ${event.taskId} retried (attempt ${event.attempt})`;
      break;
    case 'evaluation.complete':
      details = `Task ${event.taskId} evaluated: ${event.passed ? 'PASSED' : 'FAILED'} (score: ${event.score?.toFixed(2)})`;
      break;
    case 'artifact.indexed':
      details = `Artifact ${event.artifactId} indexed for task ${event.taskId}`;
      break;
    default:
      details = JSON.stringify(event, null, 2);
  }
  
  return `[${index + 1}] ${time} | ${event.type.padEnd(25)} | ${details}`;
}

/**
 * Main replay function
 */
function main() {
  const traceFile = path.join(config.traceDir, 'events.jsonl');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  COC Trace Replay');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Trace file: ${traceFile}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  const events = readTraceEvents(traceFile);
  
  if (events.length === 0) {
    console.log('No events found.');
    return;
  }
  
  console.log(`Found ${events.length} events:\n`);
  
  events.forEach((event, index) => {
    console.log(formatEvent(event, index));
  });
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`  Total Events: ${events.length}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main();
