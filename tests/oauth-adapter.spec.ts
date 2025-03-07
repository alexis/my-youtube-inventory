import { describe, test, expect, vi, beforeEach, Mock } from 'vitest';
import OAuthAdapter from '../src/oauth-adapter.js';

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

vi.mock('google-auth-library', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await vi.importActual<any>('google-auth-library');

  class MockOAuth2Client {
    credentials = {};

    constructor(
      public clientId: string,
      public clientSecret: string,
      public redirectUri?: string,
    ) {}

    async getToken() {
      return {
        tokens: { access_token: 'mock_token', expires_in: 12345, scope: 'XXX', token_type: 'YYY' },
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCredentials(tokens: any) {
      this.credentials = tokens;
    }

    async refreshAccessToken() {
      return {
        credentials: {
          access_token: 'new_mock_token',
          refresh_token: 'mock_refresh_token',
          expiry_date: 67890,
          scope: 'XXX',
          token_type: 'YYY',
        },
      };
    }
  }

  return {
    ...actual,
    OAuth2Client: MockOAuth2Client,
  };
});

describe('OAuthAdapter', () => {
  let oauthAdapter: OAuthAdapter;
  const clientId = 'mock-client-id';
  const clientSecret = 'mock-client-secret';

  beforeEach(() => {
    oauthAdapter = new OAuthAdapter(clientId, clientSecret);
    vi.restoreAllMocks();
  });

  test('getDeviceCode should return device code data', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        device_code: 'mock_device_code',
        user_code: 'mock_user_code',
        verification_url: 'https://example.com',
        expires_in: 600,
        interval: 5,
      }),
    });

    const data = await oauthAdapter.getDeviceCode();

    expect(data).toEqual({
      device_code: 'mock_device_code',
      user_code: 'mock_user_code',
      verification_url: 'https://example.com',
      expires_in: 600,
      interval: 5,
    });
  });

  test('exchangeAuthCodeForToken should return token data', async () => {
    const authCode = 'mock_auth_code';
    const redirectUri = 'http://localhost/callback';

    const result = await oauthAdapter.exchangeAuthCodeForToken(authCode, redirectUri);

    expect(result).toEqual({
      access_token: 'mock_token',
      scope: 'XXX',
      token_type: 'YYY',
    });
  });

  test('refreshAccessToken should return new token data', async () => {
    const tokenData = {
      access_token: 'mock_token',
      refresh_token: 'mock_refresh',
      expires_in: 12345,
      scope: 'XXX',
      token_type: 'YYY',
    };

    const result = await oauthAdapter.refreshAccessToken(tokenData);

    expect(result).toEqual({
      access_token: 'new_mock_token',
      refresh_token: 'mock_refresh_token',
      expires_in: 67890,
      scope: 'XXX',
      token_type: 'YYY',
    });
  });

  test('composeAuthUrl should return correct URL', () => {
    const redirectUri = 'http://localhost/callback';
    const url = oauthAdapter.composeAuthUrl(redirectUri);

    expect(url).toContain('client_id=mock-client-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcallback');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly');
  });
});
