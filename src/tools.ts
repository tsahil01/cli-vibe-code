import { exec, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import * as Diff from 'diff';

const runningProcesses: { [key: string]: any } = {};

export const availableTools = [
  { name: "runCommand", params: ["command"], desc: "Execute a Linux command and return output." },
  { name: "runBackgroundCommand", params: ["command", "processId"], desc: "Run a command in the background." },
  { name: "stopProcess", params: ["processId"], desc: "Stop a background process." },
  { name: "isProcessRunning", params: ["processId"], desc: "Check if a process is running." },
  { name: "checkCurrentDirectory", params: [], desc: "Get the current directory." },
  { name: "listFiles", params: ["filePath"], desc: "List files in a directory." },
  { name: "readFile", params: ["filePath"], desc: "Read a file's content." },
  { name: "writeFile", params: ["filePath", "content"], desc: "Write content to a file." },
  { name: "editFile", params: ["filePath", "content"], desc: "Edit a file using a patch." },
  { name: "openFile", params: ["filePath"], desc: "Open a file with the default application." },
  { name: "openBrowser", params: ["url"], desc: "Open a URL in the browser." },
  { name: "grepSearch", params: ["searchTerm", "filePath"], desc: "Search for a term in files." }
];

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

const checkCurrentDirectory = () => {
    const currentDirectory = process.cwd();
    return Promise.resolve(`Current directory: ${currentDirectory}`);
}

const listFiles = (filePath: string) => {
    if (!filePath || typeof filePath !== 'string') {
        return Promise.reject(new Error('Invalid file path: Path must be a non-empty string'));
    }
    const expandedPath = expandHomeDir(filePath.trim());
    return Promise.resolve(`Files in ${expandedPath}: ${fs.readdirSync(expandedPath)}`);
}

const readFile = (filePath: string) => {
    if (!filePath || typeof filePath !== 'string') {
        return Promise.reject(new Error('Invalid file path: Path must be a non-empty string'));
    }
    const expandedPath = expandHomeDir(filePath.trim());
    return new Promise((resolve, reject) => {
        fs.readFile(expandedPath, 'utf8', (error, data) => {
            if (error) {
                reject(new Error(`Failed to read file: ${error.message}`));
                return;
            }
            resolve(`File ${expandedPath} read successfully: ${data}`);
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

const grepSearch = (input: string) => {
    const [searchTerm, filePath] = input.split("|");
    if (!searchTerm || typeof searchTerm !== 'string') {
        return Promise.reject(new Error('Invalid search term: Search term must be a non-empty string'));
    }
    if (!filePath || typeof filePath !== 'string') {
        return Promise.reject(new Error('Invalid file path: File path must be a non-empty string'));
    }
    const expandedPath = expandHomeDir(filePath.trim());
    return new Promise((resolve, reject) => {
        exec(`grep -r ${searchTerm} ${expandedPath}`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Failed to grep search: ${error.message}`));
                return;
            }
            resolve(`Grep search result: ${stdout}`);
        });
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
            case "checkCurrentDirectory":
                return await checkCurrentDirectory();
            case "listFiles":
                return await listFiles(input);
            case "readFile":
                return await readFile(input);
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
            case "grepSearch":
                return await grepSearch(input);
            default:
                return `Error: Tool ${tool} not found`;
        }
    } catch (error) {
        return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
}