import { Telegraf } from "telegraf";
import { delay } from "@Server/utils";
import { singleAutoBid } from "@Server/service/bidder";
import User from "@Server/models/User";

const userAllowedToBid = async (telegramId: number) => {
    if (!telegramId) {
        return {
            allowed: false,
            message: "Missing Telegram ID.",
            show_alert: false,
        };
    }
    const user = await User.findOne({ telegramId });
    if (!user) {
        return {
            allowed: false,
            message: "❌ Access denied: You are not registered. Please request access from admin.",
            show_alert: true,
        };
    }
    if (user.status !== 1 && user.status !== 2) {
        return {
            allowed: false,
            message: "❌ Access denied: You are not allowed to bid yet. Please wait for admin approval.",
            show_alert: true,
        };
    }
    return { allowed: true };
};

const setup_actions = async (bot: Telegraf) => {

    bot.action(/auto_bid:(.+)/, async (ctx) => {
        const jobId = Number(ctx.match[1]);
        const telegramId = ctx.from?.id;

        if (!jobId || Number.isNaN(jobId)) {
            return ctx.answerCbQuery("Invalid job.", { show_alert: false });
        }

        const userCheck = await userAllowedToBid(telegramId as number);

        if (!userCheck.allowed) {
            await ctx.answerCbQuery(userCheck.message, { show_alert: userCheck.show_alert });
            return;
        }

        await ctx.answerCbQuery("⏳ Processing bid...", { show_alert: false });

        const botId = ctx.from.id;

        try {
            const result = await singleAutoBid(telegramId as number, jobId);
            await ctx.telegram.sendMessage(botId, result.message);
        } catch (err: any) {
            await ctx.telegram.sendMessage(botId, `❌ Error while preparing/submitting bid: ${err?.message || err}`);
        }
    });
};

export default setup_actions;