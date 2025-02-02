import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSafe, FetchError, fetchTyped, FetchThrewError, ResponseNotOkError, JSONParseError, ParseFailedError, safeFetch } from '../src/index';
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
    expect(result).toEqual(mockResponse);
  });

  it('handles fetch errors', async () => {
    const error = new Error('Network error');
    global.fetch = vi.fn().mockRejectedValue(error);

    const result = fetchTyped('https://api.example.com', schema);
    expect(result).rejects.toThrow(FetchThrewError);
  });

  it('handles non-ok responses', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 404,
        statusText: 'Not Found',
      }),
    );

    const result = fetchTyped('https://api.example.com', schema);
    expect(result).rejects.toThrow(ResponseNotOkError);
  });

  it('handles parse errors', async () => {
    const invalidResponse = { id: 'not-a-number', name: 123 }; // Invalid types
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(invalidResponse), {
        status: 200,
      }),
    );

    const result = fetchTyped('https://api.example.com', schema);
    expect(result).rejects.toThrow(ParseFailedError);
  });
});

describe('FetchThrewError', () => {
  it('properly constructs with error message', () => {
    const error = new FetchThrewError('network error');
    expect(error.message).toBe('network error');
    expect(error).toBeInstanceOf(FetchError);
  });
});

describe('ResponseNotOkError', () => {
  it('properly constructs with response', () => {
    const response = new Response(null, { status: 404, statusText: 'Not Found' });
    const error = new ResponseNotOkError(response);
    expect(error.message).toBe('Response not ok: 404 Not Found');
    expect(error.response).toBe(response);
    expect(error).toBeInstanceOf(FetchError);
  });
});

describe('JSONParseError', () => {
  it('properly constructs with error message', () => {
    const error = new JSONParseError('Invalid JSON');
    expect(error.message).toBe('Invalid JSON');
    expect(error).toBeInstanceOf(FetchError);
  });
});

describe('ParseFailedError', () => {
  it('properly constructs with zod error', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      },
    ]);
    const error = new ParseFailedError(zodError);
    expect(error.message).toBe(zodError.message);
    expect(error.zodError).toBe(zodError);
    expect(error).toBeInstanceOf(FetchError);
  });
});

describe('safeFetch', () => {
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

    const result = await safeFetch('https://api.example.com', schema);
    expect(result).toEqual([undefined, mockResponse]);
  });

  it('handles fetch errors', async () => {
    const error = new Error('Network error');
    global.fetch = vi.fn().mockRejectedValue(error);

    const result = await safeFetch('https://api.example.com', schema);
    expect(result[0]).toBeInstanceOf(FetchThrewError);
    expect(result[0]?.message).toBe('Network error');
  });

  it('handles non-ok responses', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 404,
        statusText: 'Not Found',
      }),
    );

    const result = await safeFetch('https://api.example.com', schema);
    expect(result[0]).toBeInstanceOf(ResponseNotOkError);
    expect(result[0]?.message).toBe('Response not ok: 404 Not Found');
  });

  it('handles JSON parse errors', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('invalid json', {
        status: 200,
      }),
    );

    const result = await safeFetch('https://api.example.com', schema);
    expect(result[0]).toBeInstanceOf(JSONParseError);
  });

  it('handles schema validation errors', async () => {
    const invalidResponse = { id: 'not-a-number', name: 123 };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(invalidResponse), {
        status: 200,
      }),
    );

    const result = await safeFetch('https://api.example.com', schema);
    expect(result[0]).toBeInstanceOf(ParseFailedError);
  });
});
