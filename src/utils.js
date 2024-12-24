import fsp from 'fs/promises';
import readline from 'readline';
export { readFile, writeFile } from 'fs/promises';

export const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fileExists = async (filePath) => {
  return fsp.access(filePath)
    .then(() => true)
    .catch(() => false);
};

export const readJson = async (filePath) => {
  return fsp.readFile(filePath).then(x => JSON.parse(x)).catch(() => null);
};

export const writeJson = async (filePath, data) => {
  return fsp.writeFile(filePath, JSON.stringify(data, null, 2));
};

export function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
export const readClipboardSync = () => clipboard.readSync();
