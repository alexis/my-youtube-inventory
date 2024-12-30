import { OAuth2Client } from 'google-auth-library';
import { sleep } from './utils.js';

const DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code';
const TOKEN_URL = 'https://www.youtube.com/o/oauth2/token';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

interface TokenSuccessResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface TokenErrorResponse {
  error: string;
}

type TokenResponse = TokenSuccessResponse | TokenErrorResponse;

class OAuthYT {
  private clientId: string;
  private clientSecret: string;
  private oauthScope: string;

  constructor(
    clientId: string,
    clientSecret: string,
    oauthScope: string = 'https://www.googleapis.com/auth/youtube.readonly',
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.oauthScope = oauthScope;
  }

  async getDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch(DEVICE_CODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: this.oauthScope,
        device_id: crypto.randomUUID(),
        device_model: 'MYTI',
      }),
    });

    if (!response.ok) throw new Error(`Error fetching device code: ${response.statusText}`);
    const result = (await response.json()) as DeviceCodeResponse;

    if (!this.isDeviceCodeResponse(result))
      throw new Error('Unexpected device code response format');

    return result;
  }

  async waitAndGetTokenData(deviceCodeResponse: DeviceCodeResponse): Promise<TokenSuccessResponse> {
    while (true) {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          device_code: deviceCodeResponse.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      const result = (await response.json()) as TokenResponse;

      if ('error' in result) {
        if (result.error !== 'authorization_pending')
          throw new Error(`Error fetching access token: ${result.error}`);

        await sleep(deviceCodeResponse.interval * 1000);
        continue;
      }

      if (!this.isTokenSuccessResponse(response)) new Error('Unexpected token response format');

      return result;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSuccessResponse> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const result = (await response.json()) as TokenResponse;

    if ('error' in result) throw new Error(`Error refreshing token: ${result.error}`);
    if (!this.isTokenSuccessResponse(response)) new Error('Unexpected token response format');

    return result;
  }

  client(tokenData: TokenSuccessResponse) {
    const client = new OAuth2Client(this.clientId, this.clientSecret);
    client.setCredentials(tokenData);
    return client;
  }

  private isTokenSuccessResponse(response: unknown): response is TokenSuccessResponse {
    if (typeof response !== 'object' || response === null) return false;

    return ['access_token', 'expires_in', 'scope', 'token_type'].every(
      property => property in response,
    );
  }

  private isDeviceCodeResponse(response: unknown): response is DeviceCodeResponse {
    if (typeof response !== 'object' || response === null) return false;

    return ['device_code', 'user_code', 'verification_url', 'expires_in', 'interval'].every(
      property => property in response,
    );
  }
}
export { DeviceCodeResponse, TokenSuccessResponse, TokenErrorResponse, OAuth2Client };
export default OAuthYT;
