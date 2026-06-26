import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { getProjectRoot, getConfig } from "../utils/paths.js";

export async function copySourceFile(itemData: any, filename: string, content: string, spinner?: any) {
  const config = getConfig();
  const root = getProjectRoot();
  
  // Determine base target directory
  let baseDir = itemData.target;
  if (!baseDir) {
    if (itemData.type === "ui" && config.componentsDir) {
      baseDir = `${config.componentsDir}/ui`;
    } else if (itemData.type === "module" && config.modulesDir) {
      baseDir = config.modulesDir;
    } else if (itemData.type === "feature" && config.featuresDir) {
      baseDir = config.featuresDir;
    } else if (itemData.type === "section" && config.sectionsDir) {
      baseDir = config.sectionsDir;
    } else {
      baseDir = "src/components";
    }
  }
  
  // Resolve final path including subdirectory hierarchy of the file
  const targetFile = path.join(root, baseDir, filename);
  const targetDir = path.dirname(targetFile);

  if (fs.existsSync(targetFile)) {
    if (spinner) spinner.stop();
    const relativeTarget = path.relative(root, targetFile);
    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "override",
        message: `File already exists: ${chalk.yellow(relativeTarget)}. Would you like to override it?`,
        default: false
      }
    ]);
    if (spinner) spinner.start();

    if (!answers.override) {
      if (spinner) {
        spinner.text = `Skipped overriding: ${relativeTarget}`;
      } else {
        console.log(chalk.blue(`Skipped overriding: ${relativeTarget}`));
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
    } else if (config.aliases.components) {
      finalContent = finalContent.replace(/@\/components/g, config.aliases.components);
    }
  }

  await fs.ensureDir(targetDir);
  await fs.writeFile(targetFile, finalContent);
  
  const relativeCreated = path.relative(root, targetFile);
  if (spinner) {
    spinner.text = `Created ${relativeCreated}`;
  } else {
    console.log(chalk.green(`Created ${relativeCreated}`));
  }
}
