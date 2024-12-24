import { OAuth2Client } from "google-auth-library";
import { sleep } from "./utils.js";

const DEVICE_CODE_URL = "https://oauth2.googleapis.com/device/code";
const TOKEN_URL = "https://www.youtube.com/o/oauth2/token";

class OAuthYT {
  constructor(
    clientId,
    clientSecret,
    oauthScope = "https://www.googleapis.com/auth/youtube.readonly",
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.oauthScope = oauthScope;
  }

  async getDeviceCode() {
    const response = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: this.oauthScope,
        device_id: crypto.randomUUID(),
        device_model: "MYTI",
      }),
    });
    if (!response.ok) {
      throw new Error(`Error fetching device code: ${response.statusText}`);
    }
    return response.json();
  }

  async waitAndGetTokenData(deviceCode) {
    while (true) {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      const result = await response.json();

      if (result.error === "authorization_pending") {
        await sleep(5000);
        continue;
      }
      if (result.error) {
        throw new Error(`Error fetching access token: ${result.error}`);
      }

      return result;
    }
  }

  async refreshAccessToken(refreshToken) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(`Error refreshing token: ${result.error}`);
    }

    return result;
  }

  client(tokenData) {
    const client = new OAuth2Client(this.clientId, this.clientSecret);
    client.setCredentials(tokenData);
    return client;
  }
}

export default OAuthYT;
