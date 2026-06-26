"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRegistryIndex = fetchRegistryIndex;
exports.fetchItemMeta = fetchItemMeta;
exports.fetchItemSource = fetchItemSource;
exports.fetchThemeCss = fetchThemeCss;
exports.fetchThemeProvider = fetchThemeProvider;
const axios_1 = __importDefault(require("axios"));
const paths_js_1 = require("../utils/paths.js");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function isUrl(str) {
    return str.startsWith("http://") || str.startsWith("https://");
}
async function fetchFromRegistry(relativePath, isJson = false) {
    const config = (0, paths_js_1.getConfig)();
    if (!config || !config.registryUrl) {
        throw new Error("Missing alfin.config.json or registryUrl. Run 'alfin init' and configure the url first.");
    }
    const cleanUrl = config.registryUrl.replace(/\/$/, "");
    if (isUrl(cleanUrl)) {
        const url = `${cleanUrl}/${relativePath}`;
        try {
            const response = await axios_1.default.get(url);
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch ${relativePath} from ${url}: ${error.message}`);
        }
    }
    else {
        // Local directory path
        const localPath = path_1.default.resolve(cleanUrl, relativePath);
        if (!fs_extra_1.default.existsSync(localPath)) {
            throw new Error(`File not found at local registry path: ${localPath}`);
        }
        try {
            if (isJson) {
                return await fs_extra_1.default.readJSON(localPath);
            }
            return await fs_extra_1.default.readFile(localPath, "utf8");
        }
        catch (error) {
            throw new Error(`Failed to read local registry file ${localPath}: ${error.message}`);
        }
    }
}
async function fetchRegistryIndex() {
    return fetchFromRegistry("registry.json", true);
}
async function fetchItemMeta(itemPath) {
    return fetchFromRegistry(`${itemPath}/meta.json`, true);
}
async function fetchItemSource(itemPath, filename) {
    return fetchFromRegistry(`${itemPath}/${filename}`, false);
}
async function fetchThemeCss() {
    return fetchFromRegistry("theme.css", false);
}
async function fetchThemeProvider() {
    return fetchFromRegistry("theme-provider.tsx", false);
}
