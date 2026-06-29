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
const inquirer_1 = __importDefault(require("inquirer"));
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
function updateMainTsx(root) {
    let mainPath = path_1.default.join(root, "src/main.tsx");
    if (!fs_extra_1.default.existsSync(mainPath)) {
        const alternativePaths = [
            "src/main.jsx",
            "src/index.tsx",
            "src/index.jsx",
            "src/main.ts",
            "src/index.ts"
        ];
        for (const alt of alternativePaths) {
            const p = path_1.default.join(root, alt);
            if (fs_extra_1.default.existsSync(p)) {
                mainPath = p;
                break;
            }
        }
    }
    if (!fs_extra_1.default.existsSync(mainPath)) {
        console.log(chalk_1.default.yellow("No main/index entry file found. Skipping wrap."));
        return;
    }
    try {
        let content = fs_extra_1.default.readFileSync(mainPath, "utf8");
        const hasQueryClientProvider = content.includes("QueryClientProvider");
        const hasBrowserRouter = content.includes("BrowserRouter");
        // 1. Add imports if missing
        let importsToAdd = "";
        if (!content.includes("@tanstack/react-query")) {
            importsToAdd += `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";\n`;
        }
        if (!content.includes("react-router-dom")) {
            importsToAdd += `import { BrowserRouter } from "react-router-dom";\n`;
        }
        if (importsToAdd) {
            content = importsToAdd + content;
        }
        // 2. Add queryClient instantiation if missing
        if (!content.includes("new QueryClient(")) {
            // Create queryClient before createRoot or render
            const insertionIndex = content.indexOf("createRoot") !== -1
                ? content.indexOf("createRoot")
                : (content.indexOf("ReactDOM.render") !== -1 ? content.indexOf("ReactDOM.render") : -1);
            if (insertionIndex !== -1) {
                // find start of the line or just insert before it
                const startOfLine = content.lastIndexOf("\n", insertionIndex) + 1;
                content = content.slice(0, startOfLine) + "const queryClient = new QueryClient();\n\n" + content.slice(startOfLine);
            }
            else {
                // Fallback insertion point
                const importsEndIndex = content.lastIndexOf("import ");
                if (importsEndIndex !== -1) {
                    const endOfLine = content.indexOf("\n", importsEndIndex) + 1;
                    content = content.slice(0, endOfLine) + "\nconst queryClient = new QueryClient();\n" + content.slice(endOfLine);
                }
                else {
                    content = "const queryClient = new QueryClient();\n\n" + content;
                }
            }
        }
        // 3. Wrap <App /> (or whatever JSX is inside the render / createRoot)
        if (!hasQueryClientProvider || !hasBrowserRouter) {
            const appMatch = content.match(/<App\s*\/?>/);
            if (appMatch) {
                const originalApp = appMatch[0];
                let wrappedApp = originalApp;
                if (!hasBrowserRouter) {
                    wrappedApp = `<BrowserRouter>\n        ${wrappedApp}\n      </BrowserRouter>`;
                }
                if (!hasQueryClientProvider) {
                    wrappedApp = `<QueryClientProvider client={queryClient}>\n      ${wrappedApp}\n    </QueryClientProvider>`;
                }
                content = content.replace(originalApp, wrappedApp);
            }
            else {
                console.log(chalk_1.default.yellow("Could not automatically locate '<App />' in main entry file. Please wrap manually."));
            }
        }
        fs_extra_1.default.writeFileSync(mainPath, content, "utf8");
        console.log(chalk_1.default.green(`Wrapped entry file ${path_1.default.basename(mainPath)} in QueryClientProvider and BrowserRouter`));
    }
    catch (error) {
        console.log(chalk_1.default.red(`Failed to update main entry file: ${error.message}`));
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
    // Prompt for logo
    let logoPathInput = "";
    try {
        const logoAnswer = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "logoPath",
                message: "Enter path to logo image (press enter for default her.png from Vite):",
                default: ""
            }
        ]);
        logoPathInput = logoAnswer.logoPath.trim();
    }
    catch (e) {
        console.log(chalk_1.default.yellow(`Failed to prompt for logo: ${e.message}`));
    }
    const assetsDir = path_1.default.join(root, "src/assets");
    await fs_extra_1.default.ensureDir(assetsDir);
    const targetLogoPath = path_1.default.join(assetsDir, "alfin-logo.jpg");
    if (logoPathInput) {
        const resolvedLogoPath = path_1.default.isAbsolute(logoPathInput) ? logoPathInput : path_1.default.join(root, logoPathInput);
        if (fs_extra_1.default.existsSync(resolvedLogoPath)) {
            try {
                await fs_extra_1.default.copy(resolvedLogoPath, targetLogoPath);
                console.log(chalk_1.default.green(`Successfully copied custom logo to ${path_1.default.relative(root, targetLogoPath)}`));
            }
            catch (copyErr) {
                console.log(chalk_1.default.red(`Failed to copy custom logo: ${copyErr.message}`));
            }
        }
        else {
            console.log(chalk_1.default.yellow(`Logo file not found at: ${resolvedLogoPath}. Falling back to default.`));
            logoPathInput = ""; // Trigger default fallback
        }
    }
    if (!logoPathInput) {
        // Look for her.png under project directory
        let sourceLogoPath = "";
        const searchPaths = [
            path_1.default.join(root, "src/assets/her.png"),
            path_1.default.join(root, "public/her.png"),
            path_1.default.join(root, "her.png"),
        ];
        for (const p of searchPaths) {
            if (fs_extra_1.default.existsSync(p)) {
                sourceLogoPath = p;
                break;
            }
        }
        if (sourceLogoPath) {
            try {
                await fs_extra_1.default.copy(sourceLogoPath, targetLogoPath);
                console.log(chalk_1.default.green(`Copied default ${path_1.default.basename(sourceLogoPath)} to ${path_1.default.relative(root, targetLogoPath)}`));
            }
            catch (copyErr) {
                console.log(chalk_1.default.red(`Failed to copy default logo: ${copyErr.message}`));
            }
        }
        else {
            // Fallback to copying vite.svg or react.svg or creating a small dummy placeholder
            const viteSvg = path_1.default.join(root, "public/vite.svg");
            const reactSvg = path_1.default.join(root, "src/assets/react.svg");
            if (fs_extra_1.default.existsSync(viteSvg)) {
                try {
                    await fs_extra_1.default.copy(viteSvg, targetLogoPath);
                    console.log(chalk_1.default.green(`Copied public/vite.svg as default logo to ${path_1.default.relative(root, targetLogoPath)}`));
                }
                catch (err) {
                    console.log(chalk_1.default.red(`Failed to copy vite.svg: ${err.message}`));
                }
            }
            else if (fs_extra_1.default.existsSync(reactSvg)) {
                try {
                    await fs_extra_1.default.copy(reactSvg, targetLogoPath);
                    console.log(chalk_1.default.green(`Copied src/assets/react.svg as default logo to ${path_1.default.relative(root, targetLogoPath)}`));
                }
                catch (err) {
                    console.log(chalk_1.default.red(`Failed to copy react.svg: ${err.message}`));
                }
            }
            else {
                // Write a dummy base64 1x1 png image
                const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
                try {
                    await fs_extra_1.default.writeFile(targetLogoPath, Buffer.from(dummyBase64, 'base64'));
                    console.log(chalk_1.default.green(`Created placeholder logo at ${path_1.default.relative(root, targetLogoPath)}`));
                }
                catch (err) {
                    console.log(chalk_1.default.red(`Failed to create placeholder logo: ${err.message}`));
                }
            }
        }
    }
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
            console.log(chalk_1.default.cyan(`Installing @tanstack/react-query, react-router-dom, and tw-animate-css using ${installCmd.split(" ")[0]}...`));
            (0, child_process_1.execSync)(`${installCmd} @tanstack/react-query react-router-dom tw-animate-css`, { stdio: "inherit", cwd: root });
            console.log(chalk_1.default.green("@tanstack/react-query, react-router-dom, and tw-animate-css dependencies installed successfully."));
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
    updateMainTsx(root);
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
