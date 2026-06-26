import { execSync } from "child_process";
import chalk from "chalk";

export function installDependencies(dependencies: string[]) {
  if (!dependencies || dependencies.length === 0) {
    return;
  }

  console.log(chalk.cyan(`Installing dependencies: ${dependencies.join(", ")}...`));
  try {
    execSync(`npm install ${dependencies.join(" ")}`, { stdio: "inherit" });
    console.log(chalk.green("Dependencies installed successfully."));
  } catch (error) {
    console.error(chalk.red("Failed to install dependencies."));
  }
}
