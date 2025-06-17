import dotenv from "dotenv";
import { llm } from "./llm";
import { runTool } from "./tools";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import chalk from "chalk";
dotenv.config();

export async function mainChatControl(messages: ChatCompletionMessageParam[]) {
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
            console.log("🤖: " + parsedResponse.content);
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
