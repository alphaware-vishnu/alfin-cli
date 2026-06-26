import axios from "axios";
import { getConfig } from "../utils/paths.js";
import fs from "fs-extra";
import path from "path";

function isUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

async function fetchFromRegistry(relativePath: string, isJson: boolean = false): Promise<any> {
  const config = getConfig();
  if (!config || !config.registryUrl) {
    throw new Error("Missing alfin.config.json or registryUrl. Run 'alfin init' and configure the url first.");
  }

  const cleanUrl = config.registryUrl.replace(/\/$/, "");

  if (isUrl(cleanUrl)) {
    const url = `${cleanUrl}/${relativePath}`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch ${relativePath} from ${url}: ${error.message}`);
    }
  } else {
    // Local directory path
    const localPath = path.resolve(cleanUrl, relativePath);
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found at local registry path: ${localPath}`);
    }
    try {
      if (isJson) {
        return await fs.readJSON(localPath);
      }
      return await fs.readFile(localPath, "utf8");
    } catch (error: any) {
      throw new Error(`Failed to read local registry file ${localPath}: ${error.message}`);
    }
  }
}

export async function fetchRegistryIndex() {
  return fetchFromRegistry("registry.json", true);
}

export async function fetchItemMeta(itemPath: string) {
  return fetchFromRegistry(`${itemPath}/meta.json`, true);
}

export async function fetchItemSource(itemPath: string, filename: string) {
  return fetchFromRegistry(`${itemPath}/${filename}`, false);
}

export async function fetchThemeCss() {
  return fetchFromRegistry("theme.css", false);
}

export async function fetchThemeProvider() {
  return fetchFromRegistry("theme-provider.tsx", false);
}
