import { z } from 'zod';

export type SafeResult<T, E extends Error = Error> = [E] | [undefined, T];

export function runSafe<T>(promise: Promise<T>): Promise<SafeResult<T>>;
export function runSafe<T>(fn: () => T): Promise<SafeResult<T>>;
export function runSafe<T>(fn: () => Promise<T>): Promise<SafeResult<T>>;
export async function runSafe<T>(
  input: Promise<T> | (() => T) | (() => Promise<T>),
): Promise<SafeResult<T>> {
  try {
    return [
      undefined,
      await (input instanceof Promise ? input : input()),
    ];
  } catch (error) {
    return [error as Error];
  }
}

export type FetchErrorType = 'fetch-threw' | 'response-not-ok' | 'parse-failed';

export type FetchErrorItem<T> =
  | {
      type: 'fetch-threw';
      error: Error;
    }
  | {
      type: 'response-not-ok';
      response: Response;
    }
  | {
      type: 'parse-failed';
      error: z.ZodError<T>;
    };

export class FetchError<T> extends Error {
  readonly item: FetchErrorItem<T>;

  constructor(item: FetchErrorItem<T>) {
    const message = FetchError.getMessage(item);
    super(message);
    this.item = item;
  }

  private static getMessage<T>(item: FetchErrorItem<T>): string {
    let message: string;
    switch (item.type) {
      case 'response-not-ok':
        message = `[${item.response.status}] ${item.response.statusText}`;
        break;
      case 'parse-failed':
      case 'fetch-threw':
        message = item.error.message;
        break;
    }

    return message;
  }

  public getMessage(): string {
    return FetchError.getMessage(this.item);
  }
}

export async function fetchTyped<T>(
  url: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit,
): Promise<SafeResult<z.infer<typeof schema>, FetchError<T>>> {
  const [fetchError, response] = await runSafe(fetch(url, options));

  if (fetchError) {
    return [new FetchError({ type: 'fetch-threw', error: fetchError })];
  }

  if (!response.ok) {
    return [new FetchError({ type: 'response-not-ok', response })];
  }

  const data = schema.safeParse(await response.json());

  if (!data.success) {
    return [new FetchError({ type: 'parse-failed', error: data.error })];
  }

  return [undefined, data.data];
}

export type ServerActionResult<T> =
  | { success: true; error?: undefined; data: T }
  | { success: false; error: string; data?: undefined };
