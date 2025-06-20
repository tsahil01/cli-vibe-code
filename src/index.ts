#!/usr/bin/env node

import inquirer from 'inquirer';
import { Command } from 'commander';
import { mainChatControl } from './control';
import { chatRolePlay, createRolePlay, explainRolePlay, fixRolePlay, superAIAgentRolePlay, SYSTEM_PROMPT } from './prompts';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import fs from 'fs/promises';
const path = require('path');

const program = new Command();

program.name('vibe')
    .description('🌈 Vibe CLI - Vibe Code in Terminal')
    .version('1.0.0')

program.command('create')
    .description('Create a new component or feature')
    .argument('<description>', 'Description of what to create')
    .action(async (description: string) => {
        console.log("🌈 Vibe CLI Create Agent");
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT(createRolePlay) },
        ]
        messages.push({ role: "user", content: description });
        while (true) {
            await mainChatControl(messages);
            const answers = await inquirer.prompt({
                type: 'input',
                name: 'task',
                message: 'Anything else you want to ask?'
            });
            if (answers.task.toLowerCase() === "exit") {
                console.log("👋 Bye!");
                break;
            }
            messages.push({ role: "user", content: answers.task });
        }
    });

program.command('fix')
    .description('Fix a specific file or component')
    .argument('<file>', 'File to Fix (can be full path)')
    .argument('[issue]', 'Issue to Fix (optional)')
    .action(async (file: string, issue: string) => {
        console.log("🌈 Vibe CLI Fix Agent");
        if (file.includes("/")) {
            try {
                const fileFound = await fs.stat(file);
                if (!fileFound) {
                    console.log("File not found. You can give the full path of the file and try again.");
                    return;
                }
            } catch (error) {
                console.log("File not found. You can give the full path of the file and try again.");
                return;
            }
        } else {
            const files = await fs.readdir(process.cwd());
            const fileFound = files.find(f => f.toLowerCase() === file.toLowerCase());
            if (!fileFound) {
                console.log("File not found in the project. You can give the full path of the file and try again.");
                return;
            }
        }
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT(fixRolePlay) },
        ]
        messages.push({ role: "user", content: `File: ${file}, \n${issue ? `Issue: ${issue}` : "Fix the code issues in the file"}` });
        while (true) {
            await mainChatControl(messages);
            const answers = await inquirer.prompt({
                type: 'input',
                name: 'task',
                message: 'Anything else you want to ask?'
            });
            if (answers.task.toLowerCase() === "exit") {
                console.log("👋 Bye!");
                break;
            }
            messages.push({ role: "user", content: answers.task });
        }
    });

program.command('explain')
    .description('Explain a specific file or component')
    .argument('<file>', 'File to Explain (can be full path)')
    .action(async (file: string) => {
        console.log("🌈 Vibe CLI Explain Agent");
        if (file.includes("/")) {
            try {
                const fileFound = await fs.stat(file);
                if (!fileFound) {
                    console.log("File not found. You can give the full path of the file and try again.");
                    return;
                }
            } catch (error) {
                console.log("File not found. You can give the full path of the file and try again.");
                return;
            }
        } else {
        const files = await fs.readdir(process.cwd());
        const fileFound = files.find(f => f.toLowerCase() === file.toLowerCase());
        if (!fileFound) {
                console.log("File not found in the project. You can give the full path of the file and try again.");
                return;
            }
        }
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT(explainRolePlay) },
        ]
        messages.push({ role: "user", content: file });
        while (true) {
            await mainChatControl(messages);
            const answers = await inquirer.prompt({
                type: 'input',
                name: 'task',
                message: 'Anything else you want to ask?'
            });
            if (answers.task.toLowerCase() === "exit") {
                console.log("👋 Bye!");
                break;
            }
            messages.push({ role: "user", content: answers.task });
        }
    });

program
    .command('commit')
    .description('Create a commit with AI-generated message')
    .argument('<message>', 'Commit message')
    .action(async (message: string) => {
        console.log(`Committing: ${message}`);
    });

program
    .command('deploy')
    .description('Deploy to a platform')
    .argument('<platform>', 'Platform to deploy to (e.g., vercel)')
    .action(async (platform: string) => {
        console.log(`Deploying to: ${platform}`);
    });

program
    .command('chat')
    .description('Start an interactive chat session')
    .action(async () => {
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT(chatRolePlay) },
        ]
        console.log("🌈 Vibe CLI Chat Agent");
        while (true) {
            const answers = await inquirer.prompt({
                type: 'input',
                name: 'task',
                message: 'What can I do for you today?'
            });

            if (answers.task.toLowerCase() === "exit") {
                console.log("👋 Bye!");
                break;
            }
            messages.push({ role: "user", content: answers.task });
            await mainChatControl(messages);
        }
    });

program
  .arguments('<dirPath>')
  .action(async (dirPath: string) => {
    if (dirPath === ".") {
        dirPath = process.cwd();
        console.log(`The current directory is: ${dirPath}`);
    }
    dirPath = path.resolve(dirPath);
    let stat;
    try {
        stat = await fs.stat(dirPath);
    } catch (e) {
        console.error(`Error:`, e);
        console.log(`'${dirPath}' does not exist.`);
        return;
    }
    if (stat.isDirectory()) {
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT(superAIAgentRolePlay) },
        ];
        messages.push({ role: "user", content: `The current directory is: ${dirPath}` });
        console.log("🌈 Vibe CLI SUPER AI Agent");
        while (true) {
            try {
                await mainChatControl(messages);
            } catch (e) {
                console.error("Error in mainChatControl:", e);
            }
            const answers = await inquirer.prompt({
                type: 'input',
                name: 'task',
                message: '>'
            });
            if (answers.task.toLowerCase() === "exit") {
                console.log("👋 Bye!");
                break;
            }
            messages.push({ role: "user", content: answers.task });
        }   
    } else {
        console.log(`'${dirPath}' is not a directory.`);
    }
  });

program.addHelpText('after', `\nSpecial Usage:\n  vibe <dirPath>        Launch SUPER AI Agent in the specified directory\n\nExamples:\n  vibe .                Launch in current directory\n  vibe src              Launch in 'src' directory\n`);

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();