import fsp from "fs/promises";
import readline from "readline";
export { readFile, writeFile } from "fs/promises";

export const sleep = async (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const fileExists = async (filePath) => {
  return fsp.access(filePath)
    .then(() => true)
    .catch(() => false);
};

export const readJson = async (filePath) => {
  return fsp.readFile(filePath).then((x) => JSON.parse(x)).catch(() => null);
};

export const writeJson = async (filePath, data) => {
  return fsp.writeFile(filePath, JSON.stringify(data, null, 2));
};

export const escapeNL = (input) => {
  return input
    .replace(/\\n/g, "\\\\n")
    .replace(/\n/g, "\\n");
};

export const restoreNL = (escapedInput) => {
  return escapedInput
    .replace(/\\n/g, "\n")
    .replace(/\\\\n/g, "\\n");
};
