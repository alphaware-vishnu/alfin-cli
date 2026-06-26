"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const registry_js_1 = require("../registry/registry.js");
exports.listCommand = new commander_1.Command()
    .name("list")
    .description("List available items in the registry")
    .action(async () => {
    try {
        const registry = await (0, registry_js_1.fetchRegistryIndex)();
        console.log(chalk_1.default.bold("\nAvailable items:\n"));
        for (const [category, items] of Object.entries(registry)) {
            console.log(chalk_1.default.cyan(category.toUpperCase()));
            const itemNames = Object.keys(items);
            itemNames.forEach((name, index) => {
                const isLast = index === itemNames.length - 1;
                const prefix = isLast ? "└──" : "├──";
                console.log(`  ${prefix} ${name}`);
            });
            console.log("");
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(error.message));
    }
});
