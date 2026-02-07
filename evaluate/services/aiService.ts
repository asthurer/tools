import { GoogleGenerativeAI } from '@google/generative-ai';
import { AISettings } from '../types';

export const aiService = {
    /**
     * Generates a simple text response from the AI.
     * @param prompt The prompt to send to the AI.
     * @param settings The AI settings (provider, model, apiKey).
     * @param organizationId Optional organization ID for usage tracking.
     */
    async generateText(prompt: string, settings: AISettings, organizationId?: string): Promise<string> {
        const { provider, model, apiKey } = settings;

        if (!apiKey) {
            throw new Error(`API Key for ${provider} is missing. Please configure it in Settings.`);
        }

        // Track usage if organizationId is provided (Evaluate specific logic)
        if (organizationId) {
            try {
                const { apiService } = await import('./api');
                const hasBalance = await apiService.checkAiUsageLimit(organizationId);
                if (!hasBalance) {
                    throw new Error("AI requests consumed for the day for this organization.");
                }
                // We increment usage regardless of success/failure of the actual AI call to prevent abuse? 
                // Or better to do it after success? The original code did it before.
                // Keeping it before to match original logic, but wrapped in try-catch to not block if logging fails
                apiService.incrementAiUsage(organizationId).catch(err => console.error('AI Usage Tracking failed:', err));
            } catch (usageError: any) {
                throw usageError; // Re-throw if it's a balance issue
            }
        }

        try {
            switch (provider) {
                case 'gemini': {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const geminiModel = genAI.getGenerativeModel({ model });
                    const result = await geminiModel.generateContent(prompt);
                    const response = await result.response;
                    return response.text();
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
                            'anthropic-version': '2023-06-01',
                            'anthropic-dangerous-direct-browser-access': 'true' // Required for client-side
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

    /**
     * Generates a JSON response from the AI.
     * @param prompt The prompt to send to the AI. Callers should instruct the AI to return JSON.
     * @param settings The AI settings (provider, model, apiKey).
     * @param organizationId Optional organization ID for usage tracking.
     */
    async generateJSON<T>(prompt: string, settings: AISettings, organizationId?: string): Promise<T> {
        try {
            // Enhance prompt to ensure JSON
            const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY raw JSON code. No markdown formatting like \`\`\`json.`;
            const text = await this.generateText(jsonPrompt, settings, organizationId);

            // Cleanup markdown code blocks if present (e.g. ```json ... ```)
            let cleanText = text.trim();
            if (cleanText.includes('```')) {
                const matches = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                cleanText = matches ? matches[1].trim() : cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            return JSON.parse(cleanText) as T;
        } catch (e: any) {
            console.error("AI JSON Generation failed", e);
            // Fallback: try to extract JSON object from text if parse failed
            try {
                const matches = (e.message || "").match(/{[\s\S]*}/);
                if (matches) return JSON.parse(matches[0]) as T;
            } catch { }
            throw new Error(e.message || "AI JSON generation failed");
        }
    }
};
