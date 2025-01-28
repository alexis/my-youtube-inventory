export { default as YouTube } from './youtube.js';
export { VideoCollection, Video } from './video.js';
export { default as CategoriesRegistry } from '#src/categories-registry.js';
export { default as Configuration } from '#src/configuration.js';

import { AuthConfiguration } from '#src/configuration.js';
import AuthAcquirer from './auth-acquirer.js';
import OAuthAdapter from '#src/oauth-adapter.js';
import PersistedTokens from '#src/persisted-tokens.js';

const acquireAuth = async (
  config: AuthConfiguration,
  opts?: InstanceType<typeof AuthAcquirer>['opts'],
) => {
  const acquirer = new AuthAcquirer(opts, {
    oauth: new OAuthAdapter(config.clientId, config.clientSecret),
    persistedTokens: new PersistedTokens(config.tokenFile),
  });
  return acquirer.acquire();
};

export { acquireAuth };
