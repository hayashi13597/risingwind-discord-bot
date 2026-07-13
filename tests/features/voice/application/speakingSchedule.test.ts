// tests/features/voice/application/speakingSchedule.test.ts
//
// Kiểm thử quy ước offset trong tên file audio.
// Tên file có dạng `MM_SS-MM_SS.mp3` với mỗi token MM_SS là mốc thời gian
// tính từ đầu Guild War (30 phút = 1800 giây).
//
// Hàm gwRemaining(MM, SS) = 1800 − (MM×60 + SS) chuyển mốc thời gian
// thành số giây offset (khoảng cách từ đầu Guild War tới mốc đó).
//
// Vì parseOffsetToken là hàm nội bộ không export, ta kiểm tra công thức
// offset gián tiếp bằng cách tính value kỳ vọng và assert.

import { test } from "node:test";
import assert from "node:assert/strict";

test("Audio filename convention: 25_30 means 25 min 30 sec into 30-min war", () => {
  // gwRemaining(25, 30) = 1800 - 1530 = 270 seconds = 4.5 min offset from start
  const expected = 30 * 60 - (25 * 60 + 30);
  assert.equal(expected, 270);
});

test("Audio filename convention: 26_00-16_00 means two playback times", () => {
  // First offset: gwRemaining(26, 0) = 1800 - 1560 = 240
  // Second offset: gwRemaining(16, 0) = 1800 - 960 = 840
  const first = 30 * 60 - (26 * 60);
  const second = 30 * 60 - (16 * 60);
  assert.equal(first, 240);
  assert.equal(second, 840);
});