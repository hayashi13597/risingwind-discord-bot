import { test } from "node:test";
import assert from "node:assert/strict";
import { SlashCommandBuilder } from "discord.js";
import { handleInteractionCreate, isModuleCommandInteraction } from "../../../src/app/registry/interactionRouter";
import type { BotModule } from "../../../src/app/types/botModule";
import type { SlashCommandData } from "../../../src/shared/types/command";

function command(name: string): SlashCommandData {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(`${name} command`);
}

test("isModuleCommandInteraction returns true for registered module command", () => {
  const modules: BotModule[] = [
    {
      name: "demo",
      commands: [
        { name: "demo", data: command("demo"), handle: async () => {} },
      ],
    },
  ];

  const interaction = {
    isChatInputCommand: () => true,
    commandName: "demo",
  } as never;

  assert.equal(isModuleCommandInteraction(interaction, modules), true);
});

test("handleInteractionCreate dispatches matching command handler", async () => {
  let called = false;
  const modules: BotModule[] = [
    {
      name: "demo",
      commands: [
        {
          name: "demo",
          data: command("demo"),
          handle: async () => {
            called = true;
          },
        },
      ],
    },
  ];

  const interaction = {
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    commandName: "demo",
  } as never;

  await handleInteractionCreate(interaction, modules);

  assert.equal(called, true);
});
