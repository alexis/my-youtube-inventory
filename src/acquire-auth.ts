import { existsSync } from 'fs';
import OAuthAdapter, { TokenSuccessData, OAuth2Client } from './oauth-adapter.js';
import { readJsonSync, writeJsonSync } from './utils.js';
import http from 'http';
import open from 'open';
import { URL } from 'url';
import { AddressInfo } from 'net';

const TOKEN_FILE = process.env.MYTI_TOKEN_FILE || 'OAUTH.json';
const CLIENT_ID = process.env.MYTI_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.MYTI_OAUTH_CLIENT_SECRET;
const OAUTH_SCOPE = process.env.MYTI_OAUTH_SCOPE;
const REDIRECT_URI = `http://localhost`;

interface SavedTokenData extends TokenSuccessData {
  refresh_token: string;
}

class AuthAcquirer {
  private oauth: OAuthAdapter;
  private tokenFile: string;

  constructor() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('You need to set up OAuth');
    }

    this.oauth = new OAuthAdapter(CLIENT_ID, CLIENT_SECRET, OAUTH_SCOPE);
    this.tokenFile = TOKEN_FILE;
  }

  async authorizeOAuthDevice(): Promise<TokenSuccessData> {
    console.log('No existing token found. Starting OAuth Device Flow...');
    const deviceCodeData = await this.oauth.getDeviceCode();

    console.log(`Visit this URL to authorize: ${deviceCodeData.verification_url}`);
    console.log(`Enter the code: ${deviceCodeData.user_code}`);
    return await this.oauth.waitAndGetTokenData(deviceCodeData);
  }

  async authorizeOAuthDesktop(): Promise<TokenSuccessData> {
    console.log('No existing token found. Starting OAuth Authorization Code Grant flow...');

    const server = http.createServer();
    const port = await new Promise<number>((resolve, reject) => {
      server.listen(0, () => {
        const address = server.address() as AddressInfo | null;
        if (address) {
          resolve(address.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
    });

    const authUrl = this.oauth.composeAuthUrl(`${REDIRECT_URI}:${port}`);
    console.log(`Opening authorization URL: ${authUrl}`);
    await open(authUrl);

    const authCode = await new Promise<string>((resolve, reject) => {
      server.on('request', (req, res) => {
        const query = new URL(req.url!, `${REDIRECT_URI}:${port}`).searchParams;
        const code = query.get('code');
        const error = query.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`Error: ${error}`);
          reject(new Error(`Authorization error: ${error}`));
        } else if (code) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Authorization successful! You can close this window.');
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing authorization code.');
          reject(new Error('Missing authorization code.'));
        }
      });
    });

    console.log(authCode);
    server.close();

    return await this.oauth.exchangeAuthCodeForToken(authCode, `${REDIRECT_URI}:${port}`);
  }

  async loadSavedOAuthTokenData(): Promise<TokenSuccessData | null> {
    if (existsSync(this.tokenFile)) {
      const savedTokenData: SavedTokenData = readJsonSync(this.tokenFile);
      if (!savedTokenData) return null;
      const refreshTokenData = await this.oauth.refreshAccessToken(savedTokenData);
      return { ...refreshTokenData, ...savedTokenData };
    }

    return null;
  }

  async acquire(): Promise<OAuth2Client> {
    const tokenData =
      (await this.loadSavedOAuthTokenData()) || (await this.authorizeOAuthDesktop());
    writeJsonSync(this.tokenFile, tokenData);
    return this.oauth.client(tokenData);
  }
}

export const acquireAuth = async (): Promise<OAuth2Client> => new AuthAcquirer().acquire();
