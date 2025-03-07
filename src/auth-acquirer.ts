import OAuthAdapter, { type TokenSuccessData, type OAuth2Client } from './oauth-adapter.js';
import PersistedTokens from './persisted-tokens.js';
import http from 'http';
import open from 'open';
import { URL } from 'url';
import { type AddressInfo } from 'net';

const REDIRECT_URI = `http://localhost`;

class AuthAcquirer {
  private oauth: OAuthAdapter;
  private persistedTokens: PersistedTokens;
  public opts: { openUrl: boolean; webhookPort?: number; deviceFlow?: boolean };

  constructor(
    opts: typeof this.opts = { openUrl: true },
    deps: { oauth: OAuthAdapter; persistedTokens: PersistedTokens },
  ) {
    this.oauth = deps.oauth;
    this.persistedTokens = deps.persistedTokens;
    this.opts = opts;
  }

  private async authorizeOAuthDevice(): Promise<TokenSuccessData> {
    console.log('No existing token found. Starting OAuth Device Flow...');
    const deviceCodeData = await this.oauth.getDeviceCode();

    console.log(`Visit this URL to authorize: ${deviceCodeData.verification_url}`);
    console.log(`Enter the code: ${deviceCodeData.user_code}`);
    return await this.oauth.waitAndGetTokenData(deviceCodeData);
  }

  private async authorizeOAuthDesktop(): Promise<TokenSuccessData> {
    console.log('No existing token found. Starting OAuth Authorization Code Grant flow...');

    const server = http.createServer();
    const port = await new Promise<number>((resolve, reject) => {
      server.listen(this.opts.webhookPort || 0, () => {
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
    if (this.opts.openUrl) await open(authUrl);

    const authCode = await new Promise<string>((resolve, reject) => {
      server.on('request', (req, res) => {
        const query = new URL(req.url!, `${REDIRECT_URI}:${port}`).searchParams;
        const code = query.get('code');
        const error = query.get('error');

        // TODO: support and catch timeout
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

    server.close();

    return await this.oauth.exchangeAuthCodeForToken(authCode, `${REDIRECT_URI}:${port}`);
  }

  private async loadSavedOAuthTokenData(): Promise<TokenSuccessData | null> {
    if (this.persistedTokens.exists()) {
      const savedTokenData = this.persistedTokens.tokenData;
      const refreshTokenData = await this.oauth.refreshAccessToken(savedTokenData);
      return { ...refreshTokenData, ...savedTokenData };
    }

    return null;
  }

  async acquire(): Promise<OAuth2Client> {
    const authorize = this.opts.deviceFlow ? this.authorizeOAuthDevice : this.authorizeOAuthDesktop;
    const tokenData = (await this.loadSavedOAuthTokenData()) || (await authorize.call(this));
    this.persistedTokens.writeTokenData(tokenData);
    return this.oauth.oauthClient(tokenData);
  }
}

export default AuthAcquirer;
