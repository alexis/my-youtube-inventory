import OAuthYT from './oauth-yt.js';
import { fileExists, writeJson, readJson } from './utils.js';

const TOKEN_FILE = process.env.MYTI_TOKEN_FILE || 'OAUTH.json';
const CLIENT_ID = process.env.MYTI_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.MYTI_OAUTH_CLIENT_SECRET;
const OAUTH_SCOPE = process.env.MYTI_OAUTH_SCOPE;

class Credentials {
  static #oauthYT;

  static oauthYT() {
    if (!this.#oauthYT) {
      this.#oauthYT = new OAuthYT(CLIENT_ID, CLIENT_SECRET, OAUTH_SCOPE);
    }
    return this.#oauthYT;
  }

  static async authorizeOAuth() {
    console.log('No existing token found. Starting OAuth Device Flow...');
    const { device_code, verification_url, user_code } = await this.oauthYT().getDeviceCode();

    console.log(`Visit this URL to authorize: ${verification_url}`);
    console.log(`Enter the code: ${user_code}`);
    return await this.oauthYT().waitAndGetTokenData(device_code);
  }

  static async loadSavedOAuthTokenData() {
    if (await fileExists(TOKEN_FILE)) {
      const savedTokenData = await readJson(TOKEN_FILE);
      if (!savedTokenData) return null;
      const refreshTokenData = await this.oauthYT().refreshAccessToken(savedTokenData.refresh_token);
      return { ...refreshTokenData, ...savedTokenData };
    }

    return null;
  }

  static async acquire() {
    if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('You need to set up OAuth ');

    const tokenData = await this.loadSavedOAuthTokenData() || await this.authorizeOAuth();
    writeJson(TOKEN_FILE, tokenData);
    return this.oauthYT().client(tokenData);
  }
}

export default Credentials;
