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

export async function runTool(tool: string, input: string) {
    switch (tool) {
        case "runCommand":
            return await runCommand(input);
        case "writeFile":
            const [filePath, content] = input.split("|");
            return await writeFile(filePath, content);
        default:
            throw new Error(`Tool ${tool} not found`);
    }
}