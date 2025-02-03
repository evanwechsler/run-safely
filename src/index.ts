import { z } from 'zod';

/**
 * A type representing the result of an operation that might fail.
 * Returns either an error or success value in a tuple.
 * @template T The success value type
 * @template E The error type, extending Error (defaults to Error)
 */
export type SafeResult<T, E extends Error = Error> = [E] | [undefined, T];

/**
 * Safely executes promises or functions, returning a SafeResult.
 * Catches any errors and returns them in a structured way.
 * @template T The return value type
 * @param input A Promise or function to be executed safely
 */
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

/**
 * Base error class for fetch-related errors
 */
export class FetchError extends Error {
}

/**
 * Error thrown when the fetch operation itself fails (e.g., network error)
 */
export class FetchThrewError extends FetchError {
}

/**
 * Error thrown when the fetch response is not OK (status not in 200-299 range)
 */
export class ResponseNotOkError extends FetchError {
  response: Response;
  constructor(response: Response) {
    super(`Response not ok: ${response.status} ${response.statusText}`);
    this.response = response;
  }
}

/**
 * Error thrown when JSON parsing of the response fails
 */
export class JSONParseError extends FetchError {
}

/**
 * Error thrown when Zod schema validation fails for the response data
 * @template T The expected data type
 */
export class ParseFailedError<T> extends FetchError {
  zodError: z.ZodError<T>;
  constructor(error: z.ZodError<T>) {
    super(error.message);
    this.zodError = error;
  }
}

/**
 * Fetches data from a URL and validates it against a Zod schema.
 * Throws specific error types for different failure cases.
 * @template T The expected response data type
 * @param url The URL to fetch from
 * @param schema Zod schema to validate the response data
 * @param options Optional fetch options
 * @throws {FetchThrewError} When the fetch operation fails
 * @throws {ResponseNotOkError} When the response is not OK
 * @throws {JSONParseError} When JSON parsing fails
 * @throws {ParseFailedError} When schema validation fails
 */
export async function fetchTyped<T>(
  url: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit,
): Promise<z.infer<typeof schema>> {
  const [fetchError, response] = await runSafe(fetch(url, options));

  if (fetchError) {
    throw new FetchThrewError(fetchError.message);
  }

  if (!response.ok) {
    throw new ResponseNotOkError(response);
  }

  const [jsonError, json] = await runSafe(response.json());

  if (jsonError) {
    throw new JSONParseError(jsonError.message);
  }

  const data = schema.safeParse(json);

  if (!data.success) {
    throw new ParseFailedError(data.error);
  }

  return data.data;
}

/**
 * A safe version of fetchTyped that returns a SafeResult instead of throwing errors.
 * @template T The expected response data type
 * @param url The URL to fetch from
 * @param schema Zod schema to validate the response data
 * @param options Optional fetch options
 * @returns A SafeResult containing either the validated data or an error
 */
export async function safeFetch<T>(
  url: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit,
): Promise<SafeResult<z.infer<typeof schema>, FetchError>> {
  return await runSafe(fetchTyped(url, schema, options));
}

/**
 * A type representing the result of a server action.
 * Either contains successful data or an error message.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-expected-errors-from-server-actions
 *
 * @template T The success data type
 */
export type ServerActionResult<T> =
  | { success: true; error?: undefined; data: T }
  | { success: false; error: string; data?: undefined };
