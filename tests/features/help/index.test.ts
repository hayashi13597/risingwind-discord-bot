import { test } from "node:test";
import assert from "node:assert/strict";
import { SlashCommandBuilder } from "discord.js";
import { createHelpModule } from "../../../src/features/help";
import type { BotModule } from "../../../src/app/types/botModule";
import type { SlashCommandData } from "../../../src/shared/types/command";

function command(name: string): SlashCommandData {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(`${name} description`);
}

test("help module handler replies with all command names", async () => {
  const fakeModules: BotModule[] = [
    {
      name: "demo",
      commands: [
        {
          name: "alpha",
          data: command("alpha"),
          handle: async () => {},
        },
      ],
    },
  ];

  const helpModule = createHelpModule({ getModules: () => fakeModules });

  let repliedContent = "";
  const interaction = {
    replied: false,
    deferred: false,
    reply: async (opts: { content: string }) => {
      repliedContent = opts.content;
    },
    followUp: async () => {},
  } as never;

  await helpModule.commands![0].handle(interaction);

  assert.ok(repliedContent.includes("**/alpha**"));
  assert.ok(repliedContent.includes("alpha description"));
});

test("help module handler includes its own /help entry", async () => {
  const helpModule = createHelpModule({ getModules: () => [helpModule] });

  let repliedContent = "";
  const interaction = {
    replied: false,
    deferred: false,
    reply: async (opts: { content: string }) => {
      repliedContent = opts.content;
    },
    followUp: async () => {},
  } as never;

  await helpModule.commands![0].handle(interaction);

  assert.ok(repliedContent.includes("**/help**"));
});
