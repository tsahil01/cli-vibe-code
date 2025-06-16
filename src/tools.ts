import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export const TOOL_MAP = {
    "runCommand": "runCommand",
    "writeFile": "writeFile"
}

export const availableTools = `
- runCommand(command: string) : string - Executes any LINUX command and returns the STDOUT and STDERR.
- writeFile(filePath: string, content: string) : string - Writes content to a file. 
- openFile(filePath: string) : string - Opens a file in the default application.
- openBrowser(url: string) : string - Opens a browser and navigates to the given URL.
- 
`

const expandHomeDir = (filePath: string) => {
    if (filePath.startsWith('~')) {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}

const runCommand = (command: string) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(`stdout: ${stdout}\n  stderr: ${stderr}`);
        });
    });
}

const writeFile = (filePath: string, content: string) => {
    const expandedPath = expandHomeDir(filePath.trim());
    return new Promise((resolve, reject) => {
        fs.writeFile(expandedPath, content, (error) => {
            if (error) {
                reject(error);
            }   
            resolve(`File ${expandedPath} written successfully`);
        });
    });
}

const openFile = (filePath: string) => {
    return new Promise((resolve, reject) => {
        exec(`xdg-open ${filePath}`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(`File ${filePath} opened successfully`);
        });
    });
}

const openBrowser = (url: string) => {

    return new Promise((resolve, reject) => {
        exec(`xdg-open ${url}`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(`Browser opened successfully`);
        });
    });
}


export async function runTool(tool: string, input: string) {
    switch (tool) {
        case "runCommand":
            return await runCommand(input);
        case "writeFile":
            const [filePath, content] = input.split("|");
            return await writeFile(filePath, content);
        case "openFile":
            return await openFile(input);
        case "openBrowser":
            if (input.startsWith("http")) {
                return await openBrowser(input);
            } else {
                return await openBrowser(`https://${input}`);
            }
        default:
            throw new Error(`Tool ${tool} not found`);
    }
}