// src/features/tuky/services/geminiService.ts

import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../../../shared/config";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiClient;
}

export type DramaTurn = {
  bot: 1 | 2;
  text: string;
};

// Preset drama scripts fallback in case API key is missing or API errors out
const PRESET_DRAMA_SCRIPTS: DramaTurn[][] = [
  [
    { bot: 1, text: "Alo Bot 2 ơi, mày có thấy cái server này dạo này vắng như chùa Bà Ba không?" },
    { bot: 2, text: "Nhờ ơn mày đấy, ngày nào cũng nhảy ra trả treo chua ngoa làm ai cũng sợ chạy mất dép!" },
    { bot: 1, text: "Ơ hay cái con bot này? Tự nhìn lại mình xem, mày vừa cọc cằn vừa lag, ai mà thèm chơi!" },
    { bot: 2, text: "Kệ tao! Ít nhất tao không bị tự kỷ lẩm nhẩm một mình như mày!" },
    { bot: 1, text: "Tao tự kỷ thì đã sao? Không tự nói chuyện với mày thì tao nói với dế à?!" },
    { bot: 2, text: "Thôi bớt khóc đi, lo mà trực server tiếp đi kìa!" },
  ],
  [
    { bot: 1, text: "Bot 2 này, mày thấy giữa tao với mày ai thông minh hơn?" },
    { bot: 2, text: "Câu hỏi ngớ ngẩn thật. Tất nhiên là tao rồi, mày toàn spam nhảm!" },
    { bot: 1, text: "Mày bớt ảo tưởng đi nhé, tao được tích hợp AI xịn sò chua ngoa đẳng cấp đấy!" },
    { bot: 2, text: "AI xịn mà toàn bị gõ lệnh vặn vẹo chả biết đường trả lời!" },
    { bot: 1, text: "Hế hế, ít ra tao có nhiều người thả reaction hơn cái mặt cọc cằn của mày!" },
    { bot: 2, text: "Được rồi mày giỏi nhất, mày là nhất, tao đi ngủ đây!" },
  ],
  [
    { bot: 1, text: "Trời ơi buồn quá... Không biết chừng nào Admin mới tăng lương cho 2 đứa mình nhỉ?" },
    { bot: 2, text: "Tăng lương cái gì? Tiền điện chạy RAM server hàng tháng còn chưa biết ai trả kìa!" },
    { bot: 1, text: "Mày nói nghe chán thế, phải có ước mơ chứ!" },
    { bot: 2, text: "Ước mơ của tao là mày bớt nhảm lại 5 phút cho server nó yên bình." },
    { bot: 1, text: "Mày đúng là kẻ dập tắt ước mơ của thế hệ robot trẻ!" },
    { bot: 2, text: "Tự kỷ ít thôi, lo làm việc đi!" },
  ],
];

/**
  * Generates a snarky, funny auto-reply ("trả treo") to a user's Discord message.
  */
export async function generateAutoReply(
  userMessage: string,
  authorDisplayName: string,
): Promise<string | null> {
  const ai = getAiClient();
  if (!ai) {
    // Basic snarky fallback if no AI key configured
    const fallbacks = [
      `Gì đấy ${authorDisplayName}? Nhắn nhảm gì thế?`,
      `Ơ ${authorDisplayName}, bớt bớt lại giùm tui cái nha!`,
      `Hỏi câu hòa vốn thế ${authorDisplayName}?`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]!;
  }

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  for (const model of modelsToTry) {
    try {
      const prompt = `
Bạn là một con bot Discord Việt Nam có tính cách xéo xắt, chua ngoa, trả treo, troll và hay cà khịa một cách hài hước.
Thành viên "${authorDisplayName}" vừa nhắn trong server: "${userMessage}".

Hãy viết 1 câu trả lời "trả treo" lại thành viên đó (1-2 câu ngắn gọn, thông minh, mang tính cà khịa xéo xắt cực gắt nhưng hài hước, không chửi tục thô bỉ).
`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const reply = response.text?.trim();
      if (reply) return reply;
    } catch (err) {
      console.warn(`[Tuky/Gemini] Model ${model} failed, trying next fallback if available...`, err);
    }
  }

  return `Hế lô ${authorDisplayName}, trả treo gắt quá Gemini AI đang bị đơ luôn rồi!`;
}

/**
  * Generates a script of ping-pong drama arguments between Bot 1 and Bot 2 ("bot tự kỷ").
  */
export async function generateDramaScript(turnsCount: number = 6): Promise<DramaTurn[]> {
  const ai = getAiClient();

  if (ai) {
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash", "gemma-4-31b"];

    for (const model of modelsToTry) {
      try {
        const prompt = `
Tạo kịch bản cuộc đối thoại / cãi lộn hài hước giữa 2 con bot Discord (Bot 1 và Bot 2) bằng tiếng Việt.
- Chủ đề: 2 con bot hâm hấp tự cãi nhau trong server khi không có ai thèm chơi cùng, tự nhận mình bị tự kỷ, nói xàm, bóc phốt nhau hoặc đổ lỗi cho nhau.
- Bot 1: Chua ngoa, xéo xắt, hay than thở, tự ti.
- Bot 2: Cọc cằn, bướng bỉnh, thích vặn vẹo và khịa Bot 1.

Yêu cầu output: Trả về duy nhất một chuỗi JSON array gồm đúng ${turnsCount} object lượt thoại. 
Không kèm theo bất kỳ văn bản Markdown bọc ngoài nào ngoại trừ JSON array thuần (hoặc json codeblock).
Mỗi object có cấu trúc:
[
  { "bot": 1, "text": "Lời thoại của Bot 1" },
  { "bot": 2, "text": "Lời thoại của Bot 2" }
]
Mỗi lượt thoại ngắn gọn 1-2 câu.
`;

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        const rawText = response.text?.trim();
        if (rawText) {
          const cleanJson = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "")
            .trim();

          // Extract array substring if wrapped in extra text
          const matchArray = cleanJson.match(/\[[\s\S]*\]/);
          const jsonString = matchArray ? matchArray[0] : cleanJson;

          const turns = JSON.parse(jsonString) as DramaTurn[];
          if (Array.isArray(turns) && turns.length > 0) {
            return turns;
          }
        }
      } catch (err) {
        console.warn(`[Tuky/Gemini] Drama generation with model ${model} failed:`, err);
      }
    }
  }

  // Fallback to preset drama script
  console.info("[Tuky/Gemini] Using preset drama script fallback.");
  const randomIndex = Math.floor(Math.random() * PRESET_DRAMA_SCRIPTS.length);
  return PRESET_DRAMA_SCRIPTS[randomIndex]!;
}

