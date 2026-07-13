import { test } from "node:test";
import assert from "node:assert/strict";
import { SlashCommandBuilder } from "discord.js";
import { formatHelpText } from "../../../../src/features/help/commands/help.command";
import type { BotModule } from "../../../../src/app/types/botModule";
import type { SlashCommandData } from "../../../../src/shared/types/command";

function simpleCommand(name: string, description: string): SlashCommandData {
  return new SlashCommandBuilder().setName(name).setDescription(description);
}

function subCommand(
  name: string,
  description: string,
  subs: Array<{ name: string; description: string }>,
): SlashCommandData {
  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description);
  for (const s of subs) {
    builder.addSubcommand((sub) =>
      sub.setName(s.name).setDescription(s.description),
    );
  }
  return builder;
}

test("formatHelpText lists commands with descriptions and subcommands", () => {
  const modules: BotModule[] = [
    {
      name: "poll",
      commands: [
        {
          name: "poll",
          data: subCommand("poll", "Tạo poll vote GVG", [
            { name: "create", description: "Tạo poll GVG cho tuần hiện tại" },
          ]),
          handle: async () => {},
        },
      ],
    },
    {
      name: "voice",
      commands: [
        {
          name: "join",
          data: simpleCommand("join", "Cho bot tham gia voice channel"),
          handle: async () => {},
        },
      ],
    },
  ];

  const result = formatHelpText(modules);

  assert.ok(result.includes("**/poll** — Tạo poll vote GVG"));
  assert.ok(result.includes("• create — Tạo poll GVG cho tuần hiện tại"));
  assert.ok(result.includes("**/join** — Cho bot tham gia voice channel"));
});

test("formatHelpText skips modules without commands", () => {
  const modules: BotModule[] = [
    {
      name: "notifications",
      // no commands field
    },
    {
      name: "poll",
      commands: [
        {
          name: "poll",
          data: simpleCommand("poll", "Tạo poll"),
          handle: async () => {},
        },
      ],
    },
  ];

  const result = formatHelpText(modules);

  assert.ok(result.includes("**/poll**"));
  assert.ok(!result.includes("notifications"));
});

test("formatHelpText starts with header", () => {
  const modules: BotModule[] = [];
  const result = formatHelpText(modules);
  assert.equal(result, "📖 Danh sách lệnh");
});
