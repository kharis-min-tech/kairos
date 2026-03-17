# Test Patterns Reference

## API Handler Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// === Mocks ===
vi.mock('@kairos/utils', () => ({
  resolveAuthContext: vi.fn(),
  enforceBranchAccess: vi.fn(),
  handleError: vi.fn((err) => ({
    statusCode: err.statusCode || 500,
    body: JSON.stringify({ error: err.message }),
  })),
  successResponse: vi.fn((data) => ({
    statusCode: 200,
    body: JSON.stringify(data),
  })),
  createdResponse: vi.fn((data) => ({
    statusCode: 201,
    body: JSON.stringify(data),
  })),
  validateOrThrow: vi.fn((_schema, data) => data),
  getDb: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('@kairos/database', () => ({
  // Mock table objects as needed
}));

// === Imports (after mocks) ===
import { handler } from './handler-file';
import { resolveAuthContext, enforceBranchAccess, getDb, validateOrThrow } from '@kairos/utils';

// === Helpers ===
const mockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: null,
  headers: { authorization: 'Bearer test-token' },
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as never,
  resource: '',
  ...overrides,
});

const mockAuthContext = (overrides = {}) => ({
  userId: 'user-123',
  memberId: 'member-123',
  branchId: 'branch-123',
  role: 'pastor',
  email: 'test@example.com',
  ...overrides,
});

// === Tests ===
describe('handler-name', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthContext).mockResolvedValue(mockAuthContext());
    vi.mocked(getDb).mockReturnValue(mockDb as never);
  });

  it('should return success on valid request', async () => {
    // Arrange
    mockDb.returning.mockResolvedValueOnce([{ id: '1' }]);

    // Act
    const result = await handler(mockEvent({ body: JSON.stringify({ name: 'Test' }) }));

    // Assert
    expect(result.statusCode).toBe(200);
  });

  it('should enforce branch isolation', async () => {
    // Arrange & Act
    await handler(mockEvent());

    // Assert
    expect(enforceBranchAccess).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'branch-123' }),
      expect.any(String)
    );
  });

  it('should handle validation errors', async () => {
    // Arrange
    vi.mocked(validateOrThrow).mockImplementationOnce(() => {
      throw { statusCode: 400, message: 'Validation failed' };
    });

    // Act
    const result = await handler(mockEvent({ body: '{}' }));

    // Assert
    expect(result.statusCode).toBe(400);
  });
});
```

## React Component Test Template

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Helper: wrap component with minimal providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// Mock hooks
vi.mock('@/hooks/use-domain', () => ({
  useDomainList: vi.fn(),
  useCreateDomain: vi.fn(),
}));

import { ComponentName } from '../ComponentName';
import { useDomainList } from '@/hooks/use-domain';

describe('ComponentName', () => {
  it('renders data when loaded', () => {
    vi.mocked(useDomainList).mockReturnValue({
      data: [{ id: '1', name: 'Test' }],
      isLoading: false,
      error: null,
    } as never);

    renderWithProviders(<ComponentName />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    vi.mocked(useDomainList).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    renderWithProviders(<ComponentName />);
    // Assert loading skeleton is visible
  });

  it('shows error message', () => {
    vi.mocked(useDomainList).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    } as never);

    renderWithProviders(<ComponentName />);
    expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    vi.mocked(useDomainList).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);

    renderWithProviders(<ComponentName />);
    expect(screen.getByText(/no .* found/i)).toBeInTheDocument();
  });
});
```

## TanStack Query Hook Test Template

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@kairos/api-client', () => ({
  api: {
    domain: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { useDomainList, useCreateDomain } from '../hooks/use-domain';
import { api } from '@kairos/api-client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useDomainList', () => {
  it('returns data on success', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    vi.mocked(api.domain.list).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useDomainList({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
```
