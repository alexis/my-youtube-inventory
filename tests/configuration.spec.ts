//import { jest } from '@jest/globals';
import { vi, describe, test, beforeEach, afterAll, expect } from 'vitest';
import { createHash } from 'crypto';
import Configuration from '#src/configuration.js';
import { writeJsonSync } from '#src/utils.js';

describe('Configuration Class', () => {
  const origEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...origEnv }; // reset environment before each test
  });

  afterAll(() => {
    process.env = origEnv; // restore environment after all tests
  });

  test('should throw an error if not all configuration values are set', () => {
    const configArgs = prepareConfiguration({
      envConfig: 'no',
      fileConfig: 'no',
      argConfig: {},
    });

    expect(() => {
      new Configuration(...configArgs);
    }).toThrow();
  });

  test('should use defaults when no other configuration sources exist', () => {
    const configArgs = prepareConfiguration({
      envConfig: 'no',
      fileConfig: 'no',
      argConfig: 'required_only',
      overrideConventions: { configDir: '/CONFIG-DIR', stateDir: '/STATE-DIR' },
    });

    const instance = new Configuration(...configArgs);

    expect(instance.auth.tokenFile).toBe('/STATE-DIR/OAUTH.json');
    expect(instance.categories.file).toBe('/CONFIG-DIR/categories.config.json');
  });

  test('should prioritize config file over defaults', () => {
    const configFromFile = buildConfigDict('file');
    const configArgs = prepareConfiguration({
      envConfig: 'no',
      fileConfig: configFromFile,
      argConfig: {},
    });

    const instance = new Configuration(...configArgs);

    assertConfigMatches(instance, configFromFile);
  });

  test('should prioritize env variables over config file', () => {
    const configFromEnv = buildConfigDict('env');
    const configFromFile = buildConfigDict('file');
    const configArgs = prepareConfiguration({
      envConfig: configFromEnv,
      fileConfig: configFromFile,
      argConfig: {},
    });

    const instance = new Configuration(...configArgs);

    assertConfigMatches(instance, configFromEnv);
  });

  test('should prioritize constructor arguments over everything', () => {
    const configFromEnv = buildConfigDict('env');
    const configFromFile = buildConfigDict('file');
    const configArg = buildConfigDict('arg');
    const configArgs = prepareConfiguration({
      envConfig: configFromEnv,
      fileConfig: configFromFile,
      argConfig: configArg,
    });

    const instance = new Configuration(...configArgs);

    assertConfigMatches(instance, configArg);
  });

  test('should override only provided parts of conventions', () => {
    const configArgs = prepareConfiguration({
      envConfig: 'no',
      fileConfig: 'no',
      argConfig: 'required_only',
      overrideConventions: { configDir: '/overridden' },
    });

    const instance = new Configuration(...configArgs);

    expect(instance.conventions.configDir).toBe('/overridden');
    expect(instance.conventions.stateDir).toContain('myti');
  });

  test('should only use non-empty environment variables', () => {
    const configFromEnv = buildConfigDict('env');
    configFromEnv.categories.file = '';
    configFromEnv.auth.tokenFile = '/env-config.json';

    const configArgs = prepareConfiguration({
      envConfig: configFromEnv,
      fileConfig: 'no',
      argConfig: {},
      overrideConventions: { configDir: '/CONFIG-DIR' },
    });

    const instance = new Configuration(...configArgs);

    expect(instance.auth.tokenFile).toBe('/env-config.json');
    expect(instance.categories.file).toBe('/CONFIG-DIR/categories.config.json');
  });
});

// ******************** Helper Functions ********************

function prepareConfiguration({
  envConfig,
  fileConfig,
  argConfig,
  overrideConventions = {},
}: {
  envConfig: 'no' | ReturnType<typeof buildConfigDict>;
  fileConfig: 'no' | ReturnType<typeof buildConfigDict>;
  argConfig: 'required_only' | object;
  overrideConventions?: object;
}) {
  let conventions: object;
  if (envConfig === 'no') {
    unsetConfigEnvVars();
  } else {
    setEnvVarsByConfig(envConfig);
  }

  if (fileConfig === 'no') {
    conventions = { configDir: '/CONFIG-DOESNT-EXIST-DIR' };
  } else {
    const filename = buildConfigFile(fileConfig);
    conventions = { configFileName: filename, configDir: '.' };
  }

  if (argConfig === 'required_only') {
    argConfig = { auth: { clientSecret: 'required', clientId: 'required' } };
  }

  return [argConfig, { ...conventions, ...overrideConventions }];
}

function buildConfigDict(prefix: string = '') {
  return {
    auth: {
      clientId: `${prefix}-client-id`,
      clientSecret: `${prefix}-client-secret`,
      tokenFile: `/${prefix}-dir/token`,
    },
    categories: { file: `/${prefix}-dir/categories` },
  };
}

function envVarsFromConfig(obj: ReturnType<typeof buildConfigDict>) {
  return {
    MYTI_AUTH_CLIENT_ID: obj.auth.clientId,
    MYTI_AUTH_CLIENT_SECRET: obj.auth.clientSecret,
    MYTI_AUTH_TOKEN_FILE: obj.auth.tokenFile,
    MYTI_CATEGORIES_FILE: obj.categories.file,
  };
}

function setEnvVarsByConfig(obj: ReturnType<typeof buildConfigDict>) {
  Object.assign(process.env, envVarsFromConfig(obj));
}

function unsetConfigEnvVars() {
  Object.keys(envVarsFromConfig(buildConfigDict())).forEach(key => delete process.env[key]);
}

function configFilename(obj: object) {
  const hash = createHash('sha1').update(JSON.stringify(obj)).digest('hex');
  return `tests/cache/${hash}`;
}

function buildConfigFile(obj: ReturnType<typeof buildConfigDict>) {
  const filename = configFilename(obj);
  writeJsonSync(filename, obj);
  return filename;
}

function assertConfigMatches(config: Configuration, expected: ReturnType<typeof buildConfigDict>) {
  expect(config.auth.clientId).toBe(expected.auth.clientId);
  expect(config.auth.clientSecret).toBe(expected.auth.clientSecret);
  expect(config.auth.tokenFile).toBe(expected.auth.tokenFile);
  expect(config.categories.file).toBe(expected.categories.file);
}
