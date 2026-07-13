/**
 * Single feature toggle point.
 * To remove a feature, remove its import and item from createEnabledModules(),
 * then delete src/features/<feature>/ and tests/features/<feature>/ if desired.
 */
import type { BotModule } from "./types/botModule";
import type { VoiceCoordinator } from "../features/voice/application/voiceCoordinator";
import { antibangwModule } from "../features/antibangw";
import { notificationsModule } from "../features/notifications";
import { pollModule } from "../features/poll";
import { createVoiceModule } from "../features/voice";
import { createHelpModule } from "../features/help";

export function createEnabledModules(options: {
  getVoiceCoordinator: () => VoiceCoordinator | null;
  getModules: () => BotModule[];
}): BotModule[] {
  return [
    pollModule,
    antibangwModule,
    notificationsModule,
    createVoiceModule({ getCoordinator: options.getVoiceCoordinator }),
    createHelpModule({ getModules: options.getModules }),
  ];
}
