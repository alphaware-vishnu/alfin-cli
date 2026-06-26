import path from "path";
import fs from "fs-extra";

export function getProjectRoot(): string {
  return process.cwd();
}

export function getConfig(): any {
  const root = getProjectRoot();
  const configPath = path.join(root, "alfin.config.json");
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
  return null;
}
