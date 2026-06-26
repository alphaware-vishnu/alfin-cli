import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { getProjectRoot } from "../utils/paths.js";
import { fetchRegistryIndex, fetchItemMeta } from "../registry/registry.js";
import { installItem } from "./add.js";

// SIDEBAR SECTIONS DEFINITION
const SIDEBAR_SECTIONS = [
  { name: "Client Onboarding", key: "client-onboard", placeholder: "CLIENT_ONBOARD", modules: ["application-form"], routes: ["client-onboard-routes", "company-bank-routes", "partner-routes"] },
  { name: "User Management", key: "user-management", placeholder: "USER_MANAGEMENT", modules: ["user-master", "role-master", "maker-checker", "branch-master", "system-resource", "system-group", "system-permission", "system-role"], routes: ["users-routes", "branch-routes", "group-routes", "system-group-routes", "system-permission-routes", "system-resource-routes", "maker-checker-routes"] },
  { name: "Product Configuration", key: "product-configuration", placeholder: "PRODUCT_CONFIGURATION", modules: ["product-scheme", "charges"], routes: ["product-routes", "scheme-routes", "charge-routes"] },
  { name: "KYC Management", key: "kyc-management", placeholder: "KYC_MANAGEMENT", modules: ["documents-master", "scorecard", "threshold"], routes: ["document-category-routes", "document-type-routes", "score-card-routes", "threshold-routes"] },
  { name: "Loan Settings", key: "loan-settings", placeholder: "LOAN_SETTINGS", modules: ["tax-rates", "estamp", "enach", "allocation-strategy"], routes: ["tax-rate-routes", "estamp-routes", "enach-routes", "allocation-strategy-routes"] },
  { name: "Form Builder", key: "form-builder", placeholder: "FORM_BUILDER", modules: ["form-builder"], routes: [] },
  { name: "Email Notification", key: "email-notification", placeholder: "EMAIL_NOTIFICATION", modules: [], routes: ["email-editor-routes"] },
  { name: "Automation", key: "automation", placeholder: "AUTOMATION", modules: ["model-config", "questionary"], routes: ["model-configuration-routes", "questionary-routes"] },
  { name: "Appearance", key: "appearance", placeholder: "APPEARANCE", modules: ["appearance"], routes: ["appearance-routes"] }
];

const defaultEnumsContent = `export enum ResourceType {
  MODULE = "MODULE",
  MENU = "MENU",
  PAGE = "PAGE",
  ACTION = "ACTION",
}

export const RESOURCE_PERMISSIONS = {
  SYSTEM: {
    USERS: {
      CODE: "SYSTEM_USERS",
      CREATE: "SYSTEM_USERS_CREATE",
      DELETE: "SYSTEM_USERS_DELETE",
      UPDATE: "SYSTEM_USERS_UPDATE",
      VIEW: "SYSTEM_USERS_VIEW",
    },
    ROLES: {
      CODE: "SYSTEM_ROLES",
      CREATE: "SYSTEM_ROLES_CREATE",
      DELETE: "SYSTEM_ROLES_DELETE",
      UPDATE: "SYSTEM_ROLES_UPDATE",
      VIEW: "SYSTEM_ROLES_VIEW",
    }
  },
  ASSETIFY: {
    ORIGINATION: { CODE: "ASSETIFY_ORIGINATION" },
    UNDERWRITING: { CODE: "ASSETIFY_UNDERWRITING" },
    OPERATIONS: { CODE: "ASSETIFY_OPERATIONS" },
    ACCOUNTS: { CODE: "ASSETIFY_ACCOUNTS" },
  },
  KAPIL_CAPITAL: {
    ORIGINATION: { CODE: "KAPIL_CAPITAL_ORIGINATION" },
    OPERATIONS: { CODE: "KAPIL_CAPITAL_OPERATIONS" },
    ACCOUNTS: { CODE: "KAPIL_CAPITAL_ACCOUNTS" },
  },
  LMS: {
    DASHBOARD: { CODE: "LMS_DASHBOARD" },
    LOS_DASHBOARD: { CODE: "LMS_LOS_DASHBOARD" },
  }
};
`;

function ensureBarrelExport(filePath: string, exportLine: string) {
  try {
    fs.ensureDirSync(path.dirname(filePath));
    let content = "";
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, "utf8");
    }

    const normalizedExport = exportLine.replace(/['"]/g, "'").trim();
    const hasExport = content
      .split("\n")
      .map(line => line.replace(/['"]/g, "'").trim())
      .some(line => line === normalizedExport);

    if (!hasExport) {
      const separator = content && !content.endsWith("\n") ? "\n" : "";
      fs.writeFileSync(filePath, content + separator + exportLine + "\n", "utf8");
      console.log(chalk.green(`Added barrel export to ${path.relative(process.cwd(), filePath)}`));
    }
  } catch (error: any) {
    console.log(chalk.yellow(`Failed to update barrel export ${filePath}: ${error.message}`));
  }
}

function configureEnums(root: string) {
  const enumsDir = path.join(root, "src/enums");
  let enumsFilePath = path.join(enumsDir, "index.tsx");
  if (!fs.existsSync(enumsFilePath) && fs.existsSync(path.join(enumsDir, "index.ts"))) {
    enumsFilePath = path.join(enumsDir, "index.ts");
  }

  if (!fs.existsSync(enumsFilePath)) {
    fs.ensureDirSync(enumsDir);
    fs.writeFileSync(enumsFilePath, defaultEnumsContent, "utf8");
    console.log(chalk.green("Created src/enums/index.tsx with default resource permissions."));
  } else {
    // Check if RESOURCE_PERMISSIONS exists
    let content = fs.readFileSync(enumsFilePath, "utf8");
    if (!content.includes("RESOURCE_PERMISSIONS")) {
      content += "\n\n" + defaultEnumsContent;
      fs.writeFileSync(enumsFilePath, content, "utf8");
      console.log(chalk.green("Appended default resource permissions to src/enums index."));
    } else {
      console.log(chalk.yellow("src/enums index already contains resource permissions. Skipping configuration."));
    }
  }
}

async function ensureSettingsBarrelExports(root: string, registry: any, installedModules: string[]) {
  const settingsIndexFile = path.join(root, "src/pages/settings/index.ts");

  for (const mod of installedModules) {
    let itemPath = null;
    for (const [category, items] of Object.entries(registry)) {
      if ((items as any)[mod]) {
        itemPath = (items as any)[mod].path;
        break;
      }
    }

    if (itemPath) {
      try {
        const meta = await fetchItemMeta(itemPath);
        if (meta.target && meta.target.startsWith("src/pages/settings/")) {
          const relativeExportDir = meta.target.substring("src/pages/settings/".length);
          if (relativeExportDir) {
            const targetDir = path.join(root, meta.target);
            const componentIndexFile = path.join(targetDir, "index.ts");

            // If index.ts doesn't exist in the component directory, let's create it!
            if (!fs.existsSync(componentIndexFile)) {
              const mainFile = meta.files && meta.files.length > 0 ? meta.files[0] : `${meta.name}.tsx`;
              const mainFileBase = path.basename(mainFile, path.extname(mainFile));
              fs.ensureDirSync(targetDir);
              fs.writeFileSync(componentIndexFile, `export * from "./${mainFileBase}";\n`, "utf8");
              console.log(chalk.green(`Created component level barrel export: ${path.relative(root, componentIndexFile)}`));
            }

            ensureBarrelExport(settingsIndexFile, `export * from './${relativeExportDir}';`);
          }
        }
      } catch (error: any) {
        console.log(chalk.yellow(`Warning: failed to build barrel export for ${mod}: ${error.message}`));
      }
    }
  }
}

function scanRoutes(root: string): { filePath: string; routes: string[] } {
  let filePath = path.join(root, "src/routes/app.routes.tsx");
  if (!fs.existsSync(filePath)) {
    filePath = path.join(root, "src/routes/app.routes.ts");
    if (!fs.existsSync(filePath)) {
      filePath = path.join(root, "src/App.tsx");
      if (!fs.existsSync(filePath)) {
        filePath = path.join(root, "src/App.jsx");
        if (!fs.existsSync(filePath)) {
          return { filePath: "", routes: [] };
        }
      }
    }
  }

  const content = fs.readFileSync(filePath, "utf8");
  const routes = new Set<string>();

  // Match path="..." or path={...}
  const pathRegex = /path\s*=\s*[{'"]([^'"\s}]+)['"}]/g;
  let match;
  while ((match = pathRegex.exec(content)) !== null) {
    const p = match[1];
    if (p !== "/" && !p.includes("login") && !p.includes("LOGIN") && !p.includes("unauthorized") && !p.includes("UNAUTHORIZED")) {
      routes.add(p);
    }
  }

  // Match layout functions: {SettingsRoute()}, {OriginationRoute()}
  const functionRouteRegex = /\{(\w+Route(s)?)\(\)\}/g;
  while ((match = functionRouteRegex.exec(content)) !== null) {
    routes.add(`${match[1]}()`);
  }

  return { filePath, routes: Array.from(routes) };
}

function wrapRoutesInLayout(filePath: string, selectedRoutes: string[], wrapAll: boolean) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");

  // 1. Ensure imports exist
  if (!content.includes("RootLayout") && !content.includes("ProtectedRoute")) {
    content = `import { RootLayout, ProtectedRoute } from "@/components";\nimport { Outlet } from "react-router-dom";\n` + content;
  }

  // 2. Identify return statement JSX
  const returnRegex = /(return\s*\(\s*<>)([\s\S]*?)(<\/>\s*\))/;
  const routesRegex = /(return\s*\(\s*<Routes>)([\s\S]*?)(<\/Routes>\s*\))/;

  let match = content.match(returnRegex) || content.match(routesRegex);
  if (!match) return;

  const header = match[1];
  const innerContent = match[2];
  const footer = match[3];

  // Split lines
  const lines = innerContent.split("\n");
  const protectedLines: string[] = [];
  const publicLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    // If it is a login or unauthorized route, it should remain public
    if (trimmed.includes("login") || trimmed.includes("LOGIN") || trimmed.includes("unauthorized") || trimmed.includes("UNAUTHORIZED")) {
      publicLines.push(line);
      continue;
    }

    let protectThis = false;
    if (wrapAll) {
      protectThis = true;
    } else {
      for (const route of selectedRoutes) {
        if (trimmed.includes(route)) {
          protectThis = true;
          break;
        }
      }
    }

    if (protectThis) {
      protectedLines.push("        " + trimmed);
    } else {
      publicLines.push(line);
    }
  }

  // Construct new return JSX
  let newInnerContent = "";
  if (protectedLines.length > 0) {
    newInnerContent += `\n      <Route\n        path="/"\n        element={\n          <RootLayout>\n            <ProtectedRoute>\n              <Outlet />\n            </ProtectedRoute>\n          </RootLayout>\n        }\n      >\n${protectedLines.join("\n")}\n      </Route>\n`;
  }
  newInnerContent += publicLines.join("\n");

  const updatedBlock = `${header}${newInnerContent}\n    ${footer}`;
  content = content.replace(match[0], updatedBlock);

  // Check if 'import { Route }' exists. If not, make sure it is imported from 'react-router-dom'.
  if (!content.includes("Route") && !content.includes("react-router-dom")) {
    content = `import { Route } from "react-router-dom";\n` + content;
  } else if (content.includes("react-router-dom") && !content.includes("Route")) {
    content = content.replace(/import\s+{[^}]*}\s+from\s+["']react-router-dom["']/g, (m) => {
      return m.replace("}", ", Route }");
    });
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(chalk.green(`Protected selected routes under RootLayout in ${path.basename(filePath)}`));
}

function updateSidebarConfig(root: string, enabledCategories: string[]) {
  const configFilePath = path.join(root, "src/components/sidebar.config.ts");
  if (!fs.existsSync(configFilePath)) return;

  try {
    let sidebarContent = fs.readFileSync(configFilePath, "utf8");

    for (const section of SIDEBAR_SECTIONS) {
      const isEnabled = enabledCategories.includes(section.key);
      const placeholderTag = `// {ALFIN_SIDEBAR_${section.placeholder}}`;
      const enabledTag = `sidebarSettingsItemsMap["${section.key}"],`;

      if (isEnabled) {
        if (sidebarContent.includes(placeholderTag)) {
          sidebarContent = sidebarContent.replace(placeholderTag, enabledTag);
        }
      } else {
        if (sidebarContent.includes(enabledTag)) {
          sidebarContent = sidebarContent.replace(enabledTag, placeholderTag);
        }
      }
    }

    fs.writeFileSync(configFilePath, sidebarContent, "utf8");
    console.log(chalk.green("Updated src/components/sidebar.config.ts successfully."));
  } catch (error: any) {
    console.log(chalk.red(`Failed to update sidebar.config.ts: ${error.message}`));
  }
}

export const applyAuthCommand = new Command()
  .name("apply-auth")
  .description("Apply Authentication setup to target project")
  .action(async () => {
    const root = getProjectRoot();
    const spinner = ora(`Fetching registry index...`).start();

    try {
      const registry = await fetchRegistryIndex();
      spinner.stop();

      // 1. Prompt for Automatic or Manual setup using "select" type
      const modeAnswer = await inquirer.prompt([
        {
          type: "select",
          name: "setupMode",
          message: "Select Auth Setup Mode:",
          choices: [
            { name: "Automatic Setup (CLI installs components and configures routes/providers)", value: "automatic" },
            { name: "Manual Setup (CLI only downloads components, you configure routing/providers manually)", value: "manual" }
          ]
        }
      ]);
      const isAutomatic = modeAnswer.setupMode === "automatic";

      // 2. Ask whether to setup routes
      const routesAnswer = await inquirer.prompt([
        {
          type: "confirm",
          name: "setupRoutes",
          message: "Would you like to setup routes?",
          default: true
        }
      ]);

      let selectedRoutes: string[] = [];
      if (routesAnswer.setupRoutes) {
        const routesSelect = await inquirer.prompt([
          {
            type: "checkbox",
            name: "routes",
            message: "Select which routes to add:",
            choices: [
              { name: "Login Route", value: "login", checked: true },
              { name: "Unauthorized Page Route", value: "unauthorized", checked: true }
            ],
            default: ["login", "unauthorized"]
          }
        ]);
        selectedRoutes = routesSelect.routes;
      }

      // 3. Ask whether to setup cryptography
      const cryptoAnswer = await inquirer.prompt([
        {
          type: "confirm",
          name: "setupCrypto",
          message: "Would you like to configure a cryptography utility (encrypt/decrypt)?",
          default: true
        }
      ]);

      let secretKey = "";
      let initVector = "";
      if (cryptoAnswer.setupCrypto) {
        const cryptoKeys = await inquirer.prompt([
          {
            type: "input",
            name: "secretKey",
            message: "Enter VITE_SECRET_KEY for encryption (Base64 encoded key):",
            default: "YTIzNDU2Nzg5MDEyMzQ1Ng=="
          },
          {
            type: "input",
            name: "initVector",
            message: "Enter VITE_INIT_VECTOR for encryption (16 characters):",
            default: "1234567890123456"
          }
        ]);
        secretKey = cryptoKeys.secretKey;
        initVector = cryptoKeys.initVector;
      }

      // Turnstile site key prompt
      const turnstileAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "siteKey",
          message: "Enter VITE_TURNSTILE_SITE_KEY for Cloudflare Turnstile CAPTCHA (or press enter for dummy test key):",
          default: "1x00000000000000000000AA"
        }
      ]);
      const turnstileSiteKey = turnstileAnswer.siteKey;

      // Enums configuration prompt
      const enumsPrompt = await inquirer.prompt([
        {
          type: "confirm",
          name: "setupEnums",
          message: "Would you like to configure standard resource permissions inside src/enums/index.tsx?",
          default: true
        }
      ]);

      // Interceptors prompt
      const interceptorPrompt = await inquirer.prompt([
        {
          type: "confirm",
          name: "setupInterceptors",
          message: "Would you like to configure API client interceptors (LMS / SETTINGS)?",
          default: true
        }
      ]);

      // AppContext prompt
      const appContextPrompt = await inquirer.prompt([
        {
          type: "confirm",
          name: "setupAppContext",
          message: "Would you like to configure AppContext and AppProvider?",
          default: true
        }
      ]);

      // 4. Ask whether to install RootLayout & ProtectedRoute wrapping
      const layoutAnswer = await inquirer.prompt([
        {
          type: "confirm",
          name: "setupLayout",
          message: "Would you like to add RootLayout and protect routes using ProtectedRoute?",
          default: true
        }
      ]);

      let wrapAllRoutes = false;
      let routesToWrap: string[] = [];
      let enabledCategories: string[] = [];
      let downloadSidebarItems = false;
      let finalModulesToInstall: string[] = [];
      let finalRoutesToInstall: string[] = [];

      if (layoutAnswer.setupLayout) {
        // Scan for existing routes
        const scanned = scanRoutes(root);
        if (scanned.routes.length > 0) {
          const wrapChoices = [
            { name: "All routes (except /login)", value: "all" },
            ...scanned.routes.map(r => ({ name: `Specific Route: ${r}`, value: r }))
          ];

          const wrapAnswer = await inquirer.prompt([
            {
              type: "checkbox",
              name: "wrapRoutes",
              message: "Select which routes to wrap / protect inside RootLayout & ProtectedRoute:",
              choices: wrapChoices,
              default: ["all"]
            }
          ]);

          routesToWrap = wrapAnswer.wrapRoutes;
          if (routesToWrap.includes("all")) {
            wrapAllRoutes = true;
          }
        } else {
          console.log(chalk.yellow("No routes found in App.tsx or app.routes.tsx to protect. Wrapping all routes by default."));
          wrapAllRoutes = true;
        }

        // Prompt for Granular Sidebar Categories
        const sidebarCategoriesAnswer = await inquirer.prompt([
          {
            type: "checkbox",
            name: "categories",
            message: "Select which sidebar categories you want to enable:",
            choices: [
              { name: "Select All Categories", value: "all", checked: true },
              ...SIDEBAR_SECTIONS.map(s => ({ name: s.name, value: s.key }))
            ],
            default: ["all"]
          }
        ]);

        let selectedCategories = sidebarCategoriesAnswer.categories;
        if (selectedCategories.includes("all")) {
          enabledCategories = SIDEBAR_SECTIONS.map(s => s.key);
          finalModulesToInstall = SIDEBAR_SECTIONS.flatMap(s => s.modules);
          finalRoutesToInstall = SIDEBAR_SECTIONS.flatMap(s => s.routes);
        } else {
          enabledCategories = selectedCategories;
          // For each selected category, ask to enable all or customize specific items
          for (const key of selectedCategories) {
            const section = SIDEBAR_SECTIONS.find(s => s.key === key);
            if (!section) continue;

            if (section.modules.length > 0) {
              const itemAnswer = await inquirer.prompt([
                {
                  type: "list",
                  name: "itemConfig",
                  message: `Configure items for category "${section.name}":`,
                  choices: [
                    { name: "Enable all items in this category", value: "all" },
                    { name: "Select specific items in this category", value: "customize" }
                  ]
                }
              ]);

              if (itemAnswer.itemConfig === "all") {
                finalModulesToInstall.push(...section.modules);
              } else {
                const specificItems = await inquirer.prompt([
                  {
                    type: "checkbox",
                    name: "modules",
                    message: `Select items to enable in "${section.name}":`,
                    choices: section.modules.map(m => ({ name: m, value: m, checked: true }))
                  }
                ]);
                finalModulesToInstall.push(...specificItems.modules);
              }
            }
            finalRoutesToInstall.push(...section.routes);
          }
        }

        // Ask whether to automatically download routes and components
        const downloadAnswer = await inquirer.prompt([
          {
            type: "confirm",
            name: "downloadItems",
            message: "Would you like to automatically download and apply routes and components for the selected sidebar items?",
            default: true
          }
        ]);
        downloadSidebarItems = downloadAnswer.downloadItems;
      }

      // Start downloading components
      spinner.start("Installing auth components...");

      // Download base auth items
      await installItem("auth-provider", registry, spinner);
      await installItem("login", registry, spinner);
      await installItem("unauthorized", registry, spinner);
      await installItem("private-route", registry, spinner);
      await installItem("protected-route", registry, spinner);
      await installItem("app-loader", registry, spinner);
      await installItem("new-login", registry, spinner);
      await installItem("use-redirect-with-permissions", registry, spinner);
      await installItem("auth-types", registry, spinner);

      // Write keys and turnstile site key to .env
      const envPath = path.join(root, ".env");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }

      const updateEnvVar = (content: string, key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        }
        return content + (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${value}\n`;
      };

      if (cryptoAnswer.setupCrypto) {
        await installItem("encryption", registry, spinner);
        envContent = updateEnvVar(envContent, "VITE_SECRET_KEY", secretKey);
        envContent = updateEnvVar(envContent, "VITE_INIT_VECTOR", initVector);
      }
      envContent = updateEnvVar(envContent, "VITE_TURNSTILE_SITE_KEY", turnstileSiteKey);
      fs.writeFileSync(envPath, envContent, "utf8");
      spinner.text = "Saved credentials to .env";

      // Configure Enums
      if (enumsPrompt.setupEnums) {
        configureEnums(root);
      }

      // Configure Interceptors
      if (interceptorPrompt.setupInterceptors) {
        spinner.text = "Installing interceptors...";
        await installItem("LMS", registry, spinner);
        await installItem("SETTINGS", registry, spinner);

        // Barrel exports for interceptor
        ensureBarrelExport(path.join(root, "src/interceptor/index.ts"), "export * from './lms-client';");
        ensureBarrelExport(path.join(root, "src/interceptor/index.ts"), "export * from './settings-client';");
      }

      // Configure AppContext if selected
      if (appContextPrompt.setupAppContext) {
        spinner.text = "Configuring AppContext...";

        const contextDir = path.join(root, "src/context");
        const contextsDir = path.join(root, "src/contexts");

        fs.ensureDirSync(contextDir);
        fs.ensureDirSync(contextsDir);

        const appContextContent = `import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LeadSource = "PERSONAL_LOAN" | "VEHICLE_LOAN" | "ALFIN" | "HEYLON" | "";

export interface AppContextType {
  leadSource: LeadSource;
  setLeadSource: (value: LeadSource) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const APP_LEAD_SOURCE_KEY = "leadSource";

const normalizeStoredLeadSource = (value: string | null): LeadSource => {
  if (
    value === "PERSONAL_LOAN" ||
    value === "VEHICLE_LOAN" ||
    value === "ALFIN" ||
    value === "HEYLON"
  ) {
    return value;
  }
  return "PERSONAL_LOAN";
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [leadSource, setLeadSourceState] = useState<LeadSource>(() => {
    return normalizeStoredLeadSource(localStorage.getItem(APP_LEAD_SOURCE_KEY));
  });

  const setLeadSource = (value: LeadSource) => {
    setLeadSourceState(value);
  };

  useEffect(() => {
    localStorage.setItem(APP_LEAD_SOURCE_KEY, leadSource);
  }, [leadSource]);

  const value = useMemo(
    () => ({
      leadSource,
      setLeadSource,
    }),
    [leadSource],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
};
`;

        const appProviderContent = `import React, { createContext, useContext, useState } from "react";

interface AppContextType {
  selectedProduct: string | null;
  setSelectedProduct: (product: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProduct, setSelectedProductState] = useState<string | null>(() => {
    return localStorage.getItem("selectedProduct");
  });

  const setSelectedProduct = (product: string | null) => {
    setSelectedProductState(product);
    if (product) {
      localStorage.setItem("selectedProduct", product);
    } else {
      localStorage.removeItem("selectedProduct");
    }
  };

  return (
    <AppContext.Provider value={{ selectedProduct, setSelectedProduct }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
`;

        const appContextBridgeContent = `export * from "@/context/app-context";\n`;

        fs.writeFileSync(path.join(contextDir, "app-context.tsx"), appContextContent, "utf8");
        fs.writeFileSync(path.join(contextsDir, "app-provider.tsx"), appProviderContent, "utf8");
        fs.writeFileSync(path.join(contextsDir, "app-context.ts"), appContextBridgeContent, "utf8");
        console.log(chalk.green("Configured AppContext and AppProvider source files."));
      }

      // If Layout selected, install layout items and sidebar components
      if (layoutAnswer.setupLayout) {
        spinner.text = "Installing root layout and sidebar components...";
        await installItem("root-layout", registry, spinner);
        await installItem("app-sidebar", registry, spinner);

        // Download sidebar modules and routes
        if (downloadSidebarItems) {
          for (const mod of finalModulesToInstall) {
            spinner.text = `Downloading module component: ${mod}...`;
            try {
              await installItem(mod, registry, spinner);
            } catch (e: any) {
              console.log(chalk.yellow(`Warning: module '${mod}' not found or failed to install: ${e.message}`));
            }
          }
          for (const rte of finalRoutesToInstall) {
            spinner.text = `Downloading route component: ${rte}...`;
            try {
              await installItem(rte, registry, spinner);
            } catch (e: any) {
              console.log(chalk.yellow(`Warning: route '${rte}' not found or failed to install: ${e.message}`));
            }
          }
        }

        // Update sidebar.config.ts
        updateSidebarConfig(root, enabledCategories);

        // Wrap protected routes inside App.tsx or app.routes.tsx
        const scanned = scanRoutes(root);
        if (scanned.filePath) {
          wrapRoutesInLayout(scanned.filePath, routesToWrap, wrapAllRoutes);
        }
      }

      // Configure routes map in src/enums/routes.ts
      const enumsDir = path.join(root, "src/enums");
      const routesEnumPath = path.join(enumsDir, "routes.ts");
      fs.ensureDirSync(enumsDir);

      let routesEnumContent = "";
      if (fs.existsSync(routesEnumPath)) {
        routesEnumContent = fs.readFileSync(routesEnumPath, "utf8");
      }

      const loginRoutePath = "/login";
      const unauthorizedRoutePath = "/unauthorized";

      if (!routesEnumContent.includes("export const APP")) {
        routesEnumContent += `\nexport const APP = {
  LOGIN: "${loginRoutePath}",
  UNAUTHORIZED: "${unauthorizedRoutePath}",
};\n`;
      } else {
        // Update export APP
        if (!routesEnumContent.includes("LOGIN:")) {
          routesEnumContent = routesEnumContent.replace("export const APP = {", `export const APP = {\n  LOGIN: "${loginRoutePath}",`);
        }
        if (!routesEnumContent.includes("UNAUTHORIZED:")) {
          routesEnumContent = routesEnumContent.replace("export const APP = {", `export const APP = {\n  UNAUTHORIZED: "${unauthorizedRoutePath}",`);
        }
      }
      fs.writeFileSync(routesEnumPath, routesEnumContent, "utf8");
      console.log(chalk.green("Configured APP.LOGIN routes map in src/enums/routes.ts"));

      if (isAutomatic && routesAnswer.setupRoutes) {
        // Setup login.routes.tsx in target routes folder
        const routesDir = path.join(root, "src/routes");
        fs.ensureDirSync(routesDir);

        const loginRoutesPath = path.join(routesDir, "login.routes.tsx");
        let loginRoutesContent = `import { Route } from "react-router-dom";
import { Login, Unauthorized } from "@/pages";
import { APP } from "@/enums/routes";

export const LoginRoutes = () => {
  return (
    <>
`;
        if (selectedRoutes.includes("login")) {
          loginRoutesContent += `      <Route path={APP.LOGIN} element={<Login />} />\n`;
        }
        if (selectedRoutes.includes("unauthorized")) {
          loginRoutesContent += `      <Route path={APP.UNAUTHORIZED} element={<Unauthorized />} />\n`;
        }
        loginRoutesContent += `    </>
  );
};
`;
        fs.writeFileSync(loginRoutesPath, loginRoutesContent, "utf8");
        console.log(chalk.green("Created login.routes.tsx inside routes folder."));

        // Setup/configure app.routes.tsx or app.routes.ts
        let appRoutesFile = path.join(routesDir, "app.routes.tsx");
        if (!fs.existsSync(appRoutesFile)) {
          const tsFile = path.join(routesDir, "app.routes.ts");
          if (fs.existsSync(tsFile)) {
            appRoutesFile = tsFile;
          }
        }

        let createAppRoutes = false;
        if (!fs.existsSync(appRoutesFile)) {
          spinner.stop();
          const confirmAppRoutes = await inquirer.prompt([
            {
              type: "confirm",
              name: "createAppRoutes",
              message: "app.routes.tsx not found. Would you like to create it?",
              default: true
            }
          ]);
          spinner.start();
          createAppRoutes = confirmAppRoutes.createAppRoutes;
        } else {
          createAppRoutes = true; // It already exists
        }

        if (createAppRoutes) {
          let appRoutesContent = "";
          if (fs.existsSync(appRoutesFile)) {
            appRoutesContent = fs.readFileSync(appRoutesFile, "utf8");
          } else {
            appRoutesContent = `import { Routes } from "react-router-dom";
import { LoginRoutes } from "@/routes/login.routes";

export const AppRoutes = () => {
  return (
    <Routes>
      {LoginRoutes()}
    </Routes>
  );
};
`;
          }

          // Import LoginRoutes if not present
          if (!appRoutesContent.includes("LoginRoutes")) {
            appRoutesContent = `import { LoginRoutes } from "@/routes/login.routes";\n` + appRoutesContent;
            // Inject {LoginRoutes()} inside AppRoutes element
            const routesRegex = /(return\s*\(\s*<Routes>[\s\S]*?)(<\/Routes>)/;
            const reactRouterRegex = /(return\s*\(\s*<>[\s\S]*?)(<\/>\s*\))/;
            if (routesRegex.test(appRoutesContent)) {
              appRoutesContent = appRoutesContent.replace(routesRegex, `$1  {LoginRoutes()}\n      $2`);
            } else if (reactRouterRegex.test(appRoutesContent)) {
              appRoutesContent = appRoutesContent.replace(reactRouterRegex, `$1  {LoginRoutes()}\n    $2`);
            }
          }
          fs.writeFileSync(appRoutesFile, appRoutesContent, "utf8");
          console.log(chalk.green(`Configured LoginRoutes inside ${path.basename(appRoutesFile)}`));
        }
      }

      // AUTOMATIC BARREL EXPORTS
      spinner.text = "Creating barrel exports...";

      // If layout was set up, ensure settings barrel exports
      if (layoutAnswer.setupLayout && downloadSidebarItems && finalModulesToInstall.length > 0) {
        await ensureSettingsBarrelExports(root, registry, finalModulesToInstall);
      }

      if (appContextPrompt.setupAppContext) {
        ensureBarrelExport(path.join(root, "src/context/index.ts"), "export * from './app-context';");
        ensureBarrelExport(path.join(root, "src/contexts/index.ts"), "export * from './app-context';");
        ensureBarrelExport(path.join(root, "src/contexts/index.ts"), "export * from './app-provider';");
      }

      ensureBarrelExport(path.join(root, "src/pages/auth/index.ts"), "export * from './login';");
      ensureBarrelExport(path.join(root, "src/pages/auth/index.ts"), "export * from './unauthorized';");
      ensureBarrelExport(path.join(root, "src/pages/index.ts"), "export * from './auth';");

      if (fs.existsSync(path.join(root, "src/pages/settings"))) {
        ensureBarrelExport(path.join(root, "src/pages/index.ts"), "export * from './settings';");
      }

      ensureBarrelExport(path.join(root, "src/auth/index.ts"), "export * from './private-route';");
      ensureBarrelExport(path.join(root, "src/components/auth/index.ts"), "export * from './protected-route';");
      ensureBarrelExport(path.join(root, "src/components/auth/index.ts"), "export * from './new-login';");
      ensureBarrelExport(path.join(root, "src/components/auth/index.ts"), "export * from './reset-password';");
      ensureBarrelExport(path.join(root, "src/hooks/index.ts"), "export * from './use-redirect-with-permissions';");
      ensureBarrelExport(path.join(root, "src/types/index.ts"), "export * from './auth-types';");
      ensureBarrelExport(path.join(root, "src/components/index.ts"), "export * from './auth';");

      if (layoutAnswer.setupLayout) {
        ensureBarrelExport(path.join(root, "src/components/layouts/index.ts"), "export * from './root-layout/root-layout';");
        ensureBarrelExport(path.join(root, "src/components/layouts/index.ts"), "export * from './root-layout/header';");
        ensureBarrelExport(path.join(root, "src/components/index.ts"), "export * from './layouts';");
        ensureBarrelExport(path.join(root, "src/components/index.ts"), "export * from './app-sidebar';");
      }

      if (fs.existsSync(path.join(root, "src/components/ui/app-loader.tsx"))) {
        ensureBarrelExport(path.join(root, "src/components/ui/index.ts"), "export * from './app-loader';");
        ensureBarrelExport(path.join(root, "src/components/index.ts"), "export * from './ui';");
      }

      if (cryptoAnswer.setupCrypto) {
        ensureBarrelExport(path.join(root, "src/utils/index.ts"), "export * from './encryption';");
      }

      ensureBarrelExport(path.join(root, "src/contexts/index.ts"), "export * from './auth-provider';");

      let enumsIndexFile = path.join(root, "src/enums/index.tsx");
      if (!fs.existsSync(enumsIndexFile)) {
        const tsFile = path.join(root, "src/enums/index.ts");
        if (fs.existsSync(tsFile)) {
          enumsIndexFile = tsFile;
        } else {
          enumsIndexFile = path.join(root, "src/enums/index.tsx");
        }
      }
      ensureBarrelExport(enumsIndexFile, "export * from './routes';");

      spinner.succeed("Authentication setup applied successfully!");
    } catch (error: any) {
      spinner.fail(`Failed to apply authentication setup: ${error.message}`);
    }
  });
