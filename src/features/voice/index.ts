import type { BotModule } from "../../app/types/botModule";
import {
  createJoinCommand,
  createLeaveCommand,
  handleJoinCommand,
  handleLeaveCommand,
  handleSpeakScheduleCommand,
  handleStopScheduleCommand,
  speakScheduleCommand,
  stopScheduleCommand,
} from "./commands/voice.command";
import type { VoiceCoordinator } from "./application/voiceCoordinator";

const VOICE_NOT_READY_MESSAGE =
  "Voice bot runtime chưa sẵn sàng, vui lòng thử lại sau.";

export function createVoiceModule(options: {
  getCoordinator: () => VoiceCoordinator | null;
}): BotModule {
  const requireCoordinator = () => options.getCoordinator() !== null;

  function getCoordinatorOrThrow(): VoiceCoordinator {
    const coordinator = options.getCoordinator();
    if (!coordinator) throw new Error("Voice coordinator is not ready.");
    return coordinator;
  }

  const botChoices = () =>
    options.getCoordinator()?.getBotChoices() ?? [
      { name: "Primary Bot", value: "primary" },
      { name: "Secondary Bot", value: "secondary" },
    ];

  return {
    name: "voice",
    commands: [
      {
        name: "join",
        data: createJoinCommand(botChoices()),
        requiresReady: requireCoordinator,
        notReadyMessage: VOICE_NOT_READY_MESSAGE,
        handle: async (interaction) =>
          handleJoinCommand(interaction, getCoordinatorOrThrow()),
      },
      {
        name: "leave",
        data: createLeaveCommand(botChoices()),
        requiresReady: requireCoordinator,
        notReadyMessage: VOICE_NOT_READY_MESSAGE,
        handle: async (interaction) =>
          handleLeaveCommand(interaction, getCoordinatorOrThrow()),
      },
      {
        name: "speak_schedule",
        data: speakScheduleCommand,
        requiresReady: requireCoordinator,
        notReadyMessage: VOICE_NOT_READY_MESSAGE,
        handle: async (interaction) =>
          handleSpeakScheduleCommand(interaction, getCoordinatorOrThrow()),
      },
      {
        name: "stop_schedule",
        data: stopScheduleCommand,
        requiresReady: requireCoordinator,
        notReadyMessage: VOICE_NOT_READY_MESSAGE,
        handle: async (interaction) =>
          handleStopScheduleCommand(interaction, getCoordinatorOrThrow()),
      },
    ],
  };
}
