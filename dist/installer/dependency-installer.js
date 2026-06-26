"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDependencies = installDependencies;
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
function installDependencies(dependencies) {
    if (!dependencies || dependencies.length === 0) {
        return;
    }
    console.log(chalk_1.default.cyan(`Installing dependencies: ${dependencies.join(", ")}...`));
    try {
        (0, child_process_1.execSync)(`npm install ${dependencies.join(" ")}`, { stdio: "inherit" });
        console.log(chalk_1.default.green("Dependencies installed successfully."));
    }
    catch (error) {
        console.error(chalk_1.default.red("Failed to install dependencies."));
    }
}
