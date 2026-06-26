import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import { getProjectRoot } from "../utils/paths.js";
import { fetchThemeCss } from "../registry/registry.js";

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

