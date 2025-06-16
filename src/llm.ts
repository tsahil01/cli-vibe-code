import OpenAI from "openai";

export const llm = (baseURL: string, apiKey: string) => new OpenAI({
    baseURL,
    apiKey,
});

