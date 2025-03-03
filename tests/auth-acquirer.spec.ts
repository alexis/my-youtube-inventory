import { vi, describe, test, beforeEach, beforeAll, afterEach, expect } from 'vitest';
import AuthAcquirer from '../src/auth-acquirer.js';
import net from 'net';
import gaxios from 'gaxios';

const requestedTokenData = { access_token: 'ATOKEN_REQ', refresh_token: 'RTOKEN_REQ' };
const persistedTokenData = { access_token: 'ATOKEN_PERS', refresh_token: 'RTOKEN_PERS' };
const deviceCodeDate = { verification_url: 'http://example.com', user_code: '123456' };

const createMocks = () => {
  const oauthMock = {
    getDeviceCode: vi.fn().mockResolvedValue(deviceCodeDate),
    waitAndGetTokenData: vi.fn().mockResolvedValue(requestedTokenData),
    composeAuthUrl: vi.fn().mockReturnValue('http://localhost:3000/auth'),
    exchangeAuthCodeForToken: vi.fn().mockResolvedValue(requestedTokenData),
    refreshAccessToken: vi.fn().mockResolvedValue({ access_token: 'new_mock_access_token' }),
    client: vi.fn().mockReturnValue({}),
  };

  const persistedTokensMock = {
    exists: vi.fn().mockReturnValue(false),
    writeTokenData: vi.fn(),
    tokenData: persistedTokenData,
  };

  return { oauthMock, persistedTokensMock };
};

describe('AuthAcquirer', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let oauthMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let persistedTokensMock: any;
  let authAcquirer: AuthAcquirer;
  let webhookPort: number;

  beforeAll(async () => {
    webhookPort = await getFreePort();
  });

  afterEach(() => vi.restoreAllMocks());

  function setupAuthAcquirer(options = {}) {
    ({ oauthMock, persistedTokensMock } = createMocks());
    authAcquirer = new AuthAcquirer(
      { openUrl: false, ...options },
      { oauth: oauthMock, persistedTokens: persistedTokensMock },
    );
  }

  function testAcquireFromSavedToken() {
    test('acquire should return an auth object built from saved token if available', async () => {
      const mockAuth = { authentication: 'mock' };
      oauthMock.client.mockReturnValue(mockAuth);
      persistedTokensMock.exists.mockReturnValue(true);
      const auth = await authAcquirer.acquire();

      expect(oauthMock.client).toHaveBeenCalledWith(persistedTokenData);
      expect(auth).toBe(mockAuth);
    });
  }

  describe('Desktop Flow', () => {
    beforeEach(() => setupAuthAcquirer({ webhookPort }));

    test('acquire should send the OAuth request and return the oauth client', async () => {
      const mockAuth = { authentication: 'mock' };
      oauthMock.client.mockReturnValue(mockAuth);
      persistedTokensMock.exists.mockReturnValue(false);
      setTimeout(
        () =>
          gaxios.request({ url: `http://localhost:${webhookPort}?code=CODEXXX`, method: 'POST' }),
        50,
      );

      const auth = await authAcquirer.acquire();

      expect(oauthMock.exchangeAuthCodeForToken).toHaveBeenCalledWith(
        'CODEXXX',
        `http://localhost:${webhookPort}`,
      );
      expect(oauthMock.client).toHaveBeenCalledWith(requestedTokenData);
      expect(auth).toBe(mockAuth);
    });

    testAcquireFromSavedToken();
  });

  describe('Device Flow', () => {
    beforeEach(() => setupAuthAcquirer({ deviceFlow: true }));

    test('acquire should send the OAuth request and return the oauth client', async () => {
      const mockAuth = { authentication: 'mock' };
      oauthMock.client.mockReturnValue(mockAuth);
      persistedTokensMock.exists.mockReturnValue(false);

      const auth = await authAcquirer.acquire();

      expect(oauthMock.waitAndGetTokenData).toHaveBeenCalledWith(deviceCodeDate);
      expect(oauthMock.client).toHaveBeenCalledWith(requestedTokenData);
      expect(auth).toBe(mockAuth);
    });

    testAcquireFromSavedToken();
  });

  function getFreePort(): Promise<number> {
    return new Promise<number>(res => {
      const srv = net.createServer();
      srv.listen(0, () => {
        const port = (srv.address() as net.AddressInfo).port;
        srv.close(() => res(port));
      });
    });
  }
});
