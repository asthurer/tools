import { GoogleGenerativeAI } from '@google/generative-ai';

const getClient = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
        console.warn("No Google API Key found");
        throw new Error("API Key missing. Please configure VITE_GOOGLE_API_KEY.");
    }
    return new GoogleGenerativeAI(apiKey);
};

export const aiService = {
    /**
     * Generates a simple text response from the AI.
     * @param prompt The prompt to send to the AI.
     * @param organizationId Optional organization ID for usage tracking.
     * @param modelName Optional model name, defaults to "gemini-2.5-flash".
     */
    async generateText(prompt: string, organizationId?: string, modelName: string = "gemini-2.5-flash"): Promise<string> {
        try {
            if (organizationId) {
                const { apiService } = await import('./api');
                const hasBalance = await apiService.checkAiUsageLimit(organizationId);
                if (!hasBalance) {
                    throw new Error("AI requests consumed for the day");
                }
                apiService.incrementAiUsage(organizationId).catch(err => console.error('AI Usage Tracking failed:', err));
            }
            const genAI = getClient();
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (e: any) {
            console.error("AI Text Generation failed", e);
            throw new Error(e.message || "AI generation failed");
        }
    },

    /**
     * Generates a JSON response from the AI.
     * @param prompt The prompt to send to the AI. Callers should instruct the AI to return JSON.
     * @param organizationId Optional organization ID for usage tracking.
     * @param modelName Optional model name, defaults to "gemini-2.5-flash".
     */
    async generateJSON<T>(prompt: string, organizationId?: string, modelName: string = "gemini-2.5-flash"): Promise<T> {
        try {
            const text = await this.generateText(prompt, organizationId, modelName);

            // Cleanup markdown code blocks if present (e.g. ```json ... ```)
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanText) as T;
        } catch (e: any) {
            console.error("AI JSON Generation failed", e);
            throw new Error(e.message || "AI JSON generation failed");
        }
    }
};
