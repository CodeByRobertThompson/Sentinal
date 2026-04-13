import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestRunner } from '../test-runner';
import type { TestScript } from '../../models/test-script-models';

describe('TestRunner', () => {
  let mockConnector: any;
  let runner: TestRunner;

  beforeEach(() => {
    // Reset any global states
    (global as any).window = {};
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));

    mockConnector = {
      authenticate: vi.fn().mockResolvedValue(undefined),
      startConversation: vi.fn().mockResolvedValue({ id: 'conv-123' }),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      awaitBotResponse: vi.fn().mockResolvedValue('Hello back'),
      endConversation: vi.fn().mockResolvedValue(undefined)
    };

    runner = new TestRunner(mockConnector);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should gracefully handle endConversation rejecting and still return the final result in runScript', async () => {
    // Mock endConversation to throw an error
    mockConnector.endConversation.mockRejectedValue(new Error('Failed to close session'));

    // Silence console.warn to keep test output clean
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const script: TestScript = {
      id: 'script-1',
      name: 'Test Script',
      description: 'A test script',
      steps: [
        {
          userMessage: 'Hello',
          expectedResponsePattern: 'Hello'
        }
      ],
      tags: []
    };

    // runScript has timeouts, so we need to mock setTimeout or advance timers
    const runPromise = runner.runScript(script);

    // Fast-forward timers to get through the 120s cooldown and the 800ms step delays
    await vi.runAllTimersAsync();

    const result = await runPromise;

    // The error in finally block should be caught and logged
    expect(mockConnector.endConversation).toHaveBeenCalledWith('conv-123');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[TestRunner] Failed to end conversation:',
      'Failed to close session'
    );

    // The main run result should still be returned, NOT an error
    expect(result.status).not.toBe('error');
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0].passed).toBe(true);

    consoleWarnSpy.mockRestore();
  });
});
