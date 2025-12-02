import CwProfileModel from "../models/CwProfile";
import { InsertCwProfile } from "@shared/schema";
import { randomUUID } from "crypto";
import { authenticateCrowdworks } from "./authController";
import UserModel from "../models/User";
import mongoose from "mongoose";
import { validateOpenaiKey } from "./openAiController";

export const getCwProfiles = async (telegramId: number) => {
  const profile = await CwProfileModel.findOne({ telegramId }).lean();
  return profile ? [profile] : []; // Return array with single profile or empty array
};

export const getCwProfile = async (telegramId: number) => {
  return await CwProfileModel.findOne({ telegramId }).lean();
};

export const getCwProfileById = async (id: string) => {
  const profile = await CwProfileModel.findOne({ id }).lean();
  if (!profile) {
    throw new Error("Profile not found");
  }
  return profile;
};

export const createCwProfile = async (telegramId: number, data: InsertCwProfile) => {
  // Check if user already has a profile
  const existingProfile = await CwProfileModel.findOne({ telegramId });
  if (existingProfile) {
    throw new Error("User already has a Crowdworks profile. Only one profile per user is allowed.");
  }

  const user = await UserModel.findOne({ telegramId });
  if (!user) {
    throw new Error("User not found");
  }

  const userId = user._id;

  const id = randomUUID();

  // Authenticate with Crowdworks to get auth token and cookie
  const authResult = await authenticateCrowdworks(data.cwEmail, data.cwPassword);

  const profileData = {
    ...data,
    id,
    telegramId,
    userId: userId as mongoose.Types.ObjectId,
    createdAt: new Date(),
    isPrimary: true, // Always true since only one profile per user
    auth_token: authResult.auth_token || null,
    cookie: authResult.cookie || null,
    lastAuthAt: authResult.success ? new Date() : null,
    authStatus: (authResult.auth_token != null && authResult.cookie != null),
  };

  const profile = new CwProfileModel(profileData);
  const savedProfile = await profile.save();
  const result = { ...savedProfile.toObject(), authMessage: authResult.message };

  return result;
};

export const updateCwProfile = async (telegramId: number, updates: Partial<InsertCwProfile>) => {
  // If password is being updated, re-authenticate
  if (updates.cwPassword) {
    const existingProfile = await CwProfileModel.findOne({ telegramId });
    if (!existingProfile) {
      throw new Error("Profile not found");
    }

    const authResult = await authenticateCrowdworks(existingProfile.cwEmail, updates.cwPassword);

    // Validate OpenAI key if it's being updated
    let openaiKeyStatus = existingProfile.openaiKeyStatus || null;
    if (updates.openaiKey && updates.openaiKey.trim()) {
      openaiKeyStatus = await validateOpenaiKey(updates.openaiKey);
    }

    const updateData = {
      ...updates,
      auth_token: authResult.auth_token || null,
      cookie: authResult.cookie || null,
      lastAuthAt: authResult.success ? new Date() : null,
      authStatus:
        (!!(updates.openaiKey && updates.openaiKey.trim()) ||
          !!(existingProfile.openaiKey && existingProfile.openaiKey.trim())
        ) ||
        (authResult.auth_token != null && authResult.cookie != null),
      openaiKeyStatus
    };

    const profile = await CwProfileModel.findOneAndUpdate(
      { telegramId },
      updateData,
      { new: true }
    ).lean();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const result = { ...profile, authMessage: authResult.message };

    // If OpenAI key is invalid or limited, throw an error with status
    if (openaiKeyStatus === 'invalid') {
      const error: any = new Error("Invalid OpenAI API key. Please check your API key.");
      error.openaiKeyStatus = 'invalid';
      throw error;
    } else if (openaiKeyStatus === 'limited') {
      const error: any = new Error("OpenAI API key has reached the rate limit. Please try again later.");
      error.openaiKeyStatus = 'limited';
      throw error;
    }

    return result;
  }

  // Set authStatus based on openaiKey presence
  const existingProfile = await CwProfileModel.findOne({ telegramId });
  if (!existingProfile) {
    throw new Error("Profile not found");
  }

  // Validate OpenAI key if it's being updated
  let openaiKeyStatus = existingProfile.openaiKeyStatus || null;
  if (updates.openaiKey && updates.openaiKey.trim()) {
    openaiKeyStatus = await validateOpenaiKey(updates.openaiKey);
  }

  const updateData = {
    ...updates,
    authStatus:
      (!!(updates.openaiKey && updates.openaiKey.trim()) ||
        !!(existingProfile.openaiKey && existingProfile.openaiKey.trim())) ||
      (existingProfile.auth_token != null && existingProfile.cookie != null),
    openaiKeyStatus
  };

  const profile = await CwProfileModel.findOneAndUpdate(
    { telegramId },
    updateData,
    { new: true }
  ).lean();
  if (!profile) {
    throw new Error("Profile not found");
  }

  // If OpenAI key is invalid or limited, throw an error with status
  if (openaiKeyStatus === 'invalid') {
    const error: any = new Error("Invalid OpenAI API key. Please check your API key.");
    error.openaiKeyStatus = 'invalid';
    throw error;
  } else if (openaiKeyStatus === 'limited') {
    const error: any = new Error("OpenAI API key has reached the rate limit. Please try again later.");
    error.openaiKeyStatus = 'limited';
    throw error;
  }

  return profile;
};

export const deleteCwProfile = async (id: string) => {
  const result = await CwProfileModel.deleteOne({ id });
  if (result.deletedCount === 0) {
    throw new Error("Profile not found");
  }
  return { success: true };
};

export const getOpenaiKeyFromCwProfile = async (telegramId: number) => {
  const profile = await CwProfileModel.findOne({ telegramId }).lean();
  if (!profile) {
    return { openaiKey: "", authStatus: false, openaiKeyStatus: null };
  }
  return {
    openaiKey: profile.openaiKey || "",
    authStatus: !!(profile.openaiKey && profile.openaiKey.trim()) || !!(profile.auth_token && profile.cookie),
    openaiKeyStatus: profile.openaiKeyStatus || null
  };
};

export const saveOpenaiKeyToCwProfile = async (telegramId: number, openaiKey: string) => {
  const existingProfile = await CwProfileModel.findOne({ telegramId });
  if (!existingProfile) {
    throw new Error("Profile not found");
  }

  // Validate the OpenAI key
  const openaiKeyStatus = await validateOpenaiKey(openaiKey);

  existingProfile.openaiKey = openaiKey;
  existingProfile.openaiKeyStatus = openaiKeyStatus;

  // Recalculate authStatus based on openaiKey and auth tokens
  const authStatus = !!(openaiKey && openaiKey.trim()) || !!(existingProfile.auth_token && existingProfile.cookie);
  existingProfile.authStatus = authStatus;
  const savedProfile = await existingProfile.save();

  // If OpenAI key is invalid or limited, throw an error with status
  if (openaiKeyStatus === 'invalid') {
    const error: any = new Error("Invalid OpenAI API key. Please check your API key.");
    error.openaiKeyStatus = 'invalid';
    throw error;
  } else if (openaiKeyStatus === 'limited') {
    const error: any = new Error("OpenAI API key has reached the rate limit. Please try again later.");
    error.openaiKeyStatus = 'limited';
    throw error;
  }

  return {
    openaiKey: savedProfile.openaiKey,
    authStatus: savedProfile.authStatus,
    openaiKeyStatus: savedProfile.openaiKeyStatus
  };
};
