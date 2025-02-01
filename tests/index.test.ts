import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSafe, FetchError, fetchTyped } from '../src/index';
import { z } from 'zod';

describe('runSafe', () => {
  it('handles successful promises', async () => {
    const promise = Promise.resolve(42);
    const result = await runSafe(promise);
    expect(result).toEqual([undefined, 42]);
  });

  it('handles successful synchronous functions', async () => {
    const fn = () => 42;
    const result = await runSafe(fn);
    expect(result).toEqual([undefined, 42]);
  });

  it('handles successful async functions', async () => {
    const fn = async () => 42;
    const result = await runSafe(fn);
    expect(result).toEqual([undefined, 42]);
  });

  it('handles errors in promises', async () => {
    const error = new Error('test error');
    const promise = Promise.reject(error);
    const result = await runSafe(promise);
    expect(result).toEqual([error]);
  });

  it('handles errors in functions', async () => {
    const error = new Error('test error');
    const fn = () => {
      throw error;
    };
    const result = await runSafe(fn);
    expect(result).toEqual([error]);
  });
});

describe('FetchError', () => {
  it('handles fetch-threw errors', () => {
    const error = new Error('network error');
    const fetchError = new FetchError({ type: 'fetch-threw', error });
    expect(fetchError.getMessage()).toBe('network error');
    expect(fetchError.message).toBe('network error');
    expect(fetchError.item.type).toBe('fetch-threw');
  });

  it('handles response-not-ok errors', () => {
    const response = new Response(null, { status: 404, statusText: 'Not Found' });
    const fetchError = new FetchError({ type: 'response-not-ok', response });
    expect(fetchError.getMessage()).toBe('[404] Not Found');
    expect(fetchError.message).toBe('[404] Not Found');
    expect(fetchError.item.type).toBe('response-not-ok');
  });

  it('handles parse-failed errors', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      },
    ]);
    const fetchError = new FetchError({ type: 'parse-failed', error: zodError });
    expect(fetchError.getMessage()).toContain('Expected string, received number');
    expect(fetchError.message).toContain('Expected string, received number');
    expect(fetchError.item.type).toBe('parse-failed');
  });
});

describe('fetchTyped', () => {
  const schema = z.object({
    id: z.number(),
    name: z.string(),
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles successful fetch and parse', async () => {
    const mockResponse = { id: 1, name: 'test' };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
      }),
    );

    const result = await fetchTyped('https://api.example.com', schema);
    expect(result).toEqual([undefined, mockResponse]);
  });

  it('handles fetch errors', async () => {
    const error = new Error('Network error');
    global.fetch = vi.fn().mockRejectedValue(error);

    const result = await fetchTyped('https://api.example.com', schema);
    expect(result[0]).toBeInstanceOf(FetchError);
    expect(result[0]?.item.type).toBe('fetch-threw');
  });

  it('handles non-ok responses', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 404,
        statusText: 'Not Found',
      }),
    );

    const result = await fetchTyped('https://api.example.com', schema);
    expect(result[0]).toBeInstanceOf(FetchError);
    expect(result[0]?.item.type).toBe('response-not-ok');
  });

  it('handles parse errors', async () => {
    const invalidResponse = { id: 'not-a-number', name: 123 }; // Invalid types
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(invalidResponse), {
        status: 200,
      }),
    );

    const result = await fetchTyped('https://api.example.com', schema);
    expect(result[0]).toBeInstanceOf(FetchError);
    expect(result[0]?.item.type).toBe('parse-failed');
  });
});
