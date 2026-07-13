import type {
  APIApplicationCommandOptionChoice,
  ChatInputCommandInteraction,
  Client,
  Message,
} from "discord.js";
import type { SlashCommandData } from "../../shared/types/command";

export type BotContext = {
  primaryClient: Client;
  secondaryClient: Client;
};

export type CommandDefinition = {
  name: string;
  data: SlashCommandData;
  requiresReady?: () => boolean;
  notReadyMessage?: string;
  handle: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export type MessageHandler = {
  name: string;
  handle: (message: Message, context: BotContext) => Promise<boolean>;
};

export type ScheduledJobDefinition = {
  name: string;
  cron: string;
  run: (context: BotContext) => Promise<void> | void;
};

export type BotModule = {
  name: string;
  commands?: CommandDefinition[];
  messageHandlers?: MessageHandler[];
  scheduledJobs?: ScheduledJobDefinition[];
  onPrimaryReady?: (context: BotContext) => Promise<void> | void;
  onSecondaryReady?: (context: BotContext) => Promise<void> | void;
};

export type VoiceCommandChoicesProvider = () => APIApplicationCommandOptionChoice<string>[];
