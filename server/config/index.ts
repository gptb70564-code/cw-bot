import { configDotenv } from "dotenv";

configDotenv();

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_ID = process.env.ADMIN_ID;
const OPENAI_API = process.env.OPENAI_API;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const OPENAI_BASEURL = process.env.OPENAI_BASEURL;
const PROXY = process.env.PROXY;
const PROXY_AUTH = process.env.PROXY_AUTH;
const GROUP_ID = process.env.GROUP_ID;

let config_missing = false;

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN");
  config_missing = true;
}

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  config_missing = true;
}

if (!ADMIN_ID) {
  console.error("Missing ADMIN_ID");
  config_missing = true;
}

if (!OPENAI_API) {
  console.error("Missing OPENAI_API");
  config_missing = true;
}

if (config_missing) {
  process.exit(1);
}

interface Config {
  BOT_TOKEN: string;
  MONGODB_URI: string;
  ADMIN_ID: string;
  OPENAI_API: string;
  OPENAI_MODEL: string;
  OPENAI_BASEURL: string | undefined;
  PROXY: string | undefined;
  PROXY_AUTH: { username: string; password: string } | undefined;
  GROUP_ID: string | undefined;
}

const config: Config = {
  BOT_TOKEN: BOT_TOKEN!,
  MONGODB_URI: MONGODB_URI!,
  ADMIN_ID: ADMIN_ID!,
  OPENAI_API: OPENAI_API!,
  OPENAI_MODEL: OPENAI_MODEL!,
  OPENAI_BASEURL: OPENAI_BASEURL,
  PROXY: PROXY,
  PROXY_AUTH: PROXY_AUTH ? JSON.parse(PROXY_AUTH) : undefined,
  GROUP_ID: GROUP_ID,
};

export default config;
