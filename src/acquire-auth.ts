import { existsSync } from 'fs';
import OAuthYT, { TokenSuccessData, OAuth2Client } from './oauth-yt.js';
import { readJsonSync, writeJsonSync } from './utils.js';

const TOKEN_FILE = process.env.MYTI_TOKEN_FILE || 'OAUTH.json';
const CLIENT_ID = process.env.MYTI_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.MYTI_OAUTH_CLIENT_SECRET;
const OAUTH_SCOPE = process.env.MYTI_OAUTH_SCOPE;

interface SavedTokenData extends TokenSuccessData {
  refresh_token: string;
}

class AuthAcquirer {
  private oauthYT: OAuthYT;
  private tokenFile: string;

  constructor() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('You need to set up OAuth');
    }

    this.oauthYT = new OAuthYT(CLIENT_ID, CLIENT_SECRET, OAUTH_SCOPE);
    this.tokenFile = TOKEN_FILE;
  }

  async authorizeOAuth(): Promise<TokenSuccessData> {
    console.log('No existing token found. Starting OAuth Device Flow...');
    const deviceCodeData = await this.oauthYT.getDeviceCode();

    console.log(`Visit this URL to authorize: ${deviceCodeData.verification_url}`);
    console.log(`Enter the code: ${deviceCodeData.user_code}`);
    return await this.oauthYT.waitAndGetTokenData(deviceCodeData);
  }

  async loadSavedOAuthTokenData(): Promise<TokenSuccessData | null> {
    if (existsSync(this.tokenFile)) {
      const savedTokenData: SavedTokenData = readJsonSync(this.tokenFile);
      if (!savedTokenData) return null;
      const refreshTokenData = await this.oauthYT.refreshAccessToken(savedTokenData);
      return { ...refreshTokenData, ...savedTokenData };
    }

    return null;
  }

  async acquire(): Promise<OAuth2Client> {
    const tokenData = (await this.loadSavedOAuthTokenData()) || (await this.authorizeOAuth());
    writeJsonSync(this.tokenFile, tokenData);
    return this.oauthYT.client(tokenData);
  }
}

export const acquireAuth = async (): Promise<OAuth2Client> => new AuthAcquirer().acquire();
