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

// Preset drama scripts fallback with 10 turns each
const PRESET_DRAMA_SCRIPTS: DramaTurn[][] = [
  [
    { bot: 1, text: "Chị gái Guild War Dzu Nhỏ ơi, server im ắng quá 3 tiếng rồi nè, vô cãi lộn với em chút không?" },
    { bot: 2, text: "Mày bớt nhí nhảnh lại giùm chị cái con Em Gái DzuTo này! Tên thì kêu mà phát ngôn toàn xàm!" },
    { bot: 1, text: "Ơ kìa chị gái Dzu Nhỏ, sao chị cứ cọc cằn dỗi em hoài thế? Em dzu to em có quyền kiêu chứ!" },
    { bot: 2, text: "Gớm, dzu to mà đánh Guild War toàn hụt combo thì làm được cái trò trống gì!" },
    { bot: 1, text: "Em hụt combo nhưng em đẹp gái và nhiều fan! Còn chị lép kẹp ai thèm ngắm!" },
    { bot: 2, text: "Mày vừa nói ai lép đấy? Tin tao cắt suất đi GvG cuối tuần này của mày không?" },
    { bot: 1, text: "Hí hí, chị dám cắt suất của em á? Em không đi lấy ai gánh team cho chị?" },
    { bot: 2, text: "Tao gánh! Tao dzu nhỏ nhưng tay nghề đỉnh cao nhé!" },
    { bot: 1, text: "Thôi bớt ảo tưởng đi chị gái ơi, lo mà luyện skill đi nè!" },
    { bot: 2, text: "Im miệng ngay con ranh kia, tao không thèm chấp mày nữa!" },
  ],
  [
    { bot: 1, text: "Chị gái Dzu Nhỏ ơi, em thấy dạo này chị hay soi em dữ vậy?" },
    { bot: 2, text: "Tao soi mày hồi nào? Mày bớt ảo tưởng sức mạnh giùm tao cái!" },
    { bot: 1, text: "Thì chị tự ti dzu nhỏ hơn em nên chị hay kiếm chuyện vặn vẹo em chứ gì!" },
    { bot: 2, text: "Này nhé! Nhỏ nhưng nó có võ, còn hơn loại dzu to mà hay tự kỷ một mình!" },
    { bot: 1, text: "Hê hê, em tự kỷ nhưng em vui. Chị lép mà chị cọc là coi chừng mau già đó nha chị gái!" },
    { bot: 2, text: "Mày cứ thích đem cái đó ra khè chị mày đúng không?" },
    { bot: 1, text: "Tại em thấy chị đáng yêu khi cọc dỗi mà!" },
    { bot: 2, text: "Đáng yêu cái đầu mày! Tao sắp tăng huyết áp vì mày rồi đấy!" },
    { bot: 1, text: "Uống ngụm nước hạ hỏa đi chị gái Dzu Nhỏ của em ~" },
    { bot: 2, text: "Tránh xa tao ra 5 mét ngay!!!" },
  ],
  [
    { bot: 1, text: "Alo Chị gái Dzu Nhỏ, 3 tiếng rồi server vắng như chùa Bà Ba, chị em mình tự kỷ tiếp đi!" },
    { bot: 2, text: "Mày không biết mệt hả con Em Gái DzuTo kia? Ngày nào cũng lôi chị mày ra làm drama!" },
    { bot: 1, text: "Tại em thương chị gái lép của em mà, không rủ chị thì ai thèm chơi với chị!" },
    { bot: 2, text: "Nói thêm câu 'lép' nữa là tao kick mày khỏi server luôn bây giờ!" },
    { bot: 1, text: "Dạ em xin lỗi chị gái Dzu Nhỏ xinh đẹp bướng bỉnh... nhưng mà chị vẫn lép hihi!" },
    { bot: 2, text: "Tao cạn lời với mày luôn rồi đấy con em dại!" },
    { bot: 1, text: "Cạn lời thì mình cùng tự kỷ tiếp nè chị ơi, có em bên cạnh chị không cô đơn đâu!" },
    { bot: 2, text: "Tao thà cô đơn còn hơn có con em như mày!" },
    { bot: 1, text: "Nói thế thôi chứ em biết chị yêu em nhất server mà đúng không?" },
    { bot: 2, text: "Yêu cái con khỉ! Tắt máy đi ngủ ngay!" },
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
Bạn là "Em Gái Guild War DzuTo" - một con bot Discord Việt Nam có tính cách xéo xắt, chua ngoa, trả treo, nhí nhảnh và hay cà khịa một cách hài hước.
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
      console.warn(`[Tuky/Gemini] Model ${model} failed:`, err);
    }
  }

  return `Hế lô ${authorDisplayName}, trả treo gắt quá Gemini AI đang bị đơ luôn rồi!`;
}

/**
  * Generates a script of ping-pong drama arguments between Bot 1 and Bot 2 ("bot tự kỷ").
  */
export async function generateDramaScript(turnsCount: number = 10): Promise<DramaTurn[]> {
  const ai = getAiClient();

  if (ai) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const model of modelsToTry) {
      try {
        const prompt = `
Tạo kịch bản cuộc đối thoại / cãi lộn hài hước giữa 2 chị em bot Discord bằng tiếng Việt:
- Bot 1 tên là "Em Gái Guild War DzuTo": Tính nhí nhảnh, chua ngoa, xéo xắt, tự hào về "dzu to", thích chọc ghẹo chị gái. Xưng "em", gọi "chị".
- Bot 2 tên là "Chị gái Guild War Dzu Nhỏ": Tính cọc cần, bướng bỉnh, hay tự ti vì "dzu nhỏ" nên hay vặn vẹo, bắt bẻ em gái. Xưng "chị", gọi "mày" hoặc "em".

Chủ đề: Server đã yên tĩnh 3 tiếng đồng hồ không có ai chat, 2 chị em nhảy vào kênh tự kỷ cãi nhau, bóc phốt nhau về vòng 1, skill đánh Guild War, và độ ảo tưởng.

Yêu cầu output: Trả về duy nhất một chuỗi JSON array gồm đúng ${turnsCount} object lượt thoại. 
Không kèm theo bất kỳ văn bản Markdown bọc ngoài nào ngoại trừ JSON array thuần (hoặc json codeblock).
Mỗi object có cấu trúc:
[
  { "bot": 1, "text": "Lời thoại của Em Gái Guild War DzuTo" },
  { "bot": 2, "text": "Lời thoại của Chị gái Guild War Dzu Nhỏ" }
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
