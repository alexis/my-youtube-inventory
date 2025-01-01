import { OAuth2Client } from 'google-auth-library';
import { sleep } from './utils.js';
import assert from 'assert/strict';

const DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code';
const TOKEN_URL = 'https://www.youtube.com/o/oauth2/token';

interface DeviceCodeData {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

interface TokenSuccessData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface TokenErrorData {
  error: string;
}

type TokenData = TokenSuccessData | TokenErrorData;

class OAuthYT {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private oauthScope: string = 'https://www.googleapis.com/auth/youtube.readonly',
  ) {}

  async getDeviceCode(): Promise<DeviceCodeData> {
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
    const result = (await response.json()) as DeviceCodeData;

    assert(this.isDeviceCodeData(result));

    return result;
  }

  async waitAndGetTokenData(deviceCodeResponse: DeviceCodeData): Promise<TokenSuccessData> {
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

      const result = (await response.json()) as TokenData;

      if ('error' in result) {
        if (result.error !== 'authorization_pending')
          throw new Error(`Error fetching access token: ${result.error}`);

        await sleep(deviceCodeResponse.interval * 1000);
        continue;
      }

      assert(this.isTokenSuccessResponse(result));

      return result;
    }
  }

  // Uses google-auth-library to achive an equivalent of:
  // ```
  //   const response = await fetch(TOKEN_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       client_id: this.clientId,
  //       client_secret: this.clientSecret,
  //       refresh_token: tokenData.refresh_token,
  //       grant_type: 'refresh_token',
  //     }),
  //   });
  //
  //   return await response.json()
  // ```
  async refreshAccessToken(tokenData: TokenSuccessData): Promise<TokenSuccessData> {
    const client = this.client(tokenData);
    const { credentials } = await client.refreshAccessToken();

    const result = { ...credentials, expires_in: credentials.expiry_date };
    assert(this.isTokenSuccessResponse(result));

    return result;
  }

  client(tokenData: TokenSuccessData) {
    const client = new OAuth2Client(this.clientId, this.clientSecret);
    client.setCredentials(tokenData);
    return client;
  }

  private isTokenSuccessResponse(response: unknown): response is TokenSuccessData {
    if (typeof response !== 'object' || response === null) return false;

    return ['access_token', 'expires_in', 'scope', 'token_type'].every(
      property => property in response,
    );
  }

  private isDeviceCodeData(response: unknown): response is DeviceCodeData {
    if (typeof response !== 'object' || response === null) return false;

    return ['device_code', 'user_code', 'verification_url', 'expires_in', 'interval'].every(
      property => property in response,
    );
  }
}
export { DeviceCodeData, TokenSuccessData, TokenErrorData, OAuth2Client };
export default OAuthYT;
