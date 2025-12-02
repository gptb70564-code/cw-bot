import mongoose, { Document } from "mongoose";

export interface CwProfileDocument extends Document {
  id: string;
  userId: mongoose.Schema.Types.ObjectId;
  telegramId: number;
  cwEmail: string;
  cwPassword: string;
  openaiKey: string; // OpenAI API key - must be saved
  openaiKeyStatus?: 'valid' | 'invalid' | 'limited' | null; // Status of OpenAI API key
  profileDescription?: string; // User's own profile description
  isPrimary: boolean;
  auth_token?: string;
  cookie?: string;
  lastAuthAt?: Date;
  authStatus: boolean; // true if openaiKey is saved
  createdAt: Date;
}

const CwProfileSchema = new mongoose.Schema<CwProfileDocument>(
  {
    id: { type: String, required: true, unique: true },
    telegramId: { type: Number, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: "users" },
    cwEmail: { type: String, required: true },
    cwPassword: { type: String, required: true },
    openaiKey: { type: String }, // OpenAI API key - must be saved
    openaiKeyStatus: { type: String, enum: ['valid', 'invalid', 'limited'], default: null }, // Status of OpenAI API key
    profileDescription: { type: String }, // User's own profile description
    isPrimary: { type: Boolean, default: true }, // Always true since only one profile per user
    auth_token: { type: String },
    cookie: { type: String },
    lastAuthAt: { type: Date },
    authStatus: { type: Boolean, default: false }, // Set to true if openaiKey is present
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<CwProfileDocument>("cwProfiles", CwProfileSchema);

