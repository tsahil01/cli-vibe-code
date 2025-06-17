#!/usr/bin/env node

import ora from 'ora';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { Command } from 'commander';
import { main } from '.';

const program = new Command();

program.name('vibe')
    .description('🌈 Vibe CLI - Vibe Code in Terminal')
    .version('1.0.0');

program.command('create')
    .description('Create a new component or feature')
    .argument('<description>', 'Description of what to create')
    .action(async (description: string) => {
        console.log(`Creating: ${description}`);
    });

program.command('explain')
    .description('Explain a specific file or component')
    .argument('<file>', 'File to Explain')
    .action(async (file: string) => {
        console.log(`Explaining: ${file}`);
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
        console.log("🌈 Vibe CLI Chat Agent");

        const answers = await inquirer.prompt({
            type: 'input',
            name: 'task',
            message: 'What can I do for you today?'
        })

        main(answers.task);
    });

program
    .command('list')
    .description('List files matching criteria')
    .argument('<criteria>', 'Criteria for listing files')
    .action(async (criteria: string) => {
        console.log(`Listing files: ${criteria}`);
    });


program.parse()