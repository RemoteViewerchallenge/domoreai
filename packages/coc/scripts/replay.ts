/**
 * Simple replay utility to print events.jsonl or re-emit them to event-bus.
 * Usage: node packages/coc/scripts/replay.ts
 */
import fs from 'fs';
import path from 'path';
const eventsPath = path.resolve(process.cwd(), 'out', 'traces', 'events.jsonl');
const content = fs.existsSync(eventsPath) ? fs.readFileSync(eventsPath, 'utf8').trim().split('\n') : [];
for (const line of content) {
  try {
    const obj = JSON.parse(line);
    console.log(JSON.stringify(obj, null, 2));
  } catch (e) {
    console.log('bad line:', line);
  }
}