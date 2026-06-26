import { Command } from "commander";
import chalk from "chalk";
import { fetchRegistryIndex } from "../registry/registry.js";

export const listCommand = new Command()
  .name("list")
  .description("List available items in the registry")
  .action(async () => {
    try {
      const registry = await fetchRegistryIndex();
      console.log(chalk.bold("\nAvailable items:\n"));

      for (const [category, items] of Object.entries(registry)) {
        console.log(chalk.cyan(category.toUpperCase()));
        const itemNames = Object.keys(items as Record<string, any>);
        itemNames.forEach((name, index) => {
          const isLast = index === itemNames.length - 1;
          const prefix = isLast ? "└──" : "├──";
          console.log(`  ${prefix} ${name}`);
        });
        console.log("");
      }
    } catch (error: any) {
      console.error(chalk.red(error.message));
    }
  });
