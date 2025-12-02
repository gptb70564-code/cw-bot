import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import {
  insertUserSchema,
  insertCwProfileSchema,
  insertBidTemplateSchema,
  insertAutoBidScheduleSchema,
  insertBidHistorySchema,
  insertAnalyticsSchema,
} from "@shared/schema";
import { z } from "zod";
import * as authController from "./controller/authController";
import * as cwProfileController from "./controller/cwProfileController";
import * as bidTemplateController from "./controller/bidTemplateController";
import * as autoBidScheduleController from "./controller/autoBidScheduleController";
import * as bidHistoryController from "./controller/bidHistoryController";
import * as analyticsController from "./controller/analyticsController";
import * as promptController from "./controller/promptController";
import * as pastWorkController from "./controller/pastWorkController";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use((req, res, next) => {
    // Log the remote IP address for every request
    console.log("Request IP:", req.ip, "RemoteAddress:", req.connection?.remoteAddress);
    next();
  });
  const requireAuth = (req: any, res: any, next: any) => {

    // if (req.body && Object.keys(req.body).length !== 0) req.telegramId = req.body.telegramId;
    // else if (req.query && Object.keys(req.query).length !== 0) req.telegramId = req.query.telegramId;
    req.telegramId = 7386934803;

    if (!req.telegramId) {
      return res.status(401).json({ error: "Unauthorized. Telegram ID is required." });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    next();
  };

  // ==================== User Routes ====================

  // Telegram Mini App Authentication
  app.post("/api/auth/telegram", async (req: Request, res: Response) => {
    try {
      const { telegramId, telegramUsername, fullName } = req.body;
      const user = await authController.authenticateTelegramUser(telegramId, telegramUsername, fullName);
      res.json({ user: { ...user, password: undefined } });
    } catch (error: any) {
      res.status(401).json({ error: error.message || "Authentication failed" });
    }
  });

  // Get current user
  app.get("/api/user", requireAuth, async (req: any, res: Response) => {
    try {
      const user = await authController.getUserByTelegramId(req.telegramId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ data: { ...user, password: undefined } });
    } catch (error: any) {
      res.status(404).json({ error: error.message || "User not found" });
    }
  });

  // Update user profile
  app.patch("/api/user", requireAuth, async (req: any, res: Response) => {
    try {
      const user = await authController.updateUser(req.telegramId, req.body);
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(404).json({ error: error.message || "User not found" });
    }
  });

  // ==================== CW Profile Routes ====================

  // Get all CW profiles for user
  app.get("/api/cw-profiles", requireAuth, async (req: any, res: Response) => {
    try {
      const profiles = await cwProfileController.getCwProfiles(req.telegramId);
      if (!profiles) {
        return res.status(404).json({ error: "Profiles not found" });
      }
      res.json({ data: profiles });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get profiles" });
    }
  });

  // Create CW profile
  app.post("/api/cw-profiles", requireAuth, async (req: any, res: Response) => {
    try {
      const data = insertCwProfileSchema.parse(req.body);
      const profile = await cwProfileController.createCwProfile(req.telegramId, data);
      res.json({ data: profile });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error });
      }

      res.status(500).json({ error: error.message || "Failed to create profile" });
    }
  });

  // Update CW profile
  app.patch("/api/cw-profiles", requireAuth, async (req: any, res: Response) => {
    try {
      const profile = await cwProfileController.updateCwProfile(req.telegramId, req.body);
      res.json(profile);
    } catch (error: any) {
      // Check if it's an OpenAI key validation error
      if (error.openaiKeyStatus === 'invalid' || error.openaiKeyStatus === 'limited') {
        return res.status(400).json({
          error: error.message,
          openaiKeyStatus: error.openaiKeyStatus
        });
      }
      res.status(404).json({ error: error.message || "Profile not found" });
    }
  });

  // Delete CW profile
  app.delete("/api/cw-profiles/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await cwProfileController.deleteCwProfile(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Profile not found" });
    }
  });

  // Get OpenAI key
  app.get("/api/cw-profiles/get-openai-key", requireAuth, async (req: any, res: Response) => {
    try {
      const result = await cwProfileController.getOpenaiKeyFromCwProfile(req.telegramId);
      res.json({ data: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get OpenAI key" });
    }
  });

  // Save OpenAI key
  app.patch("/api/cw-profiles/save-openai-key", requireAuth, async (req: any, res: Response) => {
    try {
      const { openaiKey } = req.body;
      if (!openaiKey || !openaiKey.trim()) {
        return res.status(400).json({ error: "OpenAI key is required" });
      }
      const result = await cwProfileController.saveOpenaiKeyToCwProfile(req.telegramId, openaiKey.trim());
      res.json({ data: result });
    } catch (error: any) {
      // Check if it's an OpenAI key validation error
      if (error.openaiKeyStatus === 'invalid' || error.openaiKeyStatus === 'limited') {
        return res.status(400).json({
          error: error.message,
          openaiKeyStatus: error.openaiKeyStatus
        });
      }
      res.status(404).json({ error: error.message || "Profile not found" });
    }
  });

  // ==================== Bid Template Routes ====================

  // Get all bid templates for user
  app.get("/api/bid-templates", requireAuth, async (req: any, res: Response) => {
    try {
      const templates = await bidTemplateController.getBidTemplates(req.telegramId);
      if (!templates) {
        return res.status(404).json({ error: "Templates not found" });
      }
      res.json({ success: true, data: templates });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get templates" });
    }
  });

  // Create bid template
  app.post("/api/bid-templates", requireAuth, async (req: any, res: Response) => {
    try {
      const data = insertBidTemplateSchema.parse({ ...req.body });
      const template = await bidTemplateController.createBidTemplate(req.telegramId, data);
      res.json({ data: { template, success: true, message: "Template created successfully" } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to create template" });
    }
  });

  // Update bid template
  app.patch("/api/bid-templates/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const template = await bidTemplateController.updateBidTemplate(id, req.body);
      res.json({ data: template });
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Template not found" });
    }
  });

  // Delete bid template
  app.delete("/api/bid-templates/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await bidTemplateController.deleteBidTemplate(id);
      res.json({
        data:
          { success: true, message: "Template deleted successfully" }
      });
    } catch (error: any) {
      res.status(404).json({
        data:
          { success: false, error: error.message || "Template not found" }
      });
    }
  });

  // ==================== Auto Bid Schedule Routes ====================

  // Get auto bid schedule for user
  app.get("/api/auto-bid-schedule", requireAuth, async (req: any, res: Response) => {
    try {
      const result: any = await autoBidScheduleController.getAutoBidSchedule(req.telegramId);
      if (result && !result.success) {
        return res.status(result.status).json({ error: result.error });
      }
      res.json({ data: result.schedule });
    } catch (error: any) {
      res.status(error.status).json({ error: error.message || "Failed to get schedule" });
    }
  });

  // Create or update auto bid schedule
  app.post("/api/auto-bid-schedule", requireAuth, async (req: any, res: Response) => {
    try {
      const data = insertAutoBidScheduleSchema.parse({ ...req.body });
      const schedule = await autoBidScheduleController.createOrUpdateAutoBidSchedule(req.telegramId, data);
      res.json({ data: schedule });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to save schedule" });
    }
  });

  // Get all auto bid schedules (admin only)
  app.get("/api/auto-bid-schedules", requireAdmin, async (req: any, res: Response) => {
    try {
      const schedules = await autoBidScheduleController.getAllAutoBidSchedules();
      if (!schedules) {
        return res.status(404).json({ error: "Schedules not found" });
      }
      res.json({ data: schedules });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get schedules" });
    }
  });


  // ==================== Analytics Routes ====================

  // Get analytics for user
  app.get("/api/analytics", requireAuth, async (req: any, res: Response) => {
    try {
      const data = {
        telegramId: req.telegramId,
        date: req.query.date
      }
      const analytics = await analyticsController.getAnalytics(data);
      if (!analytics) {
        return res.status(404).json({ error: "Analytics not found" });
      }
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get analytics" });
    }
  });

  // Create or update analytics entry
  app.post("/api/analytics", requireAuth, async (req: any, res: Response) => {
    try {
      const data = insertAnalyticsSchema.parse({ ...req.body, userId: req.userId });
      const analytics = await analyticsController.createOrUpdateAnalytics(req.userId, data.date, data);
      if (!analytics) {
        return res.status(404).json({ error: "Analytics not found" });
      }
      res.json(analytics);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to save analytics" });
    }
  });

  // ==================== Admin Routes ====================

  // Get all users (admin only)
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req: any, res: Response) => {
    try {
      const users = await authController.getAllUsers();
      const sanitized = users.map((u: any) => ({ ...u, password: undefined }));
      if (!sanitized) {
        return res.status(404).json({ error: "Users not found" });
      }
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });

  // Update user status/role (admin only)
  app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const user = await authController.updateUser(id, req.body);
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(404).json({ error: error.message || "User not found" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await authController.deleteUser(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(404).json({ error: error.message || "User not found" });
    }
  });

  // Get all analytics (admin only)
  app.get("/api/admin/analytics", requireAuth, requireAdmin, async (req: any, res: Response) => {
    try {
      const analytics = await analyticsController.getAllAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get analytics" });
    }
  });

  // Prompt Management Routes


  // Get all prompts for user
  app.get("/api/prompts", requireAuth, async (req: any, res: Response) => {
    try {
      const prompts = await promptController.getPromptsByTelegramId(req.telegramId);
      res.json({ data: prompts });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get prompts" });
    }
  });

  // Get specific prompt
  app.get("/api/prompts/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const prompt = await promptController.getPromptById(req.userId, id);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Prompt not found" });
    }
  });

  // Create new prompt
  app.post("/api/prompts", requireAuth, async (req: any, res: Response) => {
    try {
      const { name, description, prompt, category, isActive } = req.body;

      if (!name || !prompt || !category) {
        return res.status(400).json({ error: "Name, prompt, and category are required" });
      }
      const newPrompt = await promptController.createPrompt(req.telegramId, {
        name,
        description,
        prompt,
        category,
        isActive,
      });

      res.json(newPrompt);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create prompt" });
    }
  });

  // Update prompt
  app.patch("/api/prompts/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedPrompt = await promptController.updatePrompt(req.telegramId, id, updateData);
      res.json(updatedPrompt);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update prompt" });
    }
  });

  // Delete prompt
  app.delete("/api/prompts/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await promptController.deletePrompt(req.telegramId, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete prompt" });
    }
  });

  // ==================== Past Work Routes ====================

  // Get all past work for user
  app.get("/api/past-work", requireAuth, async (req: any, res: Response) => {
    try {
      const pastWork = await pastWorkController.getPastWorkByTelegramId(Number(req.telegramId));
      if (!pastWork) {
        return res.status(404).json({ message: "Past work not found" });
      }
      res.json({ data: pastWork });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get past work" });
    }
  });

  // Get specific past work
  app.get("/api/past-work/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const work = await pastWorkController.getPastWorkById(Number(req.telegramId), id);
      if (!work) {
        return res.status(404).json({ error: "Past work not found" });
      }
      res.json(work);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Past work not found" });
    }
  });

  // Create new past work
  app.post("/api/past-work", requireAuth, async (req: any, res: Response) => {
    try {
      const { category, role, projectUrl, description, isActive } = req.body;

      if (!category || !role || !projectUrl || !description) {
        return res.status(400).json({ error: "Category, role, project URL, and description are required" });
      }

      if (!projectUrl.trim()) {
        return res.status(400).json({ error: "Project URL cannot be empty" });
      }

      const pastWork = await pastWorkController.createPastWork(Number(req.telegramId), {
        category,
        role,
        projectUrl: projectUrl.trim(),
        description,
        isActive: isActive ?? true,
      });
      res.json({ data: pastWork });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create past work" });
    }
  });

  // Update past work
  app.patch("/api/past-work/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const pastWork = await pastWorkController.updatePastWork(Number(req.telegramId), id, updateData);
      res.json({ data: pastWork });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update past work" });
    }
  });

  // Delete past work
  app.delete("/api/past-work/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await pastWorkController.deletePastWork(Number(req.telegramId), id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete past work" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
