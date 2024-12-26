import OAuthYT from "./oauth-yt.js";
import { fileExists, readJson, writeJson } from "./utils.js";

const TOKEN_FILE = process.env.MYTI_TOKEN_FILE || "OAUTH.json";
const CLIENT_ID = process.env.MYTI_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.MYTI_OAUTH_CLIENT_SECRET;
const OAUTH_SCOPE = process.env.MYTI_OAUTH_SCOPE;

class AuthAcquirer {
  constructor() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error("You need to set up OAuth ");
    }

    this.oauthYT = new OAuthYT(CLIENT_ID, CLIENT_SECRET, OAUTH_SCOPE);
    this.tokenFile = TOKEN_FILE;
  }

  async authorizeOAuth() {
    console.log("No existing token found. Starting OAuth Device Flow...");
    const { device_code, verification_url, user_code } = await this.oauthYT
      .getDeviceCode();

    console.log(`Visit this URL to authorize: ${verification_url}`);
    console.log(`Enter the code: ${user_code}`);
    return await this.oauthYT.waitAndGetTokenData(device_code);
  }

  async loadSavedOAuthTokenData() {
    if (await fileExists(this.tokenFile)) {
      const savedTokenData = await readJson(this.tokenFile);
      if (!savedTokenData) return null;
      const refreshTokenData = await this.oauthYT.refreshAccessToken(
        savedTokenData.refresh_token,
      );
      return { ...refreshTokenData, ...savedTokenData };
    }

    return null;
  }

  async acquire() {
    const tokenData = await this.loadSavedOAuthTokenData() ||
      await this.authorizeOAuth();
    writeJson(this.tokenFile, tokenData);
    return this.oauthYT.client(tokenData);
  }
}

export const acquireAuth = async () => new AuthAcquirer().acquire();
