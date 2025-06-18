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
    
        let parsedResponse;
        try {
            const cleanedContent = responseContent?.trim() || "{}";
            parsedResponse = JSON.parse(cleanedContent);
        } catch (error) {
            console.error(chalk.red("Error parsing JSON response, trying again..."));
            messages.push({ 
                role: "user", 
                content: "The previous response was not valid JSON. Please provide a properly formatted JSON response." 
            });
            continue;
        }
    
        if (parsedResponse.step && parsedResponse.step === "think") { 
            console.log(chalk.dim("Thinking: " + parsedResponse.content));
            continue;
        }
    
        if (parsedResponse.step && parsedResponse.step === "output") { 
            console.log("🤖: " + parsedResponse.content);
            break;
        }
    
        if (parsedResponse.step && parsedResponse.step === "action") {
            console.log("CALLING ACTION", parsedResponse.tool, parsedResponse.input);
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
