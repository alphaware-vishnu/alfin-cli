"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCommand = void 0;
exports.installItem = installItem;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const registry_js_1 = require("../registry/registry.js");
const dependency_installer_js_1 = require("../installer/dependency-installer.js");
const file_installer_js_1 = require("../installer/file-installer.js");
const installedItems = new Set();
async function installItem(itemName, registry, spinner) {
    if (installedItems.has(itemName)) {
        return;
    }
    let itemPath = null;
    // Find the item in the registry
    for (const [category, items] of Object.entries(registry)) {
        if (items[itemName]) {
            itemPath = items[itemName].path;
            break;
        }
    }
    if (!itemPath) {
        throw new Error(`Item '${itemName}' not found in registry index.`);
    }
    // Handle env key prompt for interceptors
    let envKeyReplacement = null;
    if (itemName === "LMS" || itemName === "SETTINGS") {
        spinner.stop();
        const defaultValue = itemName === "LMS" ? "VITE_LMS_BASE_API" : "VITE_LMS_SETTINGS_API";
        const answer = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "envKey",
                message: `Which env key would you like to use as the ${itemName} base URL?`,
                default: defaultValue,
            }
        ]);
        spinner.start();
        envKeyReplacement = {
            placeholder: defaultValue,
            value: answer.envKey
        };
    }
    spinner.text = `Fetching metadata for ${itemName}...`;
    const meta = await (0, registry_js_1.fetchItemMeta)(itemPath);
    // 1. Install Registry Dependencies first recursively
    if (meta.registryDependencies && meta.registryDependencies.length > 0) {
        for (const depName of meta.registryDependencies) {
            spinner.text = `Resolving registry dependency: ${depName}...`;
            await installItem(depName, registry, spinner);
        }
    }
    // 2. Download files for the item
    const files = meta.files && meta.files.length > 0
        ? meta.files
        : [`${itemName}.tsx`];
    for (const file of files) {
        spinner.text = `Downloading ${file} for ${itemName}...`;
        let sourceContent = await (0, registry_js_1.fetchItemSource)(itemPath, file);
        if (envKeyReplacement) {
            sourceContent = sourceContent.replace(new RegExp(envKeyReplacement.placeholder, "g"), envKeyReplacement.value);
        }
        await (0, file_installer_js_1.copySourceFile)(meta, file, sourceContent, spinner);
    }
    // 3. Install NPM package dependencies
    if (meta.dependencies && meta.dependencies.length > 0) {
        spinner.text = `Installing npm package dependencies for ${itemName}...`;
        (0, dependency_installer_js_1.installDependencies)(meta.dependencies);
    }
    installedItems.add(itemName);
}
function enableFeatureInHeader(content, feature) {
    let updated = content;
    if (feature === "theme") {
        updated = updated.replace(/\/\/ \{ALFIN_IMPORT_THEME_TOGGLE\}/g, 'import { ThemeToggle } from "./components/theme-toggle";');
        updated = updated.replace(/\{\/\* \{ALFIN_RENDER_THEME_TOGGLE\} \*\/\}/g, "<ThemeToggle />");
    }
    else if (feature === "notifications") {
        updated = updated.replace(/\/\/ \{ALFIN_IMPORT_NOTIFICATIONS\}/g, 'import { NotificationsBell } from "./components/notifications-bell";');
        updated = updated.replace(/\{\/\* \{ALFIN_RENDER_NOTIFICATIONS\} \*\/\}/g, "<NotificationsBell />");
    }
    else if (feature === "profile") {
        updated = updated.replace(/\/\/ \{ALFIN_IMPORT_PROFILE\}/g, 'import { ProfileDropdown } from "./components/profile-dropdown";');
        updated = updated.replace(/\{\/\* \{ALFIN_RENDER_PROFILE\} \*\/\}/g, "<ProfileDropdown onToggleOriginationTasks={onToggleOriginationTasks} />");
    }
    else if (feature === "product-select") {
        updated = updated.replace(/\/\/ \{ALFIN_IMPORT_PRODUCT_SELECT\}/g, 'import { ProductSelect } from "./components/product-select";');
        updated = updated.replace(/\{\/\* \{ALFIN_RENDER_PRODUCT_SELECT\} \*\/\}/g, "<ProductSelect />");
    }
    return updated;
}
const SIDEBAR_SECTIONS_MAPPING = {
    "Client Onboarding": {
        placeholderKey: "CLIENT_ONBOARD",
        configKey: "client-onboard",
        modules: ["application-form"],
        routes: ["client-onboard-routes", "company-bank-routes", "partner-routes"]
    },
    "User Management": {
        placeholderKey: "USER_MANAGEMENT",
        configKey: "user-management",
        modules: ["user-master", "role-master", "maker-checker", "branch-master", "system-resource", "system-group", "system-permission", "system-role"],
        routes: ["users-routes", "branch-routes", "group-routes", "system-group-routes", "system-permission-routes", "system-resource-routes", "maker-checker-routes"]
    },
    "Product Configuration": {
        placeholderKey: "PRODUCT_CONFIGURATION",
        configKey: "product-configuration",
        modules: ["product-scheme", "charges"],
        routes: ["product-routes", "scheme-routes", "charge-routes"]
    },
    "KYC Management": {
        placeholderKey: "KYC_MANAGEMENT",
        configKey: "kyc-management",
        modules: ["documents-master", "scorecard", "threshold"],
        routes: ["document-category-routes", "document-type-routes", "score-card-routes", "threshold-routes"]
    },
    "Loan Settings": {
        placeholderKey: "LOAN_SETTINGS",
        configKey: "loan-settings",
        modules: ["tax-rates", "estamp", "enach", "allocation-strategy"],
        routes: ["tax-rate-routes", "estamp-routes", "enach-routes", "allocation-strategy-routes"]
    },
    "Form Builder": {
        placeholderKey: "FORM_BUILDER",
        configKey: "form-builder",
        modules: ["form-builder"],
        routes: []
    },
    "Email Notification": {
        placeholderKey: "EMAIL_NOTIFICATION",
        configKey: "email-notification",
        modules: [],
        routes: ["email-editor-routes"]
    },
    "Automation": {
        placeholderKey: "AUTOMATION",
        configKey: "automation",
        modules: ["model-config", "questionary"],
        routes: ["model-configuration-routes", "questionary-routes"]
    },
    "Appearance": {
        placeholderKey: "APPEARANCE",
        configKey: "appearance",
        modules: ["appearance"],
        routes: ["appearance-routes"]
    }
};
exports.addCommand = new commander_1.Command()
    .name("add")
    .description("Add an item or category from the registry")
    .argument("<item>", "The name of the item or category to add")
    .option("--single <code>", "Add only a single specific interceptor/feature")
    .option("--feature <name>", "Add a specific feature/component to the layout")
    .action(async (itemName, options) => {
    const spinner = (0, ora_1.default)(`Fetching registry index...`).start();
    try {
        const registry = await (0, registry_js_1.fetchRegistryIndex)();
        installedItems.clear(); // Reset set
        const normItemName = itemName.toLowerCase().replace("-", "");
        // If adding 'sidebar-items' / 'sidebaritems'
        if (normItemName === "sidebaritems" || normItemName === "sidebaritem") {
            const fs = await import("fs-extra");
            const path = await import("path");
            const { getProjectRoot } = await import("../utils/paths.js");
            const configFilePath = path.default.join(getProjectRoot(), "src/components/sidebar.config.ts");
            if (!fs.default.existsSync(configFilePath)) {
                throw new Error("Root layout is missing. Please run 'alfin add root-layout' first.");
            }
            spinner.stop();
            // Read existing config to check which sections are active
            let sidebarContent = await fs.default.readFile(configFilePath, "utf8");
            const choices = Object.keys(SIDEBAR_SECTIONS_MAPPING);
            const preChecked = [];
            for (const [name, meta] of Object.entries(SIDEBAR_SECTIONS_MAPPING)) {
                const placeholder = `// {ALFIN_SIDEBAR_${meta.placeholderKey}}`;
                if (!sidebarContent.includes(placeholder)) {
                    preChecked.push(name);
                }
            }
            // Prompt user with checkboxes
            const answers = await inquirer_1.default.prompt([
                {
                    type: "checkbox",
                    name: "sections",
                    message: "Select settings sidebar sections to enable:",
                    choices: choices,
                    default: preChecked
                }
            ]);
            spinner.start();
            const selectedSections = answers.sections;
            // Enable newly selected, and disable newly unselected
            for (const [name, meta] of Object.entries(SIDEBAR_SECTIONS_MAPPING)) {
                const placeholder = `// {ALFIN_SIDEBAR_${meta.placeholderKey}}`;
                const isSelected = selectedSections.includes(name);
                const wasSelected = preChecked.includes(name);
                if (isSelected) {
                    sidebarContent = sidebarContent.replace(new RegExp(placeholder, "g"), `sidebarSettingsItemsMap["${meta.configKey}"],`);
                    // Trigger automatic installation of mapped modules & routes
                    if (!wasSelected && (meta.modules.length > 0 || meta.routes.length > 0)) {
                        spinner.text = `Installing items for ${name}...`;
                        for (const mod of meta.modules) {
                            await installItem(mod, registry, spinner);
                        }
                        for (const rte of meta.routes) {
                            await installItem(rte, registry, spinner);
                        }
                    }
                }
                else {
                    const enabledRef = `sidebarSettingsItemsMap["${meta.configKey}"],`;
                    sidebarContent = sidebarContent.replace(new RegExp(enabledRef, "g"), placeholder);
                }
            }
            await fs.default.writeFile(configFilePath, sidebarContent, "utf8");
            spinner.succeed("Successfully updated settings sidebar sections and component dependencies.");
            return;
        }
        // If adding 'root-layout' / 'rootlayout'
        if (normItemName === "rootlayout") {
            let feature = (options.feature || options.single)?.toLowerCase();
            if (feature) {
                if (feature === "notification" || feature === "notifications")
                    feature = "notifications";
                if (feature === "theme" || feature === "theme-toggle" || feature === "themetoggle")
                    feature = "theme";
                if (feature === "profile" || feature === "profile-dropdown" || feature === "profiledropdown")
                    feature = "profile";
                if (feature === "product-select" || feature === "productselect" || feature === "product")
                    feature = "product-select";
                const validFeatures = ["theme", "notifications", "profile", "product-select"];
                if (!validFeatures.includes(feature)) {
                    throw new Error(`Invalid feature '${feature}'. Expected one of: ${validFeatures.join(", ")}`);
                }
                spinner.text = `Adding layout feature '${feature}'...`;
                let itemPath = "layouts/root-layout";
                const meta = await (0, registry_js_1.fetchItemMeta)(itemPath);
                let filename = "";
                if (feature === "theme")
                    filename = "components/theme-toggle.tsx";
                else if (feature === "notifications")
                    filename = "components/notifications-bell.tsx";
                else if (feature === "profile")
                    filename = "components/profile-dropdown.tsx";
                else if (feature === "product-select")
                    filename = "components/product-select.tsx";
                spinner.text = `Downloading ${filename}...`;
                const sourceContent = await (0, registry_js_1.fetchItemSource)(itemPath, filename);
                await (0, file_installer_js_1.copySourceFile)(meta, filename, sourceContent, spinner);
                const fs = await import("fs-extra");
                const path = await import("path");
                const { getProjectRoot } = await import("../utils/paths.js");
                const headerPath = path.default.join(getProjectRoot(), meta.target || "src/components/layouts/root-layout", "header.tsx");
                if (fs.default.existsSync(headerPath)) {
                    spinner.text = `Enabling feature '${feature}' in header.tsx...`;
                    let headerContent = await fs.default.readFile(headerPath, "utf8");
                    headerContent = enableFeatureInHeader(headerContent, feature);
                    await fs.default.writeFile(headerPath, headerContent, "utf8");
                    console.log(chalk_1.default.green(`Updated header.tsx to enable ${feature}`));
                }
                else {
                    console.log(chalk_1.default.yellow(`Warning: header.tsx not found at ${headerPath}. Manual feature file created but header wasn't updated.`));
                }
                spinner.succeed(`Successfully added layout feature '${feature}' and dependencies.`);
                return;
            }
            else {
                // Normal install: prompt user for features
                spinner.stop();
                const answers = await inquirer_1.default.prompt([
                    {
                        type: "confirm",
                        name: "theme",
                        message: "Include Light/Dark Theme Switcher?",
                        default: true
                    },
                    {
                        type: "confirm",
                        name: "notifications",
                        message: "Include Notifications (WebSocket Notifications Bell)?",
                        default: true
                    },
                    {
                        type: "confirm",
                        name: "profile",
                        message: "Include Profile Dropdown Button?",
                        default: true
                    },
                    {
                        type: "confirm",
                        name: "productSelect",
                        message: "Include Product Vertical Switcher?",
                        default: true
                    }
                ]);
                // And prompt for settings sidebar items to include
                const sidebarAnswers = await inquirer_1.default.prompt([
                    {
                        type: "checkbox",
                        name: "sections",
                        message: "Select settings sidebar sections to enable:",
                        choices: Object.keys(SIDEBAR_SECTIONS_MAPPING),
                        default: Object.keys(SIDEBAR_SECTIONS_MAPPING) // Pre-select all by default
                    }
                ]);
                spinner.start();
                spinner.text = `Installing root layout...`;
                let itemPath = "layouts/root-layout";
                const meta = await (0, registry_js_1.fetchItemMeta)(itemPath);
                // Install registry dependencies first (resizable, dropdown-menu, app-sidebar -> sidebar)
                if (meta.registryDependencies && meta.registryDependencies.length > 0) {
                    for (const depName of meta.registryDependencies) {
                        spinner.text = `Resolving registry dependency: ${depName}...`;
                        await installItem(depName, registry, spinner);
                    }
                }
                // Determine files list based on opt-in selections
                const filesToInstall = [
                    "root-layout.tsx",
                    "header.tsx",
                    "components/workspace-selector.tsx",
                    "components/search-bar.tsx"
                ];
                if (answers.theme)
                    filesToInstall.push("components/theme-toggle.tsx");
                if (answers.notifications)
                    filesToInstall.push("components/notifications-bell.tsx");
                if (answers.profile)
                    filesToInstall.push("components/profile-dropdown.tsx");
                if (answers.productSelect)
                    filesToInstall.push("components/product-select.tsx");
                for (const file of filesToInstall) {
                    spinner.text = `Downloading ${file}...`;
                    let content = await (0, registry_js_1.fetchItemSource)(itemPath, file);
                    // If header.tsx, perform dynamic replacement for enabled features
                    if (file === "header.tsx") {
                        if (answers.theme)
                            content = enableFeatureInHeader(content, "theme");
                        if (answers.notifications)
                            content = enableFeatureInHeader(content, "notifications");
                        if (answers.profile)
                            content = enableFeatureInHeader(content, "profile");
                        if (answers.productSelect)
                            content = enableFeatureInHeader(content, "product-select");
                    }
                    await (0, file_installer_js_1.copySourceFile)(meta, file, content, spinner);
                }
                // Filter sidebar.config.ts based on chosen sections and install their items
                const fs = await import("fs-extra");
                const path = await import("path");
                const { getProjectRoot } = await import("../utils/paths.js");
                const configFilePath = path.default.join(getProjectRoot(), "src/components/sidebar.config.ts");
                if (fs.default.existsSync(configFilePath)) {
                    spinner.text = "Configuring settings sidebar sections...";
                    let sidebarContent = await fs.default.readFile(configFilePath, "utf8");
                    const selectedSections = sidebarAnswers.sections;
                    for (const [name, sMeta] of Object.entries(SIDEBAR_SECTIONS_MAPPING)) {
                        const placeholder = `// {ALFIN_SIDEBAR_${sMeta.placeholderKey}}`;
                        const isSelected = selectedSections.includes(name);
                        if (isSelected) {
                            sidebarContent = sidebarContent.replace(new RegExp(placeholder, "g"), `sidebarSettingsItemsMap["${sMeta.configKey}"],`);
                            // Recursively install vertical modules/routes
                            if (sMeta.modules.length > 0 || sMeta.routes.length > 0) {
                                spinner.text = `Installing items for ${name}...`;
                                for (const mod of sMeta.modules) {
                                    await installItem(mod, registry, spinner);
                                }
                                for (const rte of sMeta.routes) {
                                    await installItem(rte, registry, spinner);
                                }
                            }
                        }
                    }
                    await fs.default.writeFile(configFilePath, sidebarContent, "utf8");
                }
                // Install NPM package dependencies
                if (meta.dependencies && meta.dependencies.length > 0) {
                    spinner.text = `Installing npm package dependencies for layout...`;
                    (0, dependency_installer_js_1.installDependencies)(meta.dependencies);
                }
                spinner.succeed("Successfully installed Root Layout and selected features.");
                return;
            }
        }
        // If adding 'interceptors' with a --single code option
        if (itemName === "interceptors" && options.single) {
            const singleCode = options.single.toUpperCase();
            if (singleCode !== "LMS" && singleCode !== "SETTINGS") {
                throw new Error("Invalid --single value. Expected LMS or SETTINGS.");
            }
            await installItem(singleCode, registry, spinner);
            spinner.succeed(`Successfully added interceptor '${singleCode}' and its dependencies.`);
        }
        // Check if itemName is a category (e.g. "ui", "settings", "interceptors", "layout")
        else if (registry[itemName] && !registry[itemName].path) {
            spinner.text = `Installing all components in category '${itemName}'...`;
            const categoryItems = Object.keys(registry[itemName]);
            for (const item of categoryItems) {
                await installItem(item, registry, spinner);
            }
            spinner.succeed(`Successfully added category '${itemName}' components and their dependencies.`);
        }
        else {
            // Otherwise, install the single item as usual
            await installItem(itemName, registry, spinner);
            spinner.succeed(`Successfully added '${itemName}' and its dependencies.`);
        }
        console.log(chalk_1.default.green.bold(`\nSuccess! Installation complete.`));
    }
    catch (error) {
        spinner.fail(error.message);
    }
});
