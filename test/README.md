# Tests

This directory contains the test suite for the Booqable Node.js client, using [Vitest](https://vitest.dev/).

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
test/
├── auth/                          # Authentication tests
│   ├── api-key.test.ts           # API key authentication
│   └── single-use-token.test.ts  # JWT token authentication
├── client.test.ts                 # Main client class tests
├── errors.test.ts                 # Error classes and creation
├── json-api-serializer.test.ts   # JSON:API serialization
├── rate-limit.test.ts             # Rate limit tracking
└── resource-proxy.test.ts         # Resource CRUD operations
```

## Test Coverage

The test suite covers:

- **Error Handling** - All error classes and error creation logic
- **JSON:API Serialization** - Serialization, deserialization, relationship population
- **Rate Limiting** - Header parsing, reset calculation, limit tracking
- **Authentication** - API key, OAuth, and JWT token generation
- **Resource Operations** - CRUD operations, pagination, filtering, sorting
- **Client Configuration** - Options parsing, environment variables, defaults

## Writing Tests

Tests use [Vitest](https://vitest.dev/) with the following patterns:

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { MyClass } from '../src/my-class';

describe('MyClass', () => {
  describe('myMethod', () => {
    it('should do something', () => {
      const instance = new MyClass();
      const result = instance.myMethod();
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking

```typescript
import { vi, beforeEach } from 'vitest';

const mockFn = vi.fn();

beforeEach(() => {
  mockFn.mockReset();
});

it('should call mocked function', () => {
  mockFn.mockReturnValue('mocked');
  expect(mockFn()).toBe('mocked');
  expect(mockFn).toHaveBeenCalledTimes(1);
});
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

## Coverage Goals

We aim for high test coverage:

- **Statements**: > 80%
- **Branches**: > 80%
- **Functions**: > 80%
- **Lines**: > 80%

Check coverage with:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **One assertion per test** - Keep tests focused and easy to understand
3. **Use descriptive test names** - Test names should clearly describe what they test
4. **Arrange, Act, Assert** - Structure tests clearly:
   ```typescript
   it('should format date correctly', () => {
     // Arrange
     const date = new Date('2024-01-01');

     // Act
     const formatted = formatDate(date);

     // Assert
     expect(formatted).toBe('2024-01-01');
   });
   ```
5. **Test edge cases** - Don't just test the happy path
6. **Keep tests independent** - Each test should run in isolation

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Release builds

All tests must pass before merging.

## Debugging Tests

### Run a single test file

```bash
npm test test/errors.test.ts
```

### Run tests matching a pattern

```bash
npm test -- --grep "should create error"
```

### Debug in VS Code

Add this to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve code coverage
4. Follow existing test patterns
5. Update this README if adding new test categories

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Jest Matchers (compatible with Vitest)](https://jestjs.io/docs/expect)
