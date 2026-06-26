"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const paths_js_1 = require("../utils/paths.js");
const registry_js_1 = require("../registry/registry.js");
function updateTsConfig(filePath) {
    if (!fs_extra_1.default.existsSync(filePath))
        return;
    try {
        let content = fs_extra_1.default.readFileSync(filePath, "utf8");
        // Check if compilerOptions exists
        if (!content.includes("compilerOptions")) {
            content = content.replace(/\{/, `{\n  "compilerOptions": {\n    "paths": {\n      "@/*": ["./src/*"]\n    }\n  },`);
        }
        else {
            // compilerOptions exists. Check if paths exists.
            const hasPaths = /"paths"\s*:\s*\{/.test(content);
            if (!hasPaths) {
                // Insert paths inside compilerOptions
                content = content.replace(/"compilerOptions"\s*:\s*\{/, `"compilerOptions": {\n    "paths": {\n      "@/*": ["./src/*"]\n    },`);
            }
            else {
                // paths exists. Check if @/* is inside it.
                const hasAlias = /"@\/\*"\s*:\s*/.test(content);
                if (!hasAlias) {
                    content = content.replace(/"paths"\s*:\s*\{/, `"paths": {\n      "@/*": ["./src/*"],`);
                }
            }
        }
        // Clean up trailing commas in objects if any
        content = content.replace(/,\s*\}/g, "\n    }");
        content = content.replace(/,\s*\]/g, "\n    ]");
        fs_extra_1.default.writeFileSync(filePath, content, "utf8");
        console.log(chalk_1.default.green(`Configured import aliases in ${path_1.default.basename(filePath)}`));
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`Failed to update ${path_1.default.basename(filePath)}: ${error.message}`));
    }
}
function updateViteConfig(root) {
    let viteConfigPath = path_1.default.join(root, "vite.config.ts");
    if (!fs_extra_1.default.existsSync(viteConfigPath)) {
        const jsPath = path_1.default.join(root, "vite.config.js");
        if (fs_extra_1.default.existsSync(jsPath)) {
            viteConfigPath = jsPath;
        }
        else {
            console.log(chalk_1.default.yellow("No vite.config.ts or vite.config.js found. Skipping Vite config configuration."));
            return;
        }
    }
    try {
        let content = fs_extra_1.default.readFileSync(viteConfigPath, "utf8");
        // Prepend path import if not present
        if (!content.includes('import path ') && !content.includes('import * as path ') && !content.includes('import path from "node:path"')) {
            content = `import path from "path";\n` + content;
        }
        // Prepend tailwindcss plugin import if not present
        if (!content.includes('"@tailwindcss/vite"') && !content.includes("'@tailwindcss/vite'")) {
            content = `import tailwindcss from "@tailwindcss/vite";\n` + content;
        }
        // Insert tailwindcss() to plugins
        const pluginsRegex = /plugins\s*:\s*\[([\s\S]*?)\]/;
        const match = content.match(pluginsRegex);
        if (match) {
            const pluginsContent = match[1];
            if (!pluginsContent.includes("tailwindcss")) {
                const separator = pluginsContent.trim() ? ", " : "";
                const updatedPlugins = `plugins: [${pluginsContent.trim()}${separator}tailwindcss()]`;
                content = content.replace(pluginsRegex, updatedPlugins);
            }
        }
        else {
            // plugins array not found, insert inside defineConfig
            const defineConfigRegex = /defineConfig\(\s*\{/;
            if (defineConfigRegex.test(content)) {
                content = content.replace(defineConfigRegex, "defineConfig({\n  plugins: [tailwindcss()],");
            }
        }
        // Insert resolve alias configuration
        if (!content.includes("resolve:") && !content.includes("resolve :")) {
            // Insert resolve block inside defineConfig
            const defineConfigRegex = /defineConfig\(\s*\{/;
            if (defineConfigRegex.test(content)) {
                content = content.replace(defineConfigRegex, `defineConfig({\n  resolve: {\n    alias: {\n      "@": path.resolve(__dirname, "./src"),\n    },\n  },`);
            }
        }
        else {
            // resolve exists. Check if alias exists.
            const aliasRegex = /alias\s*:\s*\{/;
            if (!aliasRegex.test(content)) {
                // Insert alias inside resolve
                const resolveRegex = /resolve\s*:\s*\{/;
                content = content.replace(resolveRegex, `resolve: {\n    alias: {\n      "@": path.resolve(__dirname, "./src"),\n    },`);
            }
            else {
                // alias exists. Check if "@" alias exists.
                if (!content.includes('"@"') && !content.includes("'@'")) {
                    content = content.replace(aliasRegex, `alias: {\n      "@": path.resolve(__dirname, "./src"),`);
                }
            }
        }
        fs_extra_1.default.writeFileSync(viteConfigPath, content, "utf8");
        console.log(chalk_1.default.green(`Configured tailwindcss and path aliases in ${path_1.default.basename(viteConfigPath)}`));
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`Failed to update vite config: ${error.message}`));
    }
}
exports.initCommand = new commander_1.Command()
    .name("init")
    .description("Initialize alfin config file, install Tailwind CSS, configure vite/tsconfig and setup CSS variables")
    .action(async () => {
    const root = (0, paths_js_1.getProjectRoot)();
    const configPath = path_1.default.join(root, "alfin.config.json");
    if (fs_extra_1.default.existsSync(configPath)) {
        console.log(chalk_1.default.yellow("alfin.config.json already exists."));
        return;
    }
    // Auto-detect global CSS file
    let globalCssPath = "src/index.css";
    if (fs_extra_1.default.existsSync(path_1.default.join(root, "src/index.css"))) {
        globalCssPath = "src/index.css";
    }
    else if (fs_extra_1.default.existsSync(path_1.default.join(root, "src/App.css"))) {
        globalCssPath = "src/App.css";
    }
    const localRegistryPath = "c:/Users/Admin/Desktop/Alphaware/LMS/lms-product/alfin-registry";
    const registryUrl = fs_extra_1.default.existsSync(localRegistryPath)
        ? localRegistryPath
        : "https://raw.githubusercontent.com/alphaware-vishnu/alfin-registry/refs/heads/main/";
    const defaultConfig = {
        registryUrl: registryUrl,
        componentsDir: "src/components",
        featuresDir: "src/features",
        sectionsDir: "src/sections",
        modulesDir: "src/modules",
        globalCss: globalCssPath,
        aliases: {
            components: "@/components",
            utils: "@/lib/utils",
            ui: "@/components/ui"
        }
    };
    fs_extra_1.default.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(chalk_1.default.green("Created alfin.config.json successfully."));
    // Install tailwindcss latest, @tailwindcss/vite, clsx, and tailwind-merge
    if (fs_extra_1.default.existsSync(path_1.default.join(root, "package.json"))) {
        let installCmd = "npm install";
        let installDevCmd = "npm install -D";
        if (fs_extra_1.default.existsSync(path_1.default.join(root, "pnpm-lock.yaml"))) {
            installCmd = "pnpm add";
            installDevCmd = "pnpm add -D";
        }
        else if (fs_extra_1.default.existsSync(path_1.default.join(root, "yarn.lock"))) {
            installCmd = "yarn add";
            installDevCmd = "yarn add -D";
        }
        try {
            console.log(chalk_1.default.cyan(`Installing tailwindcss and @tailwindcss/vite using ${installDevCmd.split(" ")[0]}...`));
            (0, child_process_1.execSync)(`${installDevCmd} tailwindcss @tailwindcss/vite`, { stdio: "inherit", cwd: root });
            console.log(chalk_1.default.green("Tailwind CSS dependencies installed successfully."));
            console.log(chalk_1.default.cyan(`Installing clsx and tailwind-merge using ${installCmd.split(" ")[0]}...`));
            (0, child_process_1.execSync)(`${installCmd} clsx tailwind-merge`, { stdio: "inherit", cwd: root });
            console.log(chalk_1.default.green("clsx and tailwind-merge dependencies installed successfully."));
        }
        catch (error) {
            console.log(chalk_1.default.red(`Failed to install dependencies: ${error.message}`));
        }
    }
    else {
        console.log(chalk_1.default.yellow("No package.json found. Skipping dependency installation."));
    }
    // Create src/lib/utils.ts with cn utility function
    try {
        const utilsDir = path_1.default.join(root, "src/lib");
        const utilsPath = path_1.default.join(utilsDir, "utils.ts");
        if (!fs_extra_1.default.existsSync(utilsPath)) {
            fs_extra_1.default.ensureDirSync(utilsDir);
            const utilsContent = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
            fs_extra_1.default.writeFileSync(utilsPath, utilsContent, "utf8");
            console.log(chalk_1.default.green("Created src/lib/utils.ts with cn utility function."));
        }
        else {
            console.log(chalk_1.default.yellow("src/lib/utils.ts already exists. Skipping creation."));
        }
    }
    catch (error) {
        console.log(chalk_1.default.red(`Failed to create src/lib/utils.ts: ${error.message}`));
    }
    // Configure vite.config.ts and tsconfigs
    updateViteConfig(root);
    updateTsConfig(path_1.default.join(root, "tsconfig.json"));
    updateTsConfig(path_1.default.join(root, "tsconfig.app.json"));
    try {
        console.log(chalk_1.default.cyan("Fetching theme variables from registry..."));
        const themeContent = await (0, registry_js_1.fetchThemeCss)();
        const targetCssPath = path_1.default.join(root, globalCssPath);
        await fs_extra_1.default.ensureDir(path_1.default.dirname(targetCssPath));
        let existingContent = "";
        if (fs_extra_1.default.existsSync(targetCssPath)) {
            existingContent = fs_extra_1.default.readFileSync(targetCssPath, "utf8");
        }
        // Check if variables or theme are already present to avoid double injection
        if (existingContent.includes("@theme") || existingContent.includes("--background:")) {
            console.log(chalk_1.default.yellow(`CSS variables already exist in ${globalCssPath}. Skipping setup.`));
        }
        else {
            // Append or write new content
            const separator = existingContent ? "\n\n" : "";
            fs_extra_1.default.writeFileSync(targetCssPath, existingContent + separator + themeContent);
            console.log(chalk_1.default.green(`Successfully configured CSS variables in ${globalCssPath}`));
        }
    }
    catch (error) {
        console.log(chalk_1.default.red(`Failed to setup CSS variables: ${error.message}`));
    }
    console.log(chalk_1.default.cyan("Please update the registryUrl to match your live GitHub repository raw URL if needed."));
});
