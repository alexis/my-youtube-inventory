import fs from 'fs';

export { existsSync } from 'fs';
export { xdgState, xdgConfig } from 'xdg-basedir';

export const sleep = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const readJsonSync = (filePath: string) => {
  return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }));
};

export const writeJsonSync = (filePath: string, data: unknown) => {
  return fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
