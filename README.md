# Safe TypeScript Utilities

A TypeScript utility package providing safe error handling patterns and typed fetch operations with Zod schema validation.

## Installation

```bash
pnpm add run-safely
```
or
```bash
npm install run-safely
```
or
```bash
yarn add run-safely
```


## Features

- Type-safe error handling with `SafeResult` type
- Safe promise/function execution with `runSafe` utility
- Typed fetch operations with Zod schema validation
- Structured error handling for HTTP requests

## API Reference

### SafeResult

A type representing the result of an operation that might fail, providing either an error or success value.

```typescript
type SafeResult<T, E extends Error = Error> = [E] | [undefined, T];
```


### runSafe

A utility function that safely executes promises or functions, returning a `SafeResult`.

```typescript
function runSafe<T>(promise: Promise<T>): Promise<SafeResult<T>>;
function runSafe<T>(fn: () => T): Promise<SafeResult<T>>;
function runSafe<T>(fn: () => Promise<T>): Promise<SafeResult<T>>;
```

Example usage:

```typescript
// With a promise
const [error, data] = await runSafe(fetchSomeData());
// With a function
const [error, result] = await runSafe(() => someOperation());
if (error) {
console.error('Operation failed:', error);
} else {
console.log('Success:', result);
```

### fetchTyped

A type-safe fetch utility that validates response data against a Zod schema.

```typescript
function fetchTyped<T>(
url: string,
schema: z.ZodSchema<T>,
options?: RequestInit
): Promise<SafeResult<T, FetchError<T>>>;
```


Example usage:

```typescript
import { z } from 'zod';
const userSchema = z.object({
id: z.number(),
name: z.string(),
});
const [error, user] = await fetchTyped('/api/user/1', userSchema);
if (error) {
	switch (error.item.type) {
		case 'fetch-threw':
			console.error('Network error:', error.item.error);
			return;
		case 'response-not-ok':
			console.error('HTTP error:', error.item.response.status);
			return;
		case 'parse-failed':
			console.error('Invalid response data:', error.item.error);
			return;
	}
}

console.log('User data:', user);
```


### ServerActionResult

A type for representing the result of server actions with proper typing for success and error states.

```typescript
type ServerActionResult<T> =
| { success: true; error?: undefined; data: T }
| { success: false; error: string; data?: undefined };
```


## Error Handling

The package includes a `FetchError` class that provides structured error handling for HTTP requests. It handles three types of errors:

- `fetch-threw`: Network or other fetch-related errors
- `response-not-ok`: Non-200 HTTP responses
- `parse-failed`: Response data validation failures

## Contributing

We welcome contributions! Here's how you can help:

1. Create your feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

Please make sure to:
- Update documentation for any new features
- Add tests for new functionality using vitest
- Follow the existing code style
- Run tests before submitting (`pnpm test`)

## License

MIT License