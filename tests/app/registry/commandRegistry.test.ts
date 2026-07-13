import { test } from "node:test";
import assert from "node:assert/strict";
import { SlashCommandBuilder } from "discord.js";
import { buildCommandData } from "../../../src/app/registry/commandRegistry";
import type { BotModule } from "../../../src/app/types/botModule";
import type { SlashCommandData } from "../../../src/shared/types/command";

function command(name: string): SlashCommandData {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(`${name} command`);
}

test("buildCommandData flattens commands from enabled modules in order", () => {
  const modules: BotModule[] = [
    {
      name: "one",
      commands: [
        { name: "alpha", data: command("alpha"), handle: async () => {} },
      ],
    },
    {
      name: "two",
      commands: [
        { name: "beta", data: command("beta"), handle: async () => {} },
      ],
    },
  ];

  const data = buildCommandData(modules) as Array<{ name: string }>;

  assert.deepEqual(
    data.map((item) => item.name),
    ["alpha", "beta"],
  );
});
