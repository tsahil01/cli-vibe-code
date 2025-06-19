import { exec, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import * as Diff from 'diff';

const runningProcesses: { [key: string]: any } = {};

export const availableTools = `
- runCommand(command: string) : string - Executes any LINUX command and returns the STDOUT and STDERR. Some commands may require user confirmation, You need to handle that by yourself. Use && to run multiple commands.
- runBackgroundCommand(command: string, processId: string) : string - Runs a command in the background and returns immediately. The processId is used to track the process. If the command is a long-running process, use this tool. Use && to run multiple commands.
- stopProcess(processId: string) : string - Stops a running background process. Use this tool to stop the process.
- isProcessRunning(processId: string) : string - Checks if a process is still running.
- writeFile(filePath: string, content: string) : string - Writes content to a file. Use this tool to write content to a file.
- openFile(filePath: string) : string - Opens a file in the default application. Use this tool to open a file in the default application.
- editFile(filePath: string, content: string) : string - Edits a file and returns the result. Use this tool to edit a file. You should use the GNU patch format to edit the file.
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

const writeFile = (input: string) => {
    const [filePath, content] = input.split("|");
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

const editFile = (input: string) => {
    console.log("EDITING FILE");
    const [filePath, content] = input.split("|");
    if (!filePath || typeof filePath !== 'string') {
        return Promise.reject(new Error('Invalid file path: Path must be a non-empty string'));
    }
    if (!content || typeof content !== 'string') {
        return Promise.reject(new Error('Invalid content: Content cannot be null or undefined'));
    }
    console.log("FILE PATH", filePath);
    console.log("CONTENT", content);
    const expandedPath = expandHomeDir(filePath.trim());
    const normalizedDiff = content.replace(/\r\n/g, '\n');
    const patch = Diff.parsePatch(normalizedDiff);
    console.log("PATCH", patch);
    if (!patch || patch.length === 0) {
        return Promise.reject(new Error('Invalid patch format'));
    }
    const fileContent = fs.readFileSync(expandedPath, 'utf8');
    const result = Diff.applyPatch(fileContent, patch[0], {
        compareLine: (lineNumber: number, line: string, operation: string, patchContent: string) => {
            const normalizedLine = line.trim();
            const normalizedPatchLine = patchContent.trim();
            return normalizedLine === normalizedPatchLine;
        }   
    });
    console.log("RESULT", result);
    if (result === false) {
        return Promise.reject(new Error('Failed to apply patch - content mismatch'));
    }
    return writeFile(`${expandedPath}|${result}`);
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
        console.log("STARTING BACKGROUND PROCESS", command, processId);
        try {
            const [cmd, ...args] = command.split(' ');
            const process = spawn(cmd, args, {
                detached: true,
                stdio: 'ignore'
            });
            
            process.unref();
            runningProcesses[processId] = process;
            return Promise.resolve(`Process started with ID: ${processId}`);
        } catch (error) {
            return Promise.reject(new Error(`Failed to start background process: ${error instanceof Error ? error.message : 'Unknown error'}`));
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
        return 'Error: Invalid tool: Tool name must be a non-empty string';
    }
    if (input === undefined || input === null) {
        return 'Error: Invalid input: Input cannot be null or undefined';
    }

    try {
        switch (tool) {
            case "runCommand":
                return await runCommand(input);
            case "runBackgroundCommand":
                const [command, processId] = input.split("|");
                if (!command || !processId) {
                    return 'Error: Invalid input format: Expected "command|processId"';
                }
                return await runBackgroundCommand(command, processId);
            case "stopProcess":
                return await stopProcess(input);
            case "isProcessRunning":
                return await isProcessRunning(input);
            case "writeFile":
                return await writeFile(input);
            case "openFile":
                return await openFile(input);
            case "openBrowser":
                if (!input) {
                    return 'Error: Invalid URL: URL cannot be empty';
                }
                if (input.startsWith("http")) {
                    return await openBrowser(input);
                } else {
                    return await openBrowser(`https://${input}`);
                }
            case "editFile":
                return await editFile(input);
            default:
                return `Error: Tool ${tool} not found`;
        }
    } catch (error) {
        return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
}