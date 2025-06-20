import dotenv from "dotenv";
import { llm } from "./llm";
import { runTool } from "./tools";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
dotenv.config();

export async function mainChatControl(messages: ChatCompletionMessageParam[]) {
    const MAX_HISTORY = 30;
    while (true) {
        let truncatedMessages = messages;
        if (messages.length > MAX_HISTORY + 2) {
            truncatedMessages = [messages[0], messages[1], ...messages.slice(-MAX_HISTORY)];
        }
        const spinner = ora().start();
        const response = await llm(process.env.BASE_URL || "", process.env.API_KEY || "").chat.completions.create({
            model: "gemini-2.5-flash-preview-04-17",
            response_format: { type: "json_object" },
            messages: truncatedMessages as ChatCompletionMessageParam[],
            temperature: 0.2
        });
        spinner.stop();

        const responseContent = response.choices[0].message.content
        const lastMsg = messages[messages.length - 1];
        if (!(lastMsg && lastMsg.role === "assistant" && lastMsg.content === responseContent)) {
            messages.push({ role: "assistant", content: responseContent || "" });
        }

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
            if (parsedResponse.tool == "runCommand" || parsedResponse.tool == "runBackgroundCommand" || parsedResponse.tool == "stopProcess" || parsedResponse.tool == "openBrowser" || parsedResponse.tool == "editFile" || parsedResponse.tool == "openFile" || parsedResponse.tool == "writeFile") {
            const { confirm } = await inquirer.prompt([{
                type: "confirm",
                name: "confirm",
                message: `Call the tool? ${parsedResponse.tool}`,
                default: true
            }]);
            if (!confirm) {
                messages.push({ role: "assistant", content: JSON.stringify({ step: "observe", content: "User did not confirm the action" }) });
                continue;
            }
        }
            const actionSpinner = ora(`Calling Action: ${parsedResponse.description || parsedResponse.tool}`).start();
            const result = await runTool(parsedResponse.tool, parsedResponse.input);
            actionSpinner.succeed(`Action completed: ${parsedResponse.tool}, ${parsedResponse.description}`);
            // Prevent duplicate observe messages
            const lastMsg = messages[messages.length - 1];
            const observeMsg = JSON.stringify({ step: "observe", content: result });
            if (!(lastMsg && lastMsg.role === "assistant" && lastMsg.content === observeMsg)) {
                messages.push({ role: "assistant", content: observeMsg });
            }
            continue;
        }

        if (parsedResponse.step && parsedResponse.step === "observe") {
            console.log(chalk.dim("OBSERVE: " + parsedResponse.content));
            continue;
        }
    }
}
