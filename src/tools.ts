import { exec, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const runningProcesses: { [key: string]: any } = {};

export const availableTools = `
- runCommand(command: string) : string - Executes any LINUX command and returns the STDOUT and STDERR. Some commands may require user confirmation, You need to handle that by yourself. Use && to run multiple commands.
- runBackgroundCommand(command: string, processId: string) : string - Runs a command in the background and returns immediately. The processId is used to track the process. If the command is a long-running process, use this tool. Use && to run multiple commands.
- stopProcess(processId: string) : string - Stops a running background process. Use this tool to stop the process.
- isProcessRunning(processId: string) : string - Checks if a process is still running.
- writeFile(filePath: string, content: string) : string - Writes content to a file. Use this tool to write content to a file.
- openFile(filePath: string) : string - Opens a file in the default application. Use this tool to open a file in the default application.
- openBrowser(url: string) : string - Opens a browser and navigates to the given URL. Use this tool to open a browser and navigate to the given URL.
`

const expandHomeDir = (filePath: string) => {
    if (filePath.startsWith('~')) {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}

const runCommand = (command: string) => {
    if (!command || typeof command !== 'string') {
        return Promise.reject(new Error('Invalid command: Command must be a non-empty string'));
    }
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Command execution failed: ${error.message}`));
                return;
            }
            resolve(`stdout: ${stdout}\n  stderr: ${stderr}`);
        });
    });
}

const writeFile = (filePath: string, content: string) => {
    if (!filePath || typeof filePath !== 'string') {
        return Promise.reject(new Error('Invalid file path: Path must be a non-empty string'));
    }
    if (content === undefined || content === null) {
        return Promise.reject(new Error('Invalid content: Content cannot be null or undefined'));
    }
    const expandedPath = expandHomeDir(filePath.trim());
    return new Promise((resolve, reject) => {
        fs.writeFile(expandedPath, content, (error) => {
            if (error) {
                reject(new Error(`Failed to write file: ${error.message}`));
                return;
            }   
            resolve(`File ${expandedPath} written successfully`);
        });
    });
}

const openFile = (filePath: string) => {
    if (!filePath || typeof filePath !== 'string') {
        return Promise.reject(new Error('Invalid file path: Path must be a non-empty string'));
    }
    return new Promise((resolve, reject) => {
        exec(`xdg-open ${filePath}`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Failed to open file: ${error.message}`));
                return;
            }
            resolve(`File ${filePath} opened successfully`);
        });
    });
}

const openBrowser = (url: string) => {
    if (!url || typeof url !== 'string') {
        return Promise.reject(new Error('Invalid URL: URL must be a non-empty string'));
    }
    return new Promise((resolve, reject) => {
        exec(`xdg-open ${url}`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Failed to open browser: ${error.message}`));
                return;
            }
            resolve(`Browser opened successfully`);
        });
    });
}

const runBackgroundCommand = (command: string, processId: string) => {
    if (!command || typeof command !== 'string') {
        return Promise.reject(new Error('Invalid command: Command must be a non-empty string'));
    }
    if (!processId || typeof processId !== 'string') {
        return Promise.reject(new Error('Invalid process ID: Process ID must be a non-empty string'));
    }
    return new Promise((resolve, reject) => {
        try {
            const [cmd, ...args] = command.split(' ');
            const process = spawn(cmd, args, {
                detached: true,
                stdio: 'ignore'
            });
            
            process.unref();
            runningProcesses[processId] = process;
            
            resolve(`Process started with ID: ${processId}`);
        } catch (error) {
            reject(new Error(`Failed to start background process: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
    });
}

const stopProcess = (processId: string) => {
    if (!processId || typeof processId !== 'string') {
        return Promise.reject(new Error('Invalid process ID: Process ID must be a non-empty string'));
    }
    return new Promise((resolve, reject) => {
        const process = runningProcesses[processId];
        if (!process) {
            reject(new Error(`No process found with ID: ${processId}`));
            return;
        }
        
        try {
            process.kill();
            delete runningProcesses[processId];
            resolve(`Process ${processId} stopped successfully`);
        } catch (error) {
            reject(new Error(`Failed to stop process: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
    });
}

const isProcessRunning = (processId: string) => {
    if (!processId || typeof processId !== 'string') {
        return Promise.reject(new Error('Invalid process ID: Process ID must be a non-empty string'));
    }
    return Promise.resolve(`Process ${processId} is ${runningProcesses[processId] ? 'running' : 'not running'}`);
}

export async function runTool(tool: string, input: string) {
    if (!tool || typeof tool !== 'string') {
        throw new Error('Invalid tool: Tool name must be a non-empty string');
    }
    if (input === undefined || input === null) {
        throw new Error('Invalid input: Input cannot be null or undefined');
    }

    try {
        switch (tool) {
            case "runCommand":
                return await runCommand(input);
            case "runBackgroundCommand":
                const [command, processId] = input.split("|");
                if (!command || !processId) {
                    throw new Error('Invalid input format: Expected "command|processId"');
                }
                return await runBackgroundCommand(command, processId);
            case "stopProcess":
                return await stopProcess(input);
            case "isProcessRunning":
                return await isProcessRunning(input);
            case "writeFile":
                const [filePath, content] = input.split("|");
                if (!filePath || content === undefined) {
                    throw new Error('Invalid input format: Expected "filePath|content"');
                }
                return await writeFile(filePath, content);
            case "openFile":
                return await openFile(input);
            case "openBrowser":
                if (!input) {
                    throw new Error('Invalid URL: URL cannot be empty');
                }
                if (input.startsWith("http")) {
                    return await openBrowser(input);
                } else {
                    return await openBrowser(`https://${input}`);
                }
            default:
                throw new Error(`Tool ${tool} not found`);
        }
    } catch (error) {
        throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}