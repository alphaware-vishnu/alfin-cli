"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyThemeCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const paths_js_1 = require("../utils/paths.js");
const registry_js_1 = require("../registry/registry.js");
const add_js_1 = require("./add.js");
exports.applyThemeCommand = new commander_1.Command()
    .name("apply-theme")
    .description("Install theme provider and apply it to App.tsx")
    .action(async () => {
    const root = (0, paths_js_1.getProjectRoot)();
    const configPath = path_1.default.join(root, "alfin.config.json");
    if (!fs_extra_1.default.existsSync(configPath)) {
        console.error(chalk_1.default.red("alfin.config.json not found. Run 'alfin init' first."));
        process.exit(1);
    }
    // Prompt user if they want to install appearance settings too
    const answer = await inquirer_1.default.prompt([
        {
            type: "confirm",
            name: "addAppearance",
            message: "Would you like to install the Appearance settings page as well?",
            default: true,
        }
    ]);
    const spinner = (await import("ora")).default("Fetching ThemeProvider from registry...").start();
    try {
        // 1. Download and write theme-provider.tsx to src/contexts/
        const themeProviderContent = await (0, registry_js_1.fetchThemeProvider)();
        const contextsDir = path_1.default.join(root, "src", "contexts");
        await fs_extra_1.default.ensureDir(contextsDir);
        const themeProviderPath = path_1.default.join(contextsDir, "theme-provider.tsx");
        await fs_extra_1.default.writeFile(themeProviderPath, themeProviderContent, "utf8");
        spinner.text = "Created src/contexts/theme-provider.tsx";
        // 2. Find and wrap App.tsx
        const appPath = path_1.default.join(root, "src", "App.tsx");
        if (!fs_extra_1.default.existsSync(appPath)) {
            spinner.warn("src/App.tsx not found. Theme provider written, but not applied to App.tsx.");
        }
        else {
            spinner.text = "Applying ThemeProvider wrapping in src/App.tsx...";
            const appContent = await fs_extra_1.default.readFile(appPath, "utf8");
            if (appContent.includes("ThemeProvider") && appContent.includes("vite-theme-ui")) {
                spinner.text = "ThemeProvider is already configured in src/App.tsx.";
            }
            else {
                // Read configuration to check if aliases are used
                const config = await fs_extra_1.default.readJSON(configPath);
                let importPath = "./contexts/theme-provider";
                if (config.aliases && config.aliases.components) {
                    importPath = "@/contexts/theme-provider";
                }
                const importStatement = `import { ThemeProvider } from "${importPath}";\n`;
                let updatedContent = importStatement + appContent;
                const returnIndex = updatedContent.lastIndexOf("return (");
                if (returnIndex !== -1) {
                    const beforeReturn = updatedContent.substring(0, returnIndex + 8);
                    const afterReturn = updatedContent.substring(returnIndex + 8);
                    let closingIndex = afterReturn.lastIndexOf(");");
                    let suffix = ");";
                    if (closingIndex === -1) {
                        closingIndex = afterReturn.lastIndexOf(")");
                        suffix = ")";
                    }
                    if (closingIndex !== -1) {
                        const innerContent = afterReturn.substring(0, closingIndex);
                        const afterClosing = afterReturn.substring(closingIndex);
                        updatedContent = beforeReturn +
                            `\n      <ThemeProvider defaultTheme="light" storageKey="vite-theme-ui">\n` +
                            innerContent +
                            `\n      </ThemeProvider>\n    ` +
                            afterClosing;
                        await fs_extra_1.default.writeFile(appPath, updatedContent, "utf8");
                        spinner.text = "Successfully installed ThemeProvider and wrapped src/App.tsx.";
                    }
                    else {
                        spinner.warn("Failed to find the closing return statement in src/App.tsx.");
                    }
                }
                else {
                    spinner.warn("Failed to find the return statement in src/App.tsx.");
                }
            }
        }
        // 3. Install appearance module if requested
        if (answer.addAppearance) {
            spinner.text = "Fetching registry index...";
            const registry = await (0, registry_js_1.fetchRegistryIndex)();
            spinner.text = "Installing appearance settings module...";
            await (0, add_js_1.installItem)("appearance", registry, spinner);
            spinner.succeed("Successfully installed ThemeProvider, wrapped App.tsx, and added Appearance settings.");
        }
        else {
            spinner.succeed("Successfully installed ThemeProvider and wrapped App.tsx.");
        }
    }
    catch (error) {
        spinner.fail(`Failed to apply theme: ${error.message}`);
    }
});
