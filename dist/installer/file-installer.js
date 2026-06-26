"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copySourceFile = copySourceFile;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const paths_js_1 = require("../utils/paths.js");
async function copySourceFile(itemData, filename, content, spinner) {
    const config = (0, paths_js_1.getConfig)();
    const root = (0, paths_js_1.getProjectRoot)();
    // Determine base target directory
    let baseDir = itemData.target;
    if (!baseDir) {
        if (itemData.type === "ui" && config.componentsDir) {
            baseDir = `${config.componentsDir}/ui`;
        }
        else if (itemData.type === "module" && config.modulesDir) {
            baseDir = config.modulesDir;
        }
        else if (itemData.type === "feature" && config.featuresDir) {
            baseDir = config.featuresDir;
        }
        else if (itemData.type === "section" && config.sectionsDir) {
            baseDir = config.sectionsDir;
        }
        else {
            baseDir = "src/components";
        }
    }
    // Resolve final path including subdirectory hierarchy of the file
    const targetFile = path_1.default.join(root, baseDir, filename);
    const targetDir = path_1.default.dirname(targetFile);
    if (fs_extra_1.default.existsSync(targetFile)) {
        if (spinner)
            spinner.stop();
        const relativeTarget = path_1.default.relative(root, targetFile);
        const answers = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "override",
                message: `File already exists: ${chalk_1.default.yellow(relativeTarget)}. Would you like to override it?`,
                default: false
            }
        ]);
        if (spinner)
            spinner.start();
        if (!answers.override) {
            if (spinner) {
                spinner.text = `Skipped overriding: ${relativeTarget}`;
            }
            else {
                console.log(chalk_1.default.blue(`Skipped overriding: ${relativeTarget}`));
            }
            return;
        }
    }
    // Replace default registry path aliases with custom user settings aliases
    let finalContent = content;
    if (config && config.aliases) {
        if (config.aliases.utils) {
            finalContent = finalContent.replace(/@\/lib\/utils/g, config.aliases.utils);
        }
        if (config.aliases.components && config.aliases.ui) {
            finalContent = finalContent.replace(/@\/components\/ui/g, config.aliases.ui);
        }
        else if (config.aliases.components) {
            finalContent = finalContent.replace(/@\/components/g, config.aliases.components);
        }
    }
    await fs_extra_1.default.ensureDir(targetDir);
    await fs_extra_1.default.writeFile(targetFile, finalContent);
    const relativeCreated = path_1.default.relative(root, targetFile);
    if (spinner) {
        spinner.text = `Created ${relativeCreated}`;
    }
    else {
        console.log(chalk_1.default.green(`Created ${relativeCreated}`));
    }
}
