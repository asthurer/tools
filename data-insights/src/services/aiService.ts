import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProviderType = 'gemini' | 'openai' | 'claude';

export interface AISettings {
    provider: AIProviderType;
    model: string;
    apiKey: string;
}

export const aiService = {
    async generateText(prompt: string, settings: AISettings): Promise<string> {
        const { provider, model, apiKey } = settings;

        if (!apiKey) {
            throw new Error(`API Key for ${provider} is missing.`);
        }

        try {
            switch (provider) {
                case 'gemini': {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const geminiModel = genAI.getGenerativeModel({ model });
                    const result = await geminiModel.generateContent(prompt);
                    return (await result.response).text();
                }

                case 'openai': {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: prompt }]
                        })
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);
                    return data.choices[0]?.message?.content || '';
                }

                case 'claude': {
                    const response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01'
                        },
                        body: JSON.stringify({
                            model: model,
                            max_tokens: 4096,
                            messages: [{ role: 'user', content: prompt }]
                        })
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);
                    return data.content[0]?.text || '';
                }

                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (e: any) {
            console.error(`AI Generation failed (${provider}):`, e);
            throw new Error(e.message || `${provider} generation failed`);
        }
    },

    async generateJSON<T>(prompt: string, settings: AISettings): Promise<T> {
        try {
            const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY raw JSON code. No markdown formatting.`;
            const text = await this.generateText(jsonPrompt, settings);

            let cleanText = text.trim();
            if (cleanText.includes('```')) {
                const matches = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                cleanText = matches ? matches[1].trim() : cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            return JSON.parse(cleanText) as T;
        } catch (e: any) {
            console.error("AI JSON Generation failed:", e);
            // Fallback extraction
            try {
                const matches = (e.message || "").match(/{[\s\S]*}/);
                if (matches) return JSON.parse(matches[0]) as T;
            } catch { }
            throw new Error(e.message || "AI JSON generation failed");
        }
    }
};
