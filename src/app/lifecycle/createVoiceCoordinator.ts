import type { Client } from "discord.js";
import { createSpeakingScheduleRuntime } from "../../features/voice/application/speakingSchedule";
import {
  createVoiceCoordinator,
  type VoiceCoordinator,
} from "../../features/voice/application/voiceCoordinator";

export function createReadyVoiceCoordinator(
  primaryClient: Client,
  secondaryClient: Client,
): VoiceCoordinator | null {
  if (!primaryClient.user || !secondaryClient.user) return null;

  return createVoiceCoordinator([
    {
      key: "primary",
      label: primaryClient.user.displayName ?? primaryClient.user.username,
      runtime: createSpeakingScheduleRuntime(),
      client: primaryClient,
    },
    {
      key: "secondary",
      label: secondaryClient.user.displayName ?? secondaryClient.user.username,
      runtime: createSpeakingScheduleRuntime(),
      client: secondaryClient,
    },
  ]);
}
