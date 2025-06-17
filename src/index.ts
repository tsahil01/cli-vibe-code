import dotenv from "dotenv";
import { llm } from "./llm";
import { SYSTEM_PROMPT } from "./prompts";
import { runTool } from "./tools";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import chalk from "chalk";
dotenv.config();

export async function main(userMessage: string) {
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
    ]
    
    // const userMessage = "Create a todo app in Desktop in html, css and javascript. make it complete working. and open it in VSCode";
    messages.push({ role: "user", content: userMessage });
    
    while (true) {
        const response = await llm(process.env.BASE_URL || "", process.env.API_KEY || "").chat.completions.create({
            model: "gemini-2.5-flash-preview-04-17",
            response_format: { type: "json_object" },
            messages: messages as ChatCompletionMessageParam[]
        });
    
        const responseContent = response.choices[0].message.content
        messages.push({ role: "assistant", content: responseContent || "" });
    
        const parsedResponse = JSON.parse(responseContent || "{}");
    
        if (parsedResponse.step && parsedResponse.step === "think") { 
            console.log(chalk.gray("Thinking: " + parsedResponse.content));
            continue;
        }
    
        if (parsedResponse.step && parsedResponse.step === "output") { 
            console.log(chalk.bold("Output: " + parsedResponse.content));
            break;
        }
    
        if (parsedResponse.step && parsedResponse.step === "action") {
            console.log(chalk.gray("ACTION: calling " + parsedResponse.tool + "(" + parsedResponse.input + ")"));
            const result = await runTool(parsedResponse.tool, parsedResponse.input);
            console.log(chalk.gray("Got the result from the tool call"));
            messages.push({ role: "assistant", content: JSON.stringify({ step: "observe", content: result }) });
            continue; 
        }
    
        if (parsedResponse.step && parsedResponse.step === "observe") {
            console.log(chalk.gray("OBSERVE: " + parsedResponse.content));
            continue;
        }
    }
    
}

// main();