import dotenv from "dotenv";
import { llm } from "./llm";
import { runTool } from "./tools";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import chalk from "chalk";
import ora from "ora";
dotenv.config();

export async function mainChatControl(messages: ChatCompletionMessageParam[]) {
    while (true) {
        const spinner = ora().start();
        const response = await llm(process.env.BASE_URL || "", process.env.API_KEY || "").chat.completions.create({
            model: "gemini-2.5-flash-preview-04-17",
            response_format: { type: "json_object" },
            messages: messages as ChatCompletionMessageParam[],
            temperature: 0.2    
        });
        spinner.stop();
    
        const responseContent = response.choices[0].message.content
        messages.push({ role: "assistant", content: responseContent || "" });
    
        const parsedResponse = JSON.parse(responseContent || "{}");
    
        if (parsedResponse.step && parsedResponse.step === "think") { 
            console.log(chalk.dim("Thinking: " + parsedResponse.content));
            continue;
        }
    
        if (parsedResponse.step && parsedResponse.step === "output") { 
            console.log("🤖: " + parsedResponse.content);
            break;
        }
    
        if (parsedResponse.step && parsedResponse.step === "action") {
            const actionSpinner = ora(`Calling Action: ${parsedResponse.tool}(${parsedResponse.input})`).start();
            const result = await runTool(parsedResponse.tool, parsedResponse.input);
            actionSpinner.succeed(`Action completed: ${parsedResponse.tool}`);
            messages.push({ role: "assistant", content: JSON.stringify({ step: "observe", content: result }) });
            continue; 
        }
    
        if (parsedResponse.step && parsedResponse.step === "observe") {
            console.log(chalk.dim("OBSERVE: " + parsedResponse.content));
            continue;
        }
    }
}
