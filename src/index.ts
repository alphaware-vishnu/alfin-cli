#!/usr/bin/env node
/// <reference types="node" />

import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { applyThemeCommand } from "./commands/apply-theme.js";
import { applyAuthCommand } from "./commands/apply-auth.js";

const program = new Command();

program
  .name("alfin")
  .description("Alfin CLI - Internal Component & Module Registry")
  .version("1.0.0");

program.addCommand(addCommand);
program.addCommand(initCommand);
program.addCommand(listCommand);
program.addCommand(applyThemeCommand);
program.addCommand(applyAuthCommand);

program.parse(process.argv);
