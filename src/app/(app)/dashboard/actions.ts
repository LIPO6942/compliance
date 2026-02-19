"use server";

import { summarizeNewsFlow } from "@/ai/flows/news-flow";
import { type NewsItem } from "@/types/compliance";

export interface SummarizeNewsResult {
    summary?: string;
    error?: string;
}

export async function summarizeNewsAction(
    newsItems: NewsItem[]
): Promise<SummarizeNewsResult> {
    try {
        const summary = await summarizeNewsFlow(newsItems);
        return { summary };
    } catch (error) {
        console.error("Error in summarizeNewsAction:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI synthesis.";
        return { error: errorMessage };
    }
}
