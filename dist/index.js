#!/usr/bin/env node
"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const add_js_1 = require("./commands/add.js");
const init_js_1 = require("./commands/init.js");
const list_js_1 = require("./commands/list.js");
const apply_theme_js_1 = require("./commands/apply-theme.js");
const apply_auth_js_1 = require("./commands/apply-auth.js");
const program = new commander_1.Command();
program
    .name("alfin")
    .description("Alfin CLI - Internal Component & Module Registry")
    .version("1.0.0");
program.addCommand(add_js_1.addCommand);
program.addCommand(init_js_1.initCommand);
program.addCommand(list_js_1.listCommand);
program.addCommand(apply_theme_js_1.applyThemeCommand);
program.addCommand(apply_auth_js_1.applyAuthCommand);
program.parse(process.argv);
