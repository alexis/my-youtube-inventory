import { readJsonSync, writeJsonSync, existsSync } from './utils.js';
import { type TokenSuccessData } from './oauth-adapter.js';
import assert from 'assert';

interface TokensFullData extends TokenSuccessData {
  refresh_token: string;
}

class PersistedTokens {
  public tokenData?: TokensFullData;

  constructor(private tokenFile: string) {
    if (existsSync(this.tokenFile)) {
      this.tokenData = readJsonSync(this.tokenFile);
      assert(isTokensFullData(this.tokenData));
    }
  }

  exists(): this is { tokenData: TokensFullData } {
    if (!this.tokenData) return false;

    return true;
  }

  writeTokenData(tokenData: TokenSuccessData) {
    assert(isTokensFullData(tokenData));
    this.tokenData = tokenData;
    writeJsonSync(this.tokenFile, tokenData);
  }
}

function isTokensFullData(response: unknown): response is TokensFullData {
  if (typeof response !== 'object' || response === null) return false;

  const keys: Array<keyof TokensFullData> = [
    'refresh_token',
    'access_token',
    'expires_in',
    'scope',
    'token_type',
  ];
  return keys.every(property => property in response);
}

export default PersistedTokens;
export type { TokensFullData as SavedTokenData };
