import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { getProjectRoot } from "../utils/paths.js";
import { fetchThemeProvider, fetchRegistryIndex } from "../registry/registry.js";
import { installItem } from "./add.js";

export const applyThemeCommand = new Command()
  .name("apply-theme")
  .description("Install theme provider and apply it to App.tsx")
  .action(async () => {
    const root = getProjectRoot();
    const configPath = path.join(root, "alfin.config.json");

    if (!fs.existsSync(configPath)) {
      console.error(chalk.red("alfin.config.json not found. Run 'alfin init' first."));
      process.exit(1);
    }

    // Prompt user if they want to install appearance settings too
    const answer = await inquirer.prompt([
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
      const themeProviderContent = await fetchThemeProvider();
      const contextsDir = path.join(root, "src", "contexts");
      await fs.ensureDir(contextsDir);
      
      const themeProviderPath = path.join(contextsDir, "theme-provider.tsx");
      await fs.writeFile(themeProviderPath, themeProviderContent, "utf8");
      spinner.text = "Created src/contexts/theme-provider.tsx";

      // 2. Find and wrap App.tsx
      const appPath = path.join(root, "src", "App.tsx");
      if (!fs.existsSync(appPath)) {
        spinner.warn("src/App.tsx not found. Theme provider written, but not applied to App.tsx.");
      } else {
        spinner.text = "Applying ThemeProvider wrapping in src/App.tsx...";
        const appContent = await fs.readFile(appPath, "utf8");

        if (appContent.includes("ThemeProvider") && appContent.includes("vite-theme-ui")) {
          spinner.text = "ThemeProvider is already configured in src/App.tsx.";
        } else {
          // Read configuration to check if aliases are used
          const config = await fs.readJSON(configPath);
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

              await fs.writeFile(appPath, updatedContent, "utf8");
              spinner.text = "Successfully installed ThemeProvider and wrapped src/App.tsx.";
            } else {
              spinner.warn("Failed to find the closing return statement in src/App.tsx.");
            }
          } else {
            spinner.warn("Failed to find the return statement in src/App.tsx.");
          }
        }
      }

      // 3. Install appearance module if requested
      if (answer.addAppearance) {
        spinner.text = "Fetching registry index...";
        const registry = await fetchRegistryIndex();
        spinner.text = "Installing appearance settings module...";
        await installItem("appearance", registry, spinner);
        spinner.succeed("Successfully installed ThemeProvider, wrapped App.tsx, and added Appearance settings.");
      } else {
        spinner.succeed("Successfully installed ThemeProvider and wrapped App.tsx.");
      }

    } catch (error: any) {
      spinner.fail(`Failed to apply theme: ${error.message}`);
    }
  });
