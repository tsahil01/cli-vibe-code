import { exec } from "child_process";

export const TOOL_MAP = {
    "runCommand": "runCommand" 
}

export const availableTools = `
- runCommand(command: string) : string - Executes any LINUX command and returns the STDOUT and STDERR. To write a file, use the following command: echo <your content> > <your_file.txt>
`;

export const runCommand = (command: string) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(`stdout: ${stdout}\n  stderr: ${stderr}`);
        });
    });
}

export async function runTool(tool: string, input: string) {
    switch (tool) {
        case "runCommand":
            return await runCommand(input);
        default:
            throw new Error(`Tool ${tool} not found`);
    }
}