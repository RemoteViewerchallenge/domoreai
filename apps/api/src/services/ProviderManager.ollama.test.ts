
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderManager } from './ProviderManager';
import axios from 'axios';
import { db } from '../db';

// Mock dependencies
vi.mock('axios');
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]), // Default: no existing configs
  },
}));

// Access private method via any cast
const PM = ProviderManager as any;

describe('ProviderManager - Ollama Auto-Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PM.providers.clear();
    process.env.OLLAMA_HOST = 'http://mock-ollama:11434';
  });

  afterEach(() => {
    delete process.env.OLLAMA_HOST;
  });

  it('should auto-detect and register Ollama if reachable', async () => {
    // Mock successful Ollama response
    (axios.get as any).mockResolvedValue({
      data: {
        models: [
          { name: 'llama3:latest', details: { family: 'llama' } }
        ]
      }
    });

    await PM.detectLocalOllama();

    expect(PM.providers.has('ollama-local')).toBe(true);
    const provider = PM.providers.get('ollama-local');
    expect(provider).toBeDefined();
    expect(provider.id).toBe('ollama-local');
  });

  it('should NOT register Ollama if unreachable', async () => {
    // Mock failed connection
    (axios.get as any).mockRejectedValue(new Error('Connection refused'));

    await PM.detectLocalOllama();

    expect(PM.providers.has('ollama-local')).toBe(false);
  });

  it('should NOT register if already configured in DB', async () => {
    // Simulate existing provider
    PM.providers.set('ollama-local', {}); 

    await PM.detectLocalOllama();

    // Should not have called axios (optimization check)
    expect(axios.get).not.toHaveBeenCalled();
  });
});
