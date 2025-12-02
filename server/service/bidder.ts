import axios from "axios";
import CwProfileModel from "@Server/models/CwProfile";
import Job from "@Server/models/Job";
import { createBidText } from "@Server/controller/openAiController";
import AutoBidSchedule from "@Server/models/AutoBidSchedule";
import { ScrapedJobType } from "@Server/types/job";
import { SingleBid } from "@Server/models/BidHistory";
import * as bidHistoryController from "@Server/controller/bidHistoryController";

export interface PlaceBidParams {
    jobType?: 'hourly' | 'fixed_price';
    hours_limit: number,
    defaultHourlyPrice?: number;
    jobId: number;
    budget: number;
    cookie: string;
    authToken: string;
    bidText: string;
}

export interface PlaceBidResult {
    success: boolean;
    message?: string;
}

export async function placeBid(params: PlaceBidParams): Promise<PlaceBidResult> {
    let {
        jobId,
        jobType = 'hourly',
        authToken,
        cookie,
        budget,
        defaultHourlyPrice,
        hours_limit,
        bidText
    } = params;

    if (budget == 0) jobType = 'hourly';

    try {
        const data: any = {
            "authenticity_token": authToken,
            "proposal[conditions_attributes][0][payment_type]": jobType,
            "proposal[conditions_attributes][0][milestones_attributes][0][index]": "0",
            "proposal[conditions_attributes][0][milestones_attributes][0][amount_without_sales_tax]": budget,
            "proposal[conditions_attributes][0][hourly_wage_without_sales_tax]": budget ? budget : defaultHourlyPrice,
            "proposal[conditions_attributes][0][hours_limit]": hours_limit,
            "proposal[conditions_attributes][0][message_attributes][body]": bidText,
            "proposal[job_offer_id]": jobId
        };

        const headers = {
            'Cookie': cookie,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
            'Host': 'crowdworks.jp'
        };

        const placeBidResponse = await axios.post(
            `https://crowdworks.jp/proposals`,
            data,
            {
                headers: headers,
                timeout: 300000 // 300 seconds timeout
            }
        );
        if (placeBidResponse.status >= 200 && placeBidResponse.status < 300) {
            return { success: true, message: `Bid submitted successfully. Status: ${placeBidResponse.status}` };
        }
        return { success: false, message: `Non-success status: ${placeBidResponse.status}` };
    } catch (error: any) {
        return { success: false, message: error?.message || "Bid submission failed" };
    }
}


export interface AutoBidResult {
    success: boolean;
    message: string;
    bidData?: any;
}

export async function singleAutoBid(telegramId: number, jobId: number): Promise<AutoBidResult> {

    // return { success: true, message: "Bid submitted successfully." };

    if (!telegramId) return { success: false, message: "❌ Missing Telegram ID." };
    if (!jobId) return { success: false, message: "❌ Missing Job ID." };

    const job = await Job.findOne({ id: jobId }).lean();

    if (!job) return { success: false, message: "❌ Job not found." };
    if (job.bidders.includes(telegramId)) return { success: false, message: "❌ You have already bid for this job." };

    const profile = await CwProfileModel.findOne({ telegramId, authStatus: true }).lean();
    if (!profile || !profile.auth_token || !profile.cookie) {
        return { success: false, message: "❌ CW not configured. Please register valid CW credentials in the dashboard." };
    }

    if (profile.openaiKeyStatus !== 'valid') {
        return { success: false, message: "❌ OpenAI API key is invalid. Please update your API key in the dashboard." };
    }

    // Check if OpenAI key exists
    if (!profile.openaiKey || !profile.openaiKey.trim()) {
        return { success: false, message: "❌ OpenAI API key not configured. Please add your OpenAI API key in the dashboard." };
    }

    const autoBidSchedule = await AutoBidSchedule.findOne({ telegramId }).lean();

    // Generate bid text using user's OpenAI API key
    let bidText: string;
    try {
        const result = await createBidText(telegramId, job, profile.openaiKey);

        if (result.status == 200) {
            bidText = result.text;
        } else if (result.status == 401) {
            // Mark key as invalid
            await CwProfileModel.updateOne(
                { telegramId },
                { openaiKeyStatus: 'invalid' }
            );
            return { success: false, message: `❌ OpenAI API key is invalid. Please update your API key in the dashboard.` };
        } else if (result.status == 429) {
            // Mark key as limited
            await CwProfileModel.updateOne(
                { telegramId },
                { openaiKeyStatus: 'limited' }
            );
            return { success: false, message: `❌ OpenAI API key has reached the rate limit. Please try again later.` };
        } else {
            return { success: false, message: `❌ Failed to generate bid text: ${result.status || 'Unknown error'}` };
        }

        if (!bidText || !bidText.trim()) {
            return { success: false, message: "❌ Failed to generate bid text." };
        }
    } catch (error: any) {
        console.error(`Failed to generate bid text for telegramId ${telegramId}, jobId ${jobId}:`, error.message);
        return { success: false, message: `❌ Failed to generate bid text: ${error.message || 'Unknown error'}` };
    }

    const jobType = (job.jobType === "hourly") ? "hourly" : 'fixed_price';
    let budget = 0;
    // If both low and high budget exist and are not 0
    if (job.lowBudget && job.highBudget) {
        budget = autoBidSchedule?.clientBudgetPreference === "low" ? job.lowBudget : job.highBudget;
    } else if (job.highBudget && job.highBudget !== 0) {
        budget = job.highBudget;
    }
    const bidData = {
        jobId: job.id,
        jobType,
        authToken: profile.auth_token as string,
        cookie: profile.cookie as string,
        defaultHourlyPrice: autoBidSchedule?.preferredHourlyBudget,
        hours_limit: (autoBidSchedule?.hoursLimit ?? 35),
        budget,
        bidText,
    };

    const submit = await placeBid(bidData as PlaceBidParams);

    if (submit.success) {
        // Only save bid history and bidders if bid was successfully submitted
        Job.updateOne({ id: job.id }, { $addToSet: { bidders: telegramId } }).then();
        let biddedData = {
            jobId: job.id,
            categoryId: job.categoryId,
            bidText,
            jobType: job.jobType,
            budget: (budget) ? budget : (bidData?.defaultHourlyPrice ?? 0),
        };

        bidHistoryController.addBidToDay(telegramId, new Date(), biddedData as SingleBid);

        return { success: true, bidData, message: `✅ Bid submitted for job ${job.id}` };
    }
    return { success: false, message: `❌ Failed to submit bid: ${submit.message || 'Unknown error'}` };
}


