import fs from "fs";

export const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const existsSync = (filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

export const readJsonSync = (filePath: string) => {
  return JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
};

export const writeJsonSync = (filePath: string, data: unknown) => {
  return fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
