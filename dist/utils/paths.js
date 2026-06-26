"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectRoot = getProjectRoot;
exports.getConfig = getConfig;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
function getProjectRoot() {
    return process.cwd();
}
function getConfig() {
    const root = getProjectRoot();
    const configPath = path_1.default.join(root, "alfin.config.json");
    if (fs_extra_1.default.existsSync(configPath)) {
        return JSON.parse(fs_extra_1.default.readFileSync(configPath, "utf8"));
    }
    return null;
}
