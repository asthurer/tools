import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AISettings } from '../types/settings';

export async function askGemini(context: string, question: string, settings: AISettings, fileData?: { mimeType: string; data: string }): Promise<string> {
    const { apiKey, model: modelName, provider } = settings;

    if (!apiKey) {
        return `Error: API Key for ${provider || 'Gemini'} is missing. Please check your settings.`;
    }

    try {
        switch (provider) {
            case 'openai': {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName || 'gpt-4-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: `You are a helpful Document Q&A Assistant. Answer the user's question based on the provided context.
                                Instructions:
                                - Analyze the context and provide summaries if asked.
                                - Use Markdown formatting (bold, bullets, headings).
                                ${!fileData ? 'CONTEXT:' + context.slice(0, 100000) : ''}
                                `
                            },
                            {
                                role: 'user',
                                content: fileData && fileData.mimeType.startsWith('image/')
                                    ? [
                                        { type: "text", text: question },
                                        {
                                            type: "image_url",
                                            image_url: {
                                                "url": `data:${fileData.mimeType};base64,${fileData.data}`
                                            }
                                        }
                                    ]
                                    : [
                                        { type: "text", text: context ? `Document Content:\n${context.slice(0, 100000)}\n\nQuestion: ${question}` : question }
                                    ]
                            }
                        ]
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.choices?.[0]?.message?.content || "No response received.";
            }

            case 'claude': {
                // Format messages for Claude
                const messages: any[] = [{
                    role: 'user',
                    content: []
                }];

                if (fileData && fileData.mimeType.startsWith('image/')) {
                    messages[0].content.push({
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: fileData.mimeType,
                            data: fileData.data
                        }
                    });
                }

                messages[0].content.push({
                    type: "text",
                    text: `Document Context:\n${context.slice(0, 100000)}\n\nQuestion: ${question}`
                });

                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'dangerously-allow-browser': 'true' // Client-side specific
                    },
                    body: JSON.stringify({
                        model: modelName || 'claude-3-opus-20240229',
                        max_tokens: 4096,
                        system: "You are a helpful Document Q&A Assistant. Answer based on the provided context. Use Markdown.",
                        messages: messages
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.content?.[0]?.text || "No response received.";
            }

            case 'gemini':
            default: {
                // Gemini Implementation
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName });

                const textPart = {
                    text: `
            You are a helpful and intelligent Document Q&A Assistant.
            Your goal is to answer the user's question based on the provided document context.

            Instructions:
            - If the user asks for a summary, overview, or what the document is about, analyze the entire context and provide a concise summary.
            - If the user asks a specific question, answer it using only the information in the document.
            - If the answer strictly cannot be found in the document, politely say so, but try to be helpful if the question is related to the document's topic.
            - **Format your response using Markdown**. Use **bold** for key terms, *bullets* for lists, and headings for sections to make it easy to read.

            DOCUMENT TEXT CONTEXT (Extracted):
            ${context.slice(0, 500000)}

            USER QUESTION:
            ${question}
            `
                };

                const parts: any[] = [textPart];

                if (fileData) {
                    parts.push({
                        inlineData: {
                            mimeType: fileData.mimeType,
                            data: fileData.data
                        }
                    });
                }

                const result = await model.generateContent(parts);
                const response = await result.response;
                return response.text();
            }
        }

    } catch (error: any) {
        console.error("Error calling AI API:", error);

        const errorMessage = error.message || '';
        if (errorMessage.includes('404') && provider === 'gemini') {
            return `Error: Model '${modelName}' not found. Please check the model name in Settings (e.g., try 'gemini-1.5-flash' or 'gemini-pro').`;
        }

        return `Error: ${errorMessage}. Please check your API key and Settings.`;
    }
}
