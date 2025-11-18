// --- modelSelector.test.ts ---

import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import {
  loadModelCatalog,
  selectModel,
  HardStopError,
  RateLimitError,
} from './modelSelector.js'; // Import the code to be tested

// --- 1. The "Hoisted" Mock ---
// This block runs *before* all other code, including imports.
// This is the most important part.
const { vol, fs, mockRedisStore } = vi.hoisted(() => {
  const { Volume } = require('memfs');
  // Create a new, empty in-memory file system
  const vol = Volume.fromJSON({}, '/');
  const mockRedisStore = new Map<string, string>();

  // This is the magic: We mock 'node:fs' and 'node:fs/promises'
  // to point to our in-memory 'vol' object.
  return {
    vol, // Export the volume so we can add files to it in our tests
    fs: {
      ...vol,
      promises: vol.promises,
    },
    mockRedisStore,
  };
});

// --- 2. Tell Vitest to Use the Mock ---
// Now, anytime a file (like modelSelector.ts) imports 'node:fs',
// Vitest will give it our 'fs' object from above.
vi.mock('node:fs', () => fs);
vi.mock('node:fs/promises',() => fs.promises);

// --- 3. Mock Redis (as before) ---
// This mock is simpler and can be done here.
vi.mock('redis', () => {
  const MockRedisClient = {
    // Add mock functions your code actually calls
    get: vi.fn((key: string) => mockRedisStore.get(key) || null),
    set: vi.fn((key: string, value: string) => mockRedisStore.set(key, value)),
    incr: vi.fn((key: string) => {
      const val = (parseInt(mockRedisStore.get(key) || '0', 10)) + 1;
      mockRedisStore.set(key, val.toString());
      return val;
    }),
    connect: vi.fn(),
    on: vi.fn(),
  };
  return {
    createClient: vi.fn(() => MockRedisClient),
  };
});


// --- 4. The Test Suite ---

describe('ModelSelector Logic (with Mocks)', () => {
  beforeEach(async () => {
    // A. Reset the file system and redis store
    vol.reset();
    mockRedisStore.clear();

    // C. Reset all mocks (like redis.get, etc.)
    vi.clearAllMocks();

    // D. *** ACTIVATE FAKE TIMERS HERE ***
    // This is the *last* thing you do in setup.
    // By doing it here, all mocks are already in place.
    vi.useFakeTimers();

    // E. Populate the mock file system with test data
    vol.fromJSON(
      {
        '/models/google.json': JSON.stringify([
          { id: 'gemini-1.5-pro-latest', provider: 'google', cost: 0.00, simulation: { onLimitExceeded: 'HARD_STOP', rateLimits: { freeTier: { RPM: 2, RPD: 50 } } } },
          { id: 'gemini-1.0-pro', provider: 'google', cost: 0.00, simulation: { onLimitExceeded: 'HARD_STOP', rateLimits: { freeTier: { RPM: 5, RPD: 100 } } } },
        ]),
        '/models/openrouter.json': JSON.stringify([
          { id: 'openrouter/anthropic/claude-3-haiku', provider: 'openrouter', cost: 0.00, simulation: { onLimitExceeded: 'SOFT_FAIL', rateLimits: { freeTier: { RPD: 100 } } } },
          { id: 'openrouter/mistralai/mistral-7b-instruct', provider: 'openrouter', cost: 0.00, simulation: { onLimitExceeded: 'SOFT_FAIL', rateLimits: { freeTier: { RPD: 200 } } } },
        ]),
      },
      '/'
    );
  });

  afterEach(() => {
    // Clean up timers
    vi.useRealTimers();
  });

  // --- 5. The Tests ---

  it('should load the model catalog from the mock file system', async () => {
    // This test now uses the in-memory JSON files
    const catalog = await loadModelCatalog([
      '/models/google.json',
      '/models/openrouter.json',
    ]);
    expect(catalog.length).toBe(4);
    expect(catalog[0].id).toBe('gemini-1.5-pro-latest');
  });

  test("Hard Stop (Google RPD): It must prevent a 'Hard Stop' provider from exceeding its daily limit.", async () => {
    const modelId = 'gemini-1.5-pro-latest'; // 50 RPD
    for (let i = 0; i < 50; i++) {
      await selectModel({ model: modelId });
      vi.advanceTimersByTime(60 * 1000); // Advance 1 minute to avoid hitting RPM limit
    }
    await expect(selectModel({ model: modelId })).rejects.toThrow(HardStopError);
  });

  test("'Soft Fail' & Rerouting (OpenRouter RPD): It must reroute to the next available asset when a 'Soft Fail' provider is exhausted.", async () => {
    const modelId = 'openrouter/mistralai/mistral-7b-instruct'; // 200 RPD
    for (let i = 0; i < 200; i++) {
      await selectModel({ model: modelId });
      vi.advanceTimersByTime(60 * 1000);
    }
    const nextModel = await selectModel({ model: modelId });
    expect(nextModel).toBeDefined();
    expect(nextModel!.id).not.toBe(modelId);
    // When mistral is exhausted, the next least-used (with 0 usage) is gemini-1.5-pro-latest
    expect(nextModel!.id).toBe('gemini-1.5-pro-latest');
  });

  test("Hard Stop (Google RPM): It must respect the 'Hard Stop' RPM limit.", async () => {
    const modelId = 'gemini-1.5-pro-latest'; // 2 RPM
    await selectModel({ model: modelId }); // Call 1 -> OK
    await selectModel({ model: modelId }); // Call 2 -> OK
    // Call 3 should fail
    await expect(selectModel({ model: modelId })).rejects.toThrow(RateLimitError);
  });

  test("'Maximize Free Labour' (Least Used): It must select the least-used free asset to maximize utilization.", async () => {
    // Manually set usage counts in mock Redis
    mockRedisStore.set('model:usage:openrouter/mistralai/mistral-7b-instruct', '50');
    mockRedisStore.set('model:usage:gemini-1.0-pro', '10');
    mockRedisStore.set('model:usage:gemini-1.5-pro-latest', '20');
    mockRedisStore.set('model:usage:openrouter/anthropic/claude-3-haiku', '30');

    // Request a model without specifying a preference to trigger the "least used" logic
    const selectedModel = await selectModel({});
    expect(selectedModel).toBeDefined();
    expect(selectedModel!.id).toBe('gemini-1.0-pro');
  });

  test("'Daily Reset': It must reset daily limits after 24 hours.", async () => {
    const modelId = 'gemini-1.5-pro-latest'; // 50 RPD
    for (let i = 0; i < 50; i++) {
      await selectModel({ model: modelId });
      vi.advanceTimersByTime(60 * 1000); // Advance 1 minute to avoid hitting RPM limit
    }
    await expect(selectModel({ model: modelId })).rejects.toThrow(HardStopError);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000); // Advance time by 24 hours

    const modelAfterReset = await selectModel({ model: modelId });
    expect(modelAfterReset).toBeDefined();
    expect(modelAfterReset!.id).toBe(modelId);
  });
});
