import 'dotenv/config';
import assert from 'assert/strict';
import _ from 'lodash';
import { existsSync, readJsonSync, xdgConfig, xdgState } from './utils.js';

interface AuthConfiguration {
  clientId: string;
  clientSecret: string;
  tokenFile: string;
}

interface CategoriesConfiguration {
  file: string;
}

interface Conventions {
  configFileName: string;
  categoriesFileName: string;
  tokenFileName: string;
  configDir: string;
  stateDir: string;
}

class Configuration {
  public readonly auth: AuthConfiguration;
  public readonly categories: CategoriesConfiguration;
  public readonly conventions: Conventions;

  private get defaultConventions(): Partial<Conventions> {
    return {
      configFileName: 'config.json',
      categoriesFileName: 'categories.config.json',
      tokenFileName: 'OAUTH.json',
      configDir: xdgConfig && `${xdgConfig}/myti`,
      stateDir: xdgState && `${xdgState}/myti`,
    };
  }

  constructor(config: object = {}, conventions: Partial<Conventions> = {}) {
    conventions = { ...this.defaultConventions, ...conventions };
    assert(isConventions(conventions));
    this.conventions = conventions;

    const mergedConfig = _.defaultsDeep(
      { ...config },
      this.configFromEnv(),
      this.configFromFile(),
      this.configDefaults(),
    );

    assert(isAuthConfiguration(mergedConfig.auth));
    assert(isCategoriesConfiguration(mergedConfig.categories));

    this.auth = mergedConfig.auth;
    this.categories = mergedConfig.categories;
  }

  private configFromFile(): object {
    if (existsSync(this.configFile)) {
      return readJsonSync(this.configFile);
    }
    return {};
  }

  private configFromEnv(): object {
    return {
      auth: {
        clientId: process.env.MYTI_AUTH_CLIENT_ID || undefined,
        clientSecret: process.env.MYTI_AUTH_CLIENT_SECRET || undefined,
        tokenFile: process.env.MYTI_AUTH_TOKEN_FILE || undefined,
      },
      categories: {
        file: process.env.MYTI_CATEGORIES_FILE || undefined,
      },
    };
  }

  private configDefaults(): object {
    return {
      auth: {
        clientId: undefined,
        clientSecret: undefined,
        tokenFile: `${this.conventions.stateDir}/${this.conventions.tokenFileName}`,
      },
      categories: {
        file: `${this.conventions.configDir}/${this.conventions.categoriesFileName}`,
      },
    };
  }

  private get configFile(): string {
    return `${this.conventions.configDir}/${this.conventions.configFileName}`;
  }
}

function isAuthConfiguration(obj: unknown): obj is AuthConfiguration {
  if (typeof obj !== 'object' || obj === null) return false;
  const keys: Array<keyof AuthConfiguration> = ['clientId', 'clientSecret', 'tokenFile'];
  return keys.every(property => typeof (obj as AuthConfiguration)[property] === 'string');
}

function isCategoriesConfiguration(obj: unknown): obj is CategoriesConfiguration {
  if (typeof obj !== 'object' || obj === null) return false;
  const keys: Array<keyof CategoriesConfiguration> = ['file'];
  return keys.every(property => typeof (obj as CategoriesConfiguration)[property] === 'string');
}

function isConventions(obj: unknown): obj is Conventions {
  if (typeof obj !== 'object' || obj === null) return false;
  const keys: Array<keyof Conventions> = [
    'configDir',
    'stateDir',
    'tokenFileName',
    'categoriesFileName',
    'configFileName',
  ];
  return keys.every(property => typeof (obj as Conventions)[property] === 'string');
}

export default Configuration;
export type { AuthConfiguration, CategoriesConfiguration };
