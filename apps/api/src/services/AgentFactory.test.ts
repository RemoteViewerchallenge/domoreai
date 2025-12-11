import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VolcanoAgent } from './AgentFactory.js';
import { ProviderManager } from './ProviderManager.js';
import * as modelManager from '../services/modelManager.service.js';

// Mock dependencies
vi.mock('./ProviderManager.js');
vi.mock('../services/modelManager.service.js');

describe('VolcanoAgent', () => {
  let mockProvider: any;
  let mockNextProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      id: 'provider-1',
      generateCompletion: vi.fn(),
    };

    mockNextProvider = {
      id: 'provider-2',
      generateCompletion: vi.fn(),
    };
  });

  it('should fallback to the next best model when the first provider fails', async () => {
    // Setup initial failure
    mockProvider.generateCompletion.mockRejectedValue({ status: 500, message: 'Server Error' });
    
    // Setup successful recovery
    mockNextProvider.generateCompletion.mockResolvedValue('Success after failover');

    // Mock ProviderManager to return providers
    vi.mocked(ProviderManager.getProvider).mockImplementation(function (this: void, id) {
      if (id === 'provider-1') return mockProvider;
      if (id === 'provider-2') return mockNextProvider;
      return undefined;
    });

    // Mock getBestModel to return the next model
    vi.mocked(modelManager.getBestModel).mockResolvedValue({
      modelId: 'gpt-4-backup',
      providerId: 'provider-2',
      temperature: 0.7,
      maxTokens: 100,
      model: { id: 'gpt-4-backup', providerId: 'provider-2' }
    } as any);

    const agent = new VolcanoAgent(
      mockProvider,
      'System Prompt',
      { apiModelId: 'gpt-4-primary', temperature: 0.7, maxTokens: 100 },
      'role-1'
    );

    // Override wait time to 0 for test speed
    // We can't easily override the private method or the setTimeout inside generate without more complex mocking
    // But since we are mocking the provider rejection, we can just let it run. 
    // The code has a 2s default wait. We can mock setTimeout.
    vi.useFakeTimers();

    const generatePromise = agent.generate('User Goal');
    
    // Fast-forward time to skip the backoff
    await vi.runAllTimersAsync();
    
    const result = await generatePromise;

    expect(result).toBe('Success after failover');
    expect(mockProvider.generateCompletion).toHaveBeenCalledTimes(1);
    expect(modelManager.getBestModel).toHaveBeenCalledWith('role-1', ['provider-1']);
    expect(mockNextProvider.generateCompletion).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });

  it('should throw an error if the orchestrator returns a failed provider', async () => {
    mockProvider.generateCompletion.mockRejectedValue({ status: 500, message: 'Server Error' });

    vi.mocked(ProviderManager.getProvider).mockImplementation(function (this: void) {
      return mockProvider;
    });

    // Orchestrator returns the SAME provider that just failed (simulating a bug or exhaustion)
    vi.mocked(modelManager.getBestModel).mockResolvedValue({
      modelId: 'gpt-4-primary',
      providerId: 'provider-1', // SAME ID
      temperature: 0.7,
      maxTokens: 100,
      model: { id: 'gpt-4-primary', providerId: 'provider-1' }
    } as any);

    const agent = new VolcanoAgent(
      mockProvider,
      'System Prompt',
      { apiModelId: 'gpt-4-primary', temperature: 0.7, maxTokens: 100 },
      'role-1'
    );

    vi.useFakeTimers();
    const generatePromise = agent.generate('User Goal');
    await vi.runAllTimersAsync();

    await expect(generatePromise).rejects.toThrow(/Orchestrator returned failed provider/);
    
    vi.useRealTimers();
  });
});
