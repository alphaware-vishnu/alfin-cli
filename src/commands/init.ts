import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import { getProjectRoot } from "../utils/paths.js";
import { fetchThemeCss } from "../registry/registry.js";
import inquirer from "inquirer";

function updateTsConfig(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  try {
    let content = fs.readFileSync(filePath, "utf8");
    
    // Check if compilerOptions exists
    if (!content.includes("compilerOptions")) {
      content = content.replace(/\{/, `{\n  "compilerOptions": {\n    "paths": {\n      "@/*": ["./src/*"]\n    }\n  },`);
    } else {
      // compilerOptions exists. Check if paths exists.
      const hasPaths = /"paths"\s*:\s*\{/.test(content);
      if (!hasPaths) {
        // Insert paths inside compilerOptions
        content = content.replace(/"compilerOptions"\s*:\s*\{/, `"compilerOptions": {\n    "paths": {\n      "@/*": ["./src/*"]\n    },`);
      } else {
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

    fs.writeFileSync(filePath, content, "utf8");
    console.log(chalk.green(`Configured import aliases in ${path.basename(filePath)}`));
  } catch (error: any) {
    console.log(chalk.yellow(`Failed to update ${path.basename(filePath)}: ${error.message}`));
  }
}

function updateViteConfig(root: string) {
  let viteConfigPath = path.join(root, "vite.config.ts");
  if (!fs.existsSync(viteConfigPath)) {
    const jsPath = path.join(root, "vite.config.js");
    if (fs.existsSync(jsPath)) {
      viteConfigPath = jsPath;
    } else {
      console.log(chalk.yellow("No vite.config.ts or vite.config.js found. Skipping Vite config configuration."));
      return;
    }
  }

  try {
    let content = fs.readFileSync(viteConfigPath, "utf8");

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
    } else {
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
    } else {
      // resolve exists. Check if alias exists.
      const aliasRegex = /alias\s*:\s*\{/;
      if (!aliasRegex.test(content)) {
        // Insert alias inside resolve
        const resolveRegex = /resolve\s*:\s*\{/;
        content = content.replace(resolveRegex, `resolve: {\n    alias: {\n      "@": path.resolve(__dirname, "./src"),\n    },`);
      } else {
        // alias exists. Check if "@" alias exists.
        if (!content.includes('"@"') && !content.includes("'@'")) {
          content = content.replace(aliasRegex, `alias: {\n      "@": path.resolve(__dirname, "./src"),`);
        }
      }
    }

    fs.writeFileSync(viteConfigPath, content, "utf8");
    console.log(chalk.green(`Configured tailwindcss and path aliases in ${path.basename(viteConfigPath)}`));
  } catch (error: any) {
    console.log(chalk.yellow(`Failed to update vite config: ${error.message}`));
  }
}

function updateMainTsx(root: string) {
  let mainPath = path.join(root, "src/main.tsx");
  if (!fs.existsSync(mainPath)) {
    const alternativePaths = [
      "src/main.jsx",
      "src/index.tsx",
      "src/index.jsx",
      "src/main.ts",
      "src/index.ts"
    ];
    for (const alt of alternativePaths) {
      const p = path.join(root, alt);
      if (fs.existsSync(p)) {
        mainPath = p;
        break;
      }
    }
  }

  if (!fs.existsSync(mainPath)) {
    console.log(chalk.yellow("No main/index entry file found. Skipping wrap."));
    return;
  }

  try {
    let content = fs.readFileSync(mainPath, "utf8");

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
      } else {
        // Fallback insertion point
        const importsEndIndex = content.lastIndexOf("import ");
        if (importsEndIndex !== -1) {
          const endOfLine = content.indexOf("\n", importsEndIndex) + 1;
          content = content.slice(0, endOfLine) + "\nconst queryClient = new QueryClient();\n" + content.slice(endOfLine);
        } else {
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
      } else {
        console.log(chalk.yellow("Could not automatically locate '<App />' in main entry file. Please wrap manually."));
      }
    }

    fs.writeFileSync(mainPath, content, "utf8");
    console.log(chalk.green(`Wrapped entry file ${path.basename(mainPath)} in QueryClientProvider and BrowserRouter`));
  } catch (error: any) {
    console.log(chalk.red(`Failed to update main entry file: ${error.message}`));
  }
}

export const initCommand = new Command()
  .name("init")
  .description("Initialize alfin config file, install Tailwind CSS, configure vite/tsconfig and setup CSS variables")
  .action(async () => {
    const root = getProjectRoot();
    const configPath = path.join(root, "alfin.config.json");

    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow("alfin.config.json already exists."));
      return;
    }

    // Auto-detect global CSS file
    let globalCssPath = "src/index.css";
    if (fs.existsSync(path.join(root, "src/index.css"))) {
      globalCssPath = "src/index.css";
    } else if (fs.existsSync(path.join(root, "src/App.css"))) {
      globalCssPath = "src/App.css";
    }

    const localRegistryPath = "c:/Users/Admin/Desktop/Alphaware/LMS/lms-product/alfin-registry";
    const registryUrl = fs.existsSync(localRegistryPath)
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

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(chalk.green("Created alfin.config.json successfully."));

    // Prompt for logo
    let logoPathInput = "";
    try {
      const logoAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "logoPath",
          message: "Enter path to logo image (press enter for default her.png from Vite):",
          default: ""
        }
      ]);
      logoPathInput = logoAnswer.logoPath.trim();
    } catch (e: any) {
      console.log(chalk.yellow(`Failed to prompt for logo: ${e.message}`));
    }

    const assetsDir = path.join(root, "src/assets");
    await fs.ensureDir(assetsDir);
    const targetLogoPath = path.join(assetsDir, "alfin-logo.jpg");

    if (logoPathInput) {
      const resolvedLogoPath = path.isAbsolute(logoPathInput) ? logoPathInput : path.join(root, logoPathInput);
      if (fs.existsSync(resolvedLogoPath)) {
        try {
          await fs.copy(resolvedLogoPath, targetLogoPath);
          console.log(chalk.green(`Successfully copied custom logo to ${path.relative(root, targetLogoPath)}`));
        } catch (copyErr: any) {
          console.log(chalk.red(`Failed to copy custom logo: ${copyErr.message}`));
        }
      } else {
        console.log(chalk.yellow(`Logo file not found at: ${resolvedLogoPath}. Falling back to default.`));
        logoPathInput = ""; // Trigger default fallback
      }
    }

    if (!logoPathInput) {
      // Look for her.png under project directory
      let sourceLogoPath = "";
      const searchPaths = [
        path.join(root, "src/assets/her.png"),
        path.join(root, "public/her.png"),
        path.join(root, "her.png"),
      ];
      for (const p of searchPaths) {
        if (fs.existsSync(p)) {
          sourceLogoPath = p;
          break;
        }
      }

      if (sourceLogoPath) {
        try {
          await fs.copy(sourceLogoPath, targetLogoPath);
          console.log(chalk.green(`Copied default ${path.basename(sourceLogoPath)} to ${path.relative(root, targetLogoPath)}`));
        } catch (copyErr: any) {
          console.log(chalk.red(`Failed to copy default logo: ${copyErr.message}`));
        }
      } else {
        // Fallback to copying vite.svg or react.svg or creating a small dummy placeholder
        const viteSvg = path.join(root, "public/vite.svg");
        const reactSvg = path.join(root, "src/assets/react.svg");
        if (fs.existsSync(viteSvg)) {
          try {
            await fs.copy(viteSvg, targetLogoPath);
            console.log(chalk.green(`Copied public/vite.svg as default logo to ${path.relative(root, targetLogoPath)}`));
          } catch (err: any) {
            console.log(chalk.red(`Failed to copy vite.svg: ${err.message}`));
          }
        } else if (fs.existsSync(reactSvg)) {
          try {
            await fs.copy(reactSvg, targetLogoPath);
            console.log(chalk.green(`Copied src/assets/react.svg as default logo to ${path.relative(root, targetLogoPath)}`));
          } catch (err: any) {
            console.log(chalk.red(`Failed to copy react.svg: ${err.message}`));
          }
        } else {
          // Write a dummy base64 1x1 png image
          const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
          try {
            await fs.writeFile(targetLogoPath, Buffer.from(dummyBase64, 'base64'));
            console.log(chalk.green(`Created placeholder logo at ${path.relative(root, targetLogoPath)}`));
          } catch (err: any) {
            console.log(chalk.red(`Failed to create placeholder logo: ${err.message}`));
          }
        }
      }
    }

    // Install tailwindcss latest, @tailwindcss/vite, clsx, and tailwind-merge
    if (fs.existsSync(path.join(root, "package.json"))) {
      let installCmd = "npm install";
      let installDevCmd = "npm install -D";
      if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) {
        installCmd = "pnpm add";
        installDevCmd = "pnpm add -D";
      } else if (fs.existsSync(path.join(root, "yarn.lock"))) {
        installCmd = "yarn add";
        installDevCmd = "yarn add -D";
      }

      try {
        console.log(chalk.cyan(`Installing tailwindcss and @tailwindcss/vite using ${installDevCmd.split(" ")[0]}...`));
        execSync(`${installDevCmd} tailwindcss @tailwindcss/vite`, { stdio: "inherit", cwd: root });
        console.log(chalk.green("Tailwind CSS dependencies installed successfully."));

        console.log(chalk.cyan(`Installing clsx and tailwind-merge using ${installCmd.split(" ")[0]}...`));
        execSync(`${installCmd} clsx tailwind-merge`, { stdio: "inherit", cwd: root });
        console.log(chalk.green("clsx and tailwind-merge dependencies installed successfully."));

        console.log(chalk.cyan(`Installing @tanstack/react-query, react-router-dom, and tw-animate-css using ${installCmd.split(" ")[0]}...`));
        execSync(`${installCmd} @tanstack/react-query react-router-dom tw-animate-css`, { stdio: "inherit", cwd: root });
        console.log(chalk.green("@tanstack/react-query, react-router-dom, and tw-animate-css dependencies installed successfully."));
      } catch (error: any) {
        console.log(chalk.red(`Failed to install dependencies: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow("No package.json found. Skipping dependency installation."));
    }

    // Create src/lib/utils.ts with cn utility function
    try {
      const utilsDir = path.join(root, "src/lib");
      const utilsPath = path.join(utilsDir, "utils.ts");
      if (!fs.existsSync(utilsPath)) {
        fs.ensureDirSync(utilsDir);
        const utilsContent = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
        fs.writeFileSync(utilsPath, utilsContent, "utf8");
        console.log(chalk.green("Created src/lib/utils.ts with cn utility function."));
      } else {
        console.log(chalk.yellow("src/lib/utils.ts already exists. Skipping creation."));
      }
    } catch (error: any) {
      console.log(chalk.red(`Failed to create src/lib/utils.ts: ${error.message}`));
    }

    // Configure vite.config.ts and tsconfigs
    updateViteConfig(root);
    updateTsConfig(path.join(root, "tsconfig.json"));
    updateTsConfig(path.join(root, "tsconfig.app.json"));
    updateMainTsx(root);

    try {
      console.log(chalk.cyan("Fetching theme variables from registry..."));
      const themeContent = await fetchThemeCss();
      
      const targetCssPath = path.join(root, globalCssPath);
      await fs.ensureDir(path.dirname(targetCssPath));

      let existingContent = "";
      if (fs.existsSync(targetCssPath)) {
        existingContent = fs.readFileSync(targetCssPath, "utf8");
      }

      // Check if variables or theme are already present to avoid double injection
      if (existingContent.includes("@theme") || existingContent.includes("--background:")) {
        console.log(chalk.yellow(`CSS variables already exist in ${globalCssPath}. Skipping setup.`));
      } else {
        // Append or write new content
        const separator = existingContent ? "\n\n" : "";
        fs.writeFileSync(targetCssPath, existingContent + separator + themeContent);
        console.log(chalk.green(`Successfully configured CSS variables in ${globalCssPath}`));
      }
    } catch (error: any) {
      console.log(chalk.red(`Failed to setup CSS variables: ${error.message}`));
    }

    console.log(chalk.cyan("Please update the registryUrl to match your live GitHub repository raw URL if needed."));
  });

