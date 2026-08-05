import { setSessionTokens, registerAuthCallbacks, api } from './api-client';

jest.mock('@kairos/api-client', () => {
  let capturedGetToken: () => string | null = () => null;
  let capturedRefresh: {
    getRefreshToken?: () => string | null;
    onTokenRefreshed?: (a: string, r: string) => void;
    onAuthFailure?: () => void;
  } = {};
  return {
    createApiClient: (
      _base: string,
      getToken: () => string | null,
      refresh: typeof capturedRefresh,
    ) => {
      capturedGetToken = getToken;
      capturedRefresh = refresh;
      return {
        __get: () => capturedGetToken(),
        __fireRefresh: (a: string, r: string) => capturedRefresh.onTokenRefreshed?.(a, r),
        __fireFailure: () => capturedRefresh.onAuthFailure?.(),
        __getRefresh: () => capturedRefresh.getRefreshToken?.() ?? null,
      };
    },
  };
});

const client = api as unknown as {
  __get: () => string | null;
  __fireRefresh: (a: string, r: string) => void;
  __fireFailure: () => void;
  __getRefresh: () => string | null;
};

beforeEach(() => {
  setSessionTokens(null);
  registerAuthCallbacks({ onRefreshed: () => {}, onFailure: () => {} });
});

describe('api-client wrapper', () => {
  it('setSessionTokens updates what getToken returns', () => {
    expect(client.__get()).toBeNull();
    setSessionTokens({ accessToken: 'x', refreshToken: 'y' });
    expect(client.__get()).toBe('x');
    expect(client.__getRefresh()).toBe('y');
    setSessionTokens(null);
    expect(client.__get()).toBeNull();
    expect(client.__getRefresh()).toBeNull();
  });

  it('onTokenRefreshed forwards to registered callback', () => {
    const onRefreshed = jest.fn();
    registerAuthCallbacks({ onRefreshed, onFailure: jest.fn() });
    client.__fireRefresh('new-a', 'new-r');
    expect(onRefreshed).toHaveBeenCalledWith({ accessToken: 'new-a', refreshToken: 'new-r' });
  });

  it('onAuthFailure forwards to registered callback', () => {
    const onFailure = jest.fn();
    registerAuthCallbacks({ onRefreshed: jest.fn(), onFailure });
    client.__fireFailure();
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it('re-registering callbacks replaces the previous set', () => {
    const first = jest.fn();
    const second = jest.fn();
    registerAuthCallbacks({ onRefreshed: first, onFailure: jest.fn() });
    registerAuthCallbacks({ onRefreshed: second, onFailure: jest.fn() });
    client.__fireRefresh('a', 'r');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });
});
