export { default as YoutubeAdapter } from './youtube-adapter.js';
export { default as YoutubeEventer } from './youtube-eventer.js';
export { VideoCollection, Video } from './video.js';
export { default as CategoriesRegistry } from './categories-registry.js';
export { default as Configuration } from './configuration.js';

import { type AuthConfiguration } from './configuration.js';
import AuthAcquirer from './auth-acquirer.js';
import OAuthAdapter from './oauth-adapter.js';
import PersistedTokens from './persisted-tokens.js';

const interactivelyAcquireAuth = async (
  config: AuthConfiguration,
  opts?: InstanceType<typeof AuthAcquirer>['opts'],
) => {
  const acquirer = new AuthAcquirer(opts, {
    oauth: new OAuthAdapter(config.clientId, config.clientSecret),
    persistedTokens: new PersistedTokens(config.tokenFile),
  });
  return acquirer.acquire();
};

export { interactivelyAcquireAuth };
