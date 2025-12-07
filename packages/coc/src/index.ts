/**
 * COC Package Public Exports
 * 
 * Exports the main orchestrator functions and utilities for use by other packages.
 */

export { config } from './config.js';
export { eventBus } from './event-bus.js';
export type { Event, EventType, EventHandler } from './event-bus.js';
export { Bandit } from './bandit.js';
export type { BanditArm, BanditState } from './bandit.js';
export { TaskQueue } from './task-queue.js';
export type { Task, TaskStatus } from './task-queue.js';
export { runDirective } from './coc.js';
export type { DirectiveSpec } from './coc.js';
