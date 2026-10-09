import assert from "node:assert/strict";
import { test } from "node:test";
import { aiServiceConfig } from "./ai-service-config.mjs";

test("공개 설정에는 AI 서버 주소만 담고 정본을 바꾸면 새 주소를 내보낸다", () => {
  const links = { aiService: "https://one.example", private: "never-export" };
  assert.deepEqual(JSON.parse(aiServiceConfig(links)), { aiServiceUrl: links.aiService });
  links.aiService = "https://two.example/";
  assert.deepEqual(JSON.parse(aiServiceConfig(links)), { aiServiceUrl: "https://two.example" });
});

test("인증값과 경로, HTTPS 이외의 주소는 배포하지 않는다", () => {
  for (const aiService of [undefined, "http://example.com", "https://key@example.com",
    "https://example.com/api/chat", "https://example.com?key=secret", "https://example.com#hash"]) {
    assert.throws(() => aiServiceConfig({ aiService }));
  }
});
