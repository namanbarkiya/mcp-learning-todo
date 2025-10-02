declare module "@google/generative-ai" {
    export class GoogleGenerativeAI {
        constructor(apiKey: string);
        getGenerativeModel(config: unknown): {
            generateContent: (input: unknown) => Promise<unknown>;
        };
    }
}
