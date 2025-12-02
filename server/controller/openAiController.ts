import { encoding_for_model } from "tiktoken";
import { ScrapedJobType } from "@Server/types/job";
import axios from "axios";
import config from "@Server/config";
import BidTemplate from "@Server/models/BidTemplate";
import Prompt from "@Server/models/Prompt";
import Pastwork from "@Server/models/PastWork";
import { getCategoryNameById } from "@Server/utils";

const OPENAI_BASE_URL = config.OPENAI_BASEURL;
const OPENAI_MODEL = config.OPENAI_MODEL || "gpt-4o-mini";
const encoder = encoding_for_model(OPENAI_MODEL as any);



const trimPrompt = (text: string, maxInputTokens = 5000) => {
    const tokens = encoder.encode(text);
    if (tokens.length > maxInputTokens) {
        const trimmed = tokens.slice(0, maxInputTokens);
        return encoder.decode(trimmed);
    }
    return text;
};

export const createBidText = async (telegramId: any, job: ScrapedJobType, openaiKey?: string): Promise<{ status: number, text: string }> => {
    try {
        // Check if OpenAI key is provided and valid
        if (!openaiKey || !openaiKey.trim()) {
            throw new Error("OpenAI API key is missing");
        }

        // Determine the category name (key) given job.categoryId (number)
        const categoryName: string | undefined = await getCategoryNameById(Number(job.categoryId));

        let bidTemplate = await BidTemplate.findOne({ telegramId, role: job.categoryId.toString(), isActive: true });
        let bid_prompt = await Prompt.findOne({ telegramId, category: categoryName });
        let matchedUrls = await Pastwork.findOne(
            { telegramId, role: job.categoryId.toString(), isActive: true },
            { projectUrl: 1, _id: 0 }
        ).lean();
        const allUrls = await Pastwork.find({ telegramId, isActive: true }).lean();

        if (!bidTemplate) bidTemplate = await BidTemplate.findOne({ telegramId, role: "general-bid-template", isActive: true });
        if (!bid_prompt) bid_prompt = await Prompt.findOne({ telegramId, category: 'default' });

        const makeQuato = (text: any) => {
            return `\`\`\`${text}\`\`\``;
        }
        const userPrompt = [
            `Prompt: ${makeQuato(bid_prompt?.prompt || '')}\\n`,
            `Job Title: ${makeQuato(job.title)}`,
            `Job Type: ${makeQuato(job.jobType || '')}`,
            `Budget: ${makeQuato((!job.lowBudget) || (!job.highBudget) ?
                [job.lowBudget, job.highBudget].filter(v => v && v !== 0).join(' ~ ') : 'Discusstion with Worker')}`,
            `Job Details: ${makeQuato(job.desc)}`,
            `Bid Template: ${makeQuato(bidTemplate?.template || '')}`,
            `------------------------------------------`,
            `Past Work: ${matchedUrls?.projectUrl && matchedUrls.projectUrl.trim() ? matchedUrls.projectUrl
                : (allUrls && allUrls.length > 0 ? allUrls.map((work: any) => work.projectUrl || '').filter((url: string) => url.trim()).join('\n') : '')
            }`,
        ].join("\n");

        console.log(userPrompt, 'userPrompt');


        const systemPrompt = [
            "You are a professional Japanese freelance proposal writer specialized in crafting bids for the Japanese job site CrowdWorks.",
            "Always write in natural, native-level Japanese suitable for formal business communication.",
            "Start every bid with 'お世話になっております。'.",
            "The bid must sound polite, confident, and written by a highly skilled professional developer.",
            "Focus on demonstrating expertise, reliability, and strong communication skills.",
            "Do not mention the job post directly — write as if naturally responding to it.",
            "Keep the bid concise and under 1000 Japanese characters.",
            "Create winning bid based on prompt and Bid Template which I provide absolutely.",
            "I will provide preferred template bid, so you have to imitate this template absolutely. Created bid must be same style with bid template.",
            "I will provide you with urls about my past work. you must analysis added urls deeply so that can explain about the site correctly.",
            "You must incorporate my past work experience naturally, clearly explaining my role in each project and giving enough description of the project itself.",
            "Some projects were developed individually, and others were team-based — describe this appropriately depending on the information provided.",
            "If I would provide so many urls(more than 10), you have to choose min 3 urls and max 5 urls and give enough description of the project itself.",
            "If I would not provide past work urls, you have to find urls from online live urls",
            "Maintain a respectful and formal tone throughout (です・ます style).",
            "End the bid with a polite closing such as 'どうぞよろしくお願いいたします。'.",
            "Your goal is to impress the client, highlight professionalism and credibility, and maximize the chance of being selected.",
        ].join('\\n');

        try {
            const response = await axios.post(`${OPENAI_BASE_URL}/chat/completions`,
                {
                    model: OPENAI_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${openaiKey.trim()}`
                    },
                    timeout: 30000
                }
            );

            const text = response?.data?.choices?.[0]?.message?.content?.trim();
            if (!text) throw new Error("Empty response from OpenAI");
            return { status: 200, text };

        } catch (error: any) {
            console.log(error?.response?.data, 'error');
            const status = error?.response?.status;
            const msg = String(error?.response?.data?.error?.message || error?.message || '').toLowerCase();

            // Check if it's an authentication error (invalid API key)
            // Explicit handling for each status
            if (status === 401 || msg.includes('unauthorized')) {
                console.log('401 Unauthorized. Please check your OpenAI API key.');
                return { status: 401, text: '' };
            } else if (status === 403 || msg.includes('forbidden')) {
                console.log('403 Forbidden. Please check your OpenAI API key.');
                return { status: 403, text: '' };
            } else if (status === 429 || msg.includes('limit')) {
                console.log('429 Rate Limit Exceeded. Please try again later.');
                return { status: 429, text: '' };
            }

            return { status: 500, text: '' };
        }
    } catch (error: any) {
        console.error('Error in createBidText for telegramId:', telegramId, 'error:', error?.message || 'Unknown error');
        // Re-throw the error so it can be caught by the caller
        return { status: 500, text: '' };
    }
}

/**
 * Validates an OpenAI API key by making a simple test request
 * @param openaiKey The API key to validate
 * @returns Promise with status: 'valid' | 'invalid' | 'limited'
 */
export const validateOpenaiKey = async (openaiKey: string): Promise<'valid' | 'invalid' | 'limited'> => {
  if (!openaiKey || !openaiKey.trim()) {
    return 'invalid';
  }

  try {
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey.trim()}`
        },
        timeout: 10000 // 10 seconds timeout for validation
      }
    );

    if (response.status >= 200 && response.status < 300) {
      return 'valid';
    }
    return 'invalid';
  } catch (error: any) {
    const status = error?.response?.status;
    const msg = String(error?.response?.data?.error?.message || error?.message || '').toLowerCase();

    if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('forbidden')) {
      return 'invalid';
    } else if (status === 429 || msg.includes('limit') || msg.includes('rate')) {
      return 'limited';
    }
    return 'invalid';
  }
};

export default createBidText;