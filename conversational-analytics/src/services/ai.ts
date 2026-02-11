import { GoogleGenerativeAI } from "@google/generative-ai";
import { SCHEMA_DEFINITION } from "../data/mockData";
import { type AISettings } from "../types/settings";

// Define the return type
export interface AIResponse {
    sql: string;
    visualization?: {
        type: 'bar' | 'line' | 'pie';
        xKey: string;
        yKey: string;
        title: string;
    };
    error?: string;
}

export const generateSQL = async (
    userQuery: string,
    settings: AISettings
): Promise<AIResponse> => {
    const { provider, model, apiKey } = settings;

    if (!apiKey) {
        throw new Error("API Key is missing. Please configure it in settings.");
    }

    const prompt = `
    You are a SQL expert and Data Analyst. Your job is to convert natural language questions into SQL queries and recommend visualizations.

    Schema:
    ${SCHEMA_DEFINITION}

    Rules:
    1. Return ONLY a JSON object. Do not include markdown formatting.
    2. Use standard SQL compatible with AlaSQL.
    3. Supported commands: SELECT, SHOW TABLES, DESCRIBE [table].
    4. IMPORTANT: Do NOT use SQLite functions like STRFTIME(). Use standard SQL functions:
       - YEAR(date) for year extraction
       - MONTH(date) for month extraction
       - DAY(date) for day extraction
       - FORMAT(date, 'yyyy-MM-dd') for formatting
    5. Today's date is ${new Date().toISOString().split('T')[0]}.
    5. If the question cannot be answered, return a JSON with an "error" field explaining why.
    6. If the user asks for a visualization (chart, graph, plot) OR if the data is suitable for visualization (aggregations, trends):
       - "bar": For categorical comparisons (e.g., sales by product).
       - "line": For trends over time (e.g., sales by date).
       - "pie": For parts of a whole (e.g., traffic source distribution).
    7. JSON Structure:
       {
         "sql": "SELECT ...",
         "visualization": {
           "type": "bar" | "line" | "pie",
           "xKey": "column_name_for_x_axis_or_labels",
           "yKey": "column_name_for_y_axis_or_values",
           "title": "Chart Title"
         }
       }
       If no visualization is needed, omit the "visualization" field.

    Question: ${userQuery}
  `;

    try {
        let text: string;

        switch (provider) {
            case 'gemini': {
                const genAI = new GoogleGenerativeAI(apiKey);
                const geminiModel = genAI.getGenerativeModel({ model });
                const result = await geminiModel.generateContent(prompt);
                text = (await result.response).text();
                break;
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
                        messages: [{ role: 'user', content: prompt }],
                        response_format: { type: "json_object" }
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                text = data.choices[0]?.message?.content || '';
                break;
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
                text = data.content[0]?.text || '';
                break;
            }

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        // Clean up text to ensure it's valid JSON
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

        // Use a simple regex to extract JSON if there's extra text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }

        const parsed = JSON.parse(text);

        // Handle error case from AI
        if (parsed.error) {
            console.warn("AI returned error:", parsed.error);
            throw new Error(parsed.error);
        }

        return parsed;

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        throw new Error(error.message || "Failed to parse AI response");
    }
};
