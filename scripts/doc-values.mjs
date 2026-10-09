#!/usr/bin/env node
// 문서 여러 곳에 나오는 값과 글 묶음을 정본에서 채운다. 목록과 규칙은 docs/common-values.md.
// 사용법:
//   node scripts/doc-values.mjs           추적한 .md(release/, docs/superpowers/ 제외)의 표시를 정본으로 채우고 목록 표를 다시 만든다
//   node scripts/doc-values.mjs --check   고치지 않고 어긋난 곳(파일:줄, 키, 지금 값, 정본 값)과 모르는 키를 보여 준다
//   node scripts/doc-values.mjs --list    키, 값, 정본, 쓰는 곳 수(표시 수 + 표시 없이 같은 글로 둔 CASES 수. scripts/doc-values.cases.mjs)
//   node scripts/doc-values.mjs --json <파일>  모든 값(손으로 정한 값 + 계산값)을 {키: 값} JSON으로 쓴다. 값은 마크다운 이스케이프(\~, \|)를 푼 글이다(홈페이지용)
// 표시:
//   한 줄 안 값    <!-- v:키 -->값<!-- /v -->
//   여러 줄 묶음   <!-- b:이름 키=값 키="띄어 쓴 값" --> 다음 줄부터 제 줄의 <!-- /b --> 앞까지
//   묶음 원본은 docs/blocks/<이름>.md. 첫 줄 <!-- … -->은 설명이고, {{키}}는 표시의 인자({{키|기본값}}), {{v:키}}는 값이다.
// 값의 정본: site-links.json(link.*), doc-values.json(손으로 정하는 값, 에이전트, 프리셋 명부), 템플릿과 handbook 파일(계산값).
// exit: 0 정상, 1 --check에서 어긋남·모르는 키·잘못된 표시가 있거나, 채울 수 없는 표시가 있어 아무것도 쓰지 않음
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CASES } from "./doc-values.cases.mjs";

const ROOT = join(import.meta.dirname, "..");
const LIST = "docs/common-values.md";
const LIST_RX = /(<!-- doc-values:list -->\n)[\s\S]*?(<!-- \/doc-values:list -->)/;
const MARK =
  /^<!-- b:(?<name>[\w-]+)(?<args>(?:[ \t]+[\w-]+=(?:"[^"\n]*"|[^\s"]+))*)[ \t]*-->\n(?<body>[\s\S]*?)^<!-- \/b -->$|<!-- v:(?<key>[\w.-]+) -->(?<val>.*?)<!-- \/v -->/gm;

// "1시간 30분" → 90(분), "140만" → 1400000, "2.8억" → 280000000
const seconds = (s) => Number(s.match(/^(\d+)초$/)[1]);
const minutes = (s) => Number(s.match(/(\d+)시간/)?.[1] ?? 0) * 60 + Number(s.match(/(\d+)분/)?.[1] ?? 0);
// 84(분) → "1시간 24분"(반올림 없이)
const minText = (r) => [Math.floor(r / 60) && `${Math.floor(r / 60)}시간`, r % 60 && `${r % 60}분`].filter(Boolean).join(" ");
// 90(분) → "1시간 30분". 5분 단위로 반올림한다
export const timeText = (m) => minText(Math.round(m / 5) * 5);
function tokens(s) {
  const m = s.replace(/,/g, "").match(/^([\d.]+)(만|억)$/);
  if (!m) throw new Error(`토큰 값은 "140만", "2.8억" 꼴이어야 한다: ${s}`);
  return Number(m[1]) * (m[2] === "억" ? 1e8 : 1e4);
}
// 개수 → 한글 수 관형사("두 템플릿"). 1~12 밖은 숫자 그대로
const KO = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열", "열한", "열두"];
const ko = (n) => KO[n] ?? String(n);
const tableLinks = (md) => [...md.matchAll(/^\|\s*\[[^\]]+\]\(([^)#\s]+\.md)\)\s*\|/gm)].map((m) => m[1]);

// 키 → { value, src(정본), desc(뜻) }
export function loadValues(root = ROOT) {
  const vals = new Map();
  const add = (key, value, src, desc) => vals.set(key, { value: String(value), src, desc });
  // 앞에서 만든 값을 읽는다. 정본에 빠진 값이 있으면 그 키 이름을 담아 멈춘다
  const need = (key) => {
    if (!vals.has(key)) throw new Error(`값이 없다: ${key} (doc-values.json을 확인한다)`);
    return vals.get(key).value;
  };
  const json = (f) => JSON.parse(readFileSync(join(root, f), "utf8"));

  const links = json("site-links.json");
  const linkDesc = { home: "홈페이지(프로킷 사이트) 주소. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다", pages: "프리셋 사이트(GitHub Pages) 주소. 뒤에 /<이름>/을 붙인다. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다", repo: "pro-kit 저장소 주소", packs: "프리셋 팩 저장소 주소. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다", premiumPacks: "프리미엄 프리셋 팩 저장소 주소. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다" };
  for (const [k, v] of Object.entries(links)) add(`link.${k}`, v, `site-links.json ${k}`, linkDesc[k] ?? `${k} 주소`);
  add("link.packsReleases", `${links.packs}/releases`, "site-links.json packs + /releases", "프리셋 팩 릴리스 목록 주소");

  const d = json("doc-values.json");
  add("node.min", d.node.min, "doc-values.json node.min", "준비물 Node 최소 판(설치기가 이보다 낮으면 멈춘다)");
  add("node.recommended", d.node.recommended, "doc-values.json node.recommended", "권장 Node 판(지금 LTS. 이보다 낮으면 설치기가 경고한다)");
  add("node.eol", d.node.eol, "doc-values.json node.eol", "Node 20 지원 종료일");
  add("vercel.node", d.vercel.node, "doc-values.json vercel.node", "Vercel 프로젝트 Settings의 Node.js Version으로 고르는 판");
  add("vercel.node20Stop", d.vercel.node20Stop, "doc-values.json vercel.node20Stop", "Vercel이 Node.js 20.x 새 배포를 막는 날");
  add("policy.agentBrowser.da", d.policy.agentBrowser.da, "doc-values.json policy.agentBrowser.da", "agent-browser CLI 설치 정책 문장(~다체. 에이전트·템플릿 README용). 기본 실행도 이 정책을 따른다");
  add("policy.agentBrowser.yo", d.policy.agentBrowser.yo, "doc-values.json policy.agentBrowser.yo", "agent-browser CLI 설치 정책 문장(~요체. handbook용)");
  add("policy.agentBrowser.cell", d.policy.agentBrowser.cell, "doc-values.json policy.agentBrowser.cell", "같은 정책의 표 칸 꼴(주어와 끝맺음 없이 \"…설치\"). 행 이름이 agent-browser CLI인 칸, \"agent-browser CLI는\" 뒤, \"agent-browser CLI(\" 괄호 안에 쓴다");
  add("meta.presetModel", d.meta.presetModel, "doc-values.json meta.presetModel", "프리셋을 만든 모델");
  const glossDesc = { presetPack: "프리셋 팩", round: "라운드", migration: "마이그레이션", spec: "스펙" };
  for (const [k, v] of Object.entries(d.gloss)) add(`gloss.${k}`, v, `doc-values.json gloss.${k}`, k === "clonePack" ? "클론 튜토리얼(Nextflix, Claudle) 팩의 풀이(features.md·design-notes.md가 든다). 화면 프리셋 팩 9개에는 없으니 용어집은 gloss.presetPack을 쓴다" : `용어 "${glossDesc[k] ?? k}"의 짧은 풀이(본문에서 용어 링크 뒤 괄호에 쓴다). 용어집 tutorials/reference/glossary.md도 이 값을 쓴다`);
  const C = d.cost;
  add("cost.tokensPerUsd", C.tokensPerUsd, "doc-values.json cost.tokensPerUsd", "API 요금 1달러어치 토큰(캐시 뺀 값)");
  add("cost.cachedPerUsd", C.cachedPerUsd, "doc-values.json cost.cachedPerUsd", "API 요금 1달러어치 토큰(캐시 포함)");
  add("cost.multiplier", C.multiplier, "doc-values.json cost.multiplier", "최솟값이 늘 수 있는 배수(넉넉히 잡는 값). 단위 \"배\"는 값 밖");
  add("cost.multiplierModel", C.multiplierModel, "doc-values.json cost.multiplierModel", "쓰는 AI와 모델에 따른 배수");
  add("cost.multiplierRefine", C.multiplierRefine, "doc-values.json cost.multiplierRefine", "다시 디자인하고 다듬을 때 든 배수");
  const { oneShotMax, reviseMax } = C.timeRange;
  add("cost.timeRange.oneShotMax", oneShotMax, "doc-values.json cost.timeRange.oneShotMax", "요약 시간 범위의 끝: 한 번에 완성할 때 걸릴 수 있는 시간 = 최솟값 × 이 배수(쓰는 AI·모델과 끊김. cost.multiplierModel의 위 끝)");
  add("cost.timeRange.reviseMax", reviseMax, "doc-values.json cost.timeRange.reviseMax", "요약 시간 괄호: 여러 번 고쳐 달라고 할 때 = 최솟값 × 이 배수(cost.multiplier·cost.multiplierRefine의 위 끝)");
  // 고쳐 달라고 할 때마다 더 드는 시간(프리셋을 만들 때 잰 값). 원문 설명과 흐름(flow)은 tutorials/reference/process-and-time.md, 펼쳐 보기는 묶음 revise-time-detail.
  // doc-values.json에는 물결을 그대로 두고 문서 값은 \~로 바꾼다(한 문단에 둘이면 취소선이 된다). 홈페이지는 --json 내보내기(물결 그대로)로 읽는다
  const R = C.revise;
  const reviseDesc = { fix: "고칠 때마다: 요청을 읽고 고칠 곳을 찾아 고치기", check: "고칠 때마다: 검사(타입·포맷·빌드)", review: "큰 수정일 때: 리뷰 에이전트", close: "마지막에 한 번: 라운드 닫기(기록·검사·커밋)", oneSpot: "예: 한 군데를 고칠 때 모두 더해 더 드는 시간(올곧 R4c)", reviewRound: "예: 디자인을 다시 하거나 마무리 검토를 한 번 더 할 때 더 드는 시간" };
  const tilde = (v) => v.replace("~", "\\~");
  const exampleDesc = "고쳐 달라고 할 때마다 더 드는 시간의 예시 분해(tutorials/reference/process-and-time.md). <예>는 oneSpot(올곧 한 군데)·twoSpotsClaudle·twoSpotsOlgot(두 군데)·reviewRoundOlgot·reviewRoundClaudle(마무리 검토 한 번 더), <과정>은 total(합)·fix(고치기)·recheck(모든 페이지 다시 확인)·review(리뷰 에이전트 + 디자인 검사 에이전트를 메인이 기다린 분의 합. 구현 에이전트 제외). 시간은 세션 기록 .done의 wall이 정본이고, 명령 글자로 과정을 나눴다. oneSpot·twoSpotsClaudle은 흐름(cost.revise.flow)에서 계산한다";
  for (const [k, v] of Object.entries(R)) {
    if (k === "recheck") for (const [pages, t] of Object.entries(v)) add(`cost.revise.recheck.${pages}`, t, `doc-values.json cost.revise.recheck.${pages}`, `고칠 때마다: 모든 페이지 다시 확인(${pages}쪽 Claudle). 페이지 수에 비례한다. Claudle 두 군데 예시의 모든 페이지 다시 확인 값이기도 하다`);
    else if (k === "examples")
      for (const [ex, parts] of Object.entries(v))
        for (const [part, t] of Object.entries(parts)) {
          // review가 {agents, design}이면 두 에이전트를 기다린 분(소수)을 더해 분 단위로 반올림한다
          const S = `doc-values.json cost.revise.examples.${ex}.${part}`;
          if (typeof t === "string") add(`cost.revise.example.${ex}.${part}`, t, S, exampleDesc);
          else add(`cost.revise.example.${ex}.${part}`, minText(Math.round(Object.values(t).reduce((a, b) => a + b, 0))), `계산: ${S}의 합`, exampleDesc);
        }
    else if (k === "flow")
      for (const [ex, steps] of Object.entries(v))
        for (const [step, t] of Object.entries(steps)) {
          const S = `doc-values.json cost.revise.flow.${ex}.${step}`;
          add(`cost.revise.flow.${ex}.${step}`, t, S, "고칠 때 한 번의 흐름(시간 순서 단계). <예>는 oneSpot(올곧 한 줄, gantt)·twoSpotsClaudle(Claudle 두 가지, 표). 합계(cost.revise.oneSpot, cost.revise.example.twoSpotsClaudle.total)와 올곧 한 줄의 모든 페이지 다시 확인(cost.revise.example.oneSpot.recheck)은 이 단계에서 계산한다");
          add(`cost.revise.flow.${ex}.${step}.min`, minutes(t), `계산: ${S}`, "같은 시간의 분 수(gantt 막대 길이)");
        }
    else add(`cost.revise.${k}`, tilde(v), `doc-values.json cost.revise.${k}`, `${reviseDesc[k]}${v.includes("~") ? ". 물결은 \\~로 바꾼 값" : ""}`);
  }
  // 흐름(flow)에서 계산하는 값: 한 군데 합, 한 군데의 모든 페이지 다시 확인(고치기 전과 뒤), Claudle 두 가지 합
  const F = R.flow;
  const flowSum = (o, keys = Object.keys(o)) => minText(keys.reduce((s, k) => s + minutes(o[k]), 0));
  add("cost.revise.oneSpot", flowSum(F.oneSpot), "계산: doc-values.json cost.revise.flow.oneSpot의 합", reviseDesc.oneSpot);
  add("cost.revise.example.oneSpot.recheck", flowSum(F.oneSpot, ["before", "recheck"]), "계산: doc-values.json cost.revise.flow.oneSpot.before + recheck", exampleDesc);
  add("cost.revise.example.twoSpotsClaudle.total", flowSum(F.twoSpotsClaudle), "계산: doc-values.json cost.revise.flow.twoSpotsClaudle의 합", exampleDesc);
  // 두 예시 값으로 만드는 범위("6\~37분")
  const upTo = (a, b) => `${a.replace(/분$/, "")}\\~${b}`;
  const X = R.examples;
  const ex = (k) => vals.get(`cost.revise.example.${k}`).value;
  add("cost.revise.recheck.203", upTo(ex("oneSpot.recheck"), X.twoSpotsOlgot.recheck), "계산: cost.revise.example.oneSpot.recheck~doc-values.json cost.revise.examples.twoSpotsOlgot.recheck", "고칠 때마다: 모든 페이지 다시 확인(203쪽 올곧). 작은 수정은 그 검사만 다시 돌려 짧고(한 군데 예시), 배치를 고치면 모든 검사를 다시 돌려 길다(두 군데 예시)");
  add("cost.revise.twoSpots", upTo(ex("twoSpotsClaudle.total"), X.twoSpotsOlgot.total), "계산: cost.revise.example.twoSpotsClaudle.total~doc-values.json cost.revise.examples.twoSpotsOlgot.total", "예: 두 군데를 고칠 때 더 드는 시간(Claudle 공개 전 손보기, 올곧 두 군데 고치기 예시의 합)");
  // 요약 시간: 최솟값 lo부터 hi × 배수까지. 표 칸(cell)과 문장(text) 꼴
  const span = (key, lo, hi, src, what) => {
    const [b, c] = [timeText(minutes(hi) * oneShotMax), timeText(minutes(hi) * reviseMax)];
    const S = `계산: ${src} × cost.timeRange`;
    add(`${key}.max`, b, `${S}.oneShotMax`, `${what} 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림)`);
    add(`${key}.revise`, c, `${S}.reviseMax`, `${what} 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림)`);
    add(`${key}.cell`, `약 ${lo}\\~${b} (여러 번 고치면 약 ${c}까지)`, S, `${what} 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다`);
    add(`${key}.text`, `한 번에 완성하면 약 ${lo}\\~${b}(여러 번 고쳐 달라고 하면 약 ${c}까지)`, S, `${what} 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다`);
  };
  // 달러 → 토큰: 1달러당 토큰을 곱해 유효숫자 두 자리로 쓴다("5.5만", "1,400만", "1.9억"). 0.5달러 단위로 200달러까지
  const man = (s) => tokens(s) / 1e4;
  const sig2 = (x) => {
    const step = x < 10 ? 0.1 : 10 ** (Math.floor(Math.log10(x)) - 1);
    return Math.floor(x / step + 0.5 + 1e-9) * step;
  };
  const fmtMan = (x) => {
    const r = sig2(x);
    if (r >= 1e4) return `${(r / 1e4).toFixed(1)}억`;
    return `${r < 10 ? r.toFixed(1).replace(/\.0$/, "") : String(Math.round(r)).replace(/\B(?=(\d{3})+$)/g, ",")}만`;
  };
  for (let u = 0.5; u <= 200; u += 0.5) {
    add(`cost.tokens.${u}`, fmtMan(u * man(C.tokensPerUsd)), "계산: doc-values.json cost.tokensPerUsd × 달러", "달러어치 토큰(캐시 뺀 값. 키 끝이 달러, 0.5달러 단위)");
    add(`cost.cached.${u}`, fmtMan(u * man(C.cachedPerUsd)), "계산: doc-values.json cost.cachedPerUsd × 달러", "달러어치 토큰(캐시 포함. 키 끝이 달러, 0.5달러 단위)");
  }
  add("cost.date", C.date, "doc-values.json cost.date", "단위값(작업 폴더에서 프로젝트 만들기, 첫 화면 같은)을 잰 날. 한도를 어림한 날(limit.pro5h.date)과는 따로 둔다");
  add("cost.feature.time", C.feature.time, "doc-values.json cost.feature.time", "기능 하나를 만들고 검사하는 데 걸리는 시간");
  add("cost.feature.usd", C.feature.usd, "doc-values.json cost.feature.usd", "기능 하나를 만들고 검사하는 데 드는 API 요금 환산(달러)");
  add("cost.image.tokens", C.image.tokens, "doc-values.json cost.image.tokens", "그림 한 장을 다시 그릴 때 더 드는 토큰. 근거: 울림 처음부터 만들 때 그림 41장에 68만 토큰(그림 5장에 8.3만인 고루도 장당 같다)을 장수로 나눈 1.66만을 올림했다");
  add("cost.image.time", C.image.time, "doc-values.json cost.image.time", "그림 한 장을 그리는 시간. 프리셋 단계별 표의 그림 행(처음부터)은 장수 × 이 값을 분으로 올림한다");
  // 단계별 표(프리셋 쪽, 클론 README)의 단위 시간. 값이 문자열이면 두 열(프리셋 팩으로·처음부터)이 같고, {pack, scratch}면 열마다 다르다
  const stageDesc = { setup: "준비: pro-kit 받기, 프로젝트 만들기(클론 1장도 같다)", plan: "기획: 서비스 질문, 이름, 사이트맵(주제를 바꿀 때 다시 하는 기획도 프리셋 팩 값)", design: "디자인: DESIGN.md", mockup: "화면 구성: 시안 3장(처음부터만)", packImages: "그림: 팩에서 받기(프리셋 팩으로만)", first: "첫 화면", page: "나머지 페이지 한 쪽(올곧은 한 종)에 드는 시간. 프리셋마다 × 나머지 쪽 수", export: "HTML 내보내기", pages: "(선택) GitHub Pages 배포(클론 4장 화면 올리기도 같다)", "clone.design": "클론 3장 디자인 정하기(구성도로 고르기)", "clone.mockup": "클론 3장에서 시안을 그리면 더 드는 시간", "clone.check": "클론 11장 검사와 다듬기", "clone.deploy": "클론 12장 배포" };
  const runLabel = { pack: "프리셋 팩으로", scratch: "처음부터" };
  for (const [k, v] of Object.entries(C.stage)) {
    if (typeof v === "string") add(`cost.stage.${k}.time`, v, `doc-values.json cost.stage.${k}`, `단계별 표: ${stageDesc[k]}`);
    else for (const [r, t] of Object.entries(v)) add(`cost.stage.${k}.${r}.time`, t, `doc-values.json cost.stage.${k}.${r}`, `단계별 표: ${runLabel[r] ? `${stageDesc[k]}(${runLabel[r]})` : stageDesc[`${k}.${r}`]}`);
  }
  // 단계별 표 값의 근거로 잰 단위값(tutorials/reference/costs-and-keys.md "잰 것" 표). 잰 날은 cost.date
  const unitDesc = { setup: "작업 폴더에서 프로젝트 만들기", recommend: "스타일 추천", designMd: "DESIGN.md 받기", first: "첫 화면(다듬기 없이)", second: "두 번째 화면(따로 만들 때)" };
  for (const [k, o] of Object.entries(C.unit))
    for (const [f, v] of Object.entries(o)) add(`cost.unit.${k}.${f}`, tilde(v), `doc-values.json cost.unit.${k}.${f}`, `잰 단위값: ${unitDesc[k]}의 ${f === "time" ? "시간" : "API 요금 환산(달러)"}${v.includes("~") ? ". 물결은 \\~로 바꾼 값" : ""}`);
  add("supabaseCli.min", d.supabaseCli.min, "doc-values.json supabaseCli.min", "supabase 템플릿의 Supabase CLI 최소 판");
  const W = d.limits.window;
  add("limit.window", W, "doc-values.json limits.window", "구독 요금제의 사용량 한도 시간(\"5시간 한도\"). 링크 주소의 앵커(#5시간-한도에-걸리면)에는 표시를 달 수 없어 링크 검사가 지킨다");
  add("limit.waitLong", minText(minutes(W) - 60), "계산: doc-values.json limits.window − 1시간", "한도에 걸렸을 때 길면 기다리는 시간(처음 쓰기 시작하고 한 시간쯤 만에 걸린 경우의 어림)");
  const L = d.limits.pro5h;
  add("limit.pro5h.tokens", L.tokens, "doc-values.json limits.pro5h.tokens", "Pro 5시간 한도 어림(토큰). 한도 횟수 계산에 쓴다");
  add("limit.pro5h.usd", L.usd, "doc-values.json limits.pro5h.usd", "같은 한도의 API 요금 환산(달러)");
  add("limit.pro5h.date", L.date, "doc-values.json limits.pro5h.date", "한도를 어림한 날");
  add("limit.pro5h.plans", L.plans, "doc-values.json limits.pro5h.plans", "5시간 한도를 어림한 구독 요금제(한도 줄의 앞머리와 표 머리)");

  const agents = Object.entries(d.agents);
  for (const [id, a] of agents) {
    add(`agent.${id}.name`, a.name, "doc-values.json agents.<이름>.name", "지원 에이전트 이름");
    add(`agent.${id}.open`, a.open, "doc-values.json agents.<이름>.open", "에이전트를 요청과 함께 여는 명령");
    add(`agent.${id}.start`, a.start, "doc-values.json agents.<이름>.start", "에이전트를 요청 없이 여는 명령");
    add(`agent.${id}.openCode`, `\`${a.open}\``, "doc-values.json agents.<이름>.open", "같은 명령의 코드 꼴(백틱 포함). 표 칸처럼 인라인 코드 한 덩어리가 이 값 전체일 때 코드 바깥에 표시를 단다");
    add(`agent.${id}.startCode`, `\`${a.start}\``, "doc-values.json agents.<이름>.start", "같은 명령의 코드 꼴(백틱 포함). 표 칸처럼 인라인 코드 한 덩어리가 이 값 전체일 때 코드 바깥에 표시를 단다");
    add(`agent.${id}.yolo`, a.yolo, "doc-values.json agents.<이름>.yolo", "에이전트를 묻지 않고 진행하게 여는 명령");
    add(`agent.${id}.yoloCode`, `\`${a.yolo}\``, "doc-values.json agents.<이름>.yolo", "같은 명령의 코드 꼴(백틱 포함). 인라인 코드 한 덩어리가 이 값 전체일 때 코드 바깥에 표시를 단다");
    if (a.install) {
      add(`agent.${id}.install`, a.install, "doc-values.json agents.<이름>.install", "에이전트 설치 명령");
      add(`agent.${id}.installCell`, `\`${a.install.replaceAll("|", "\\|")}\``, "doc-values.json agents.<이름>.install", "같은 명령의 표 칸 안 코드 꼴(백틱 포함, 파이프는 \\|)");
    }
  }
  add("agents.count", agents.length, "doc-values.json agents 수", "지원 에이전트 수");
  add("agents.count.ko", ko(agents.length), "doc-values.json agents 수", "지원 에이전트 수의 한글 수 관형사");
  add("agents.list", agents.map(([, a]) => a.name).join(", "), "doc-values.json agents 이름", "지원 에이전트 목록");
  add("agents.imageTools", agents.filter(([, a]) => a.imageTool).map(([, a]) => a.name).join(", "), "doc-values.json agents imageTool", "자체 이미지 도구가 있어 준비 없이 그리는 에이전트 목록");

  const catDesc = { name: "디자인 카탈로그 이름", url: "디자인 카탈로그 이름 링크의 주소(주소 안에는 표시를 달 수 없어 테스트가 같은지 본다)", count: "카탈로그가 싣는 스타일 수(개). 센 날은 date", date: "스타일 수를 센 날" };
  for (const [id, c] of Object.entries(d.catalogs))
    for (const f of ["name", "url", "count", "date"]) add(`catalogs.${id}.${f}`, c[f], `doc-values.json catalogs.<이름>.${f}`, catDesc[f]);

  const ports = d.ports;
  add("port.web", ports.web, "doc-values.json ports.web", "템플릿 웹 개발 서버 포트(pnpm dev)");
  add("port.neonDb", ports.neonDb, "doc-values.json ports.neonDb", "neon 템플릿 로컬 DB(compose Postgres) 포트");
  add("port.supabaseDb", ports.supabaseDb, "doc-values.json ports.supabaseDb", "supabase 템플릿 로컬 DB(Supabase 스택 Postgres) 포트");
  add("port.supabasePooler", ports.supabasePooler, "doc-values.json ports.supabasePooler", "supabase 템플릿 원격 Supabase의 transaction pooler 포트(배포한 앱의 DATABASE_URL). 설치본 prokit-db 스킬의 같은 값은 테스트가 비교한다");
  add("port.web.urlCode", `\`http://localhost:${ports.web}\``, "doc-values.json ports.web", "웹 개발 서버 주소의 코드 꼴(백틱 포함)");
  add("port.neonDb.addrCode", `\`localhost:${ports.neonDb}\``, "doc-values.json ports.neonDb", "neon 로컬 DB 주소의 코드 꼴(백틱 포함)");
  add("port.supabaseDb.addrCode", `\`127.0.0.1:${ports.supabaseDb}\``, "doc-values.json ports.supabaseDb", "supabase 로컬 DB 주소의 코드 꼴(백틱 포함)");

  // 한도에 걸리는 번 수: 한도 어림으로 나눠 올림한 값에서 1을 뺀다(한도 안이면 0). tutorials/reference/costs-and-keys.md "5시간 한도에 걸리면"
  const limitN = (t) => Math.ceil(tokens(t) / tokens(L.tokens)) - 1;
  const limitText = (n) => (n ? `${W} 한도에 약 ${n}번 걸려요` : `${W} 한도 안`);
  const runs = { pack: "프리셋 팩으로 만들 때", scratch: "처음부터 만들 때", screens: "화면까지(1~4장)", full: "끝까지(1~12장)" };
  const fields = { time: "최소 시간", tokens: "최소 토큰", cached: "캐시 포함 토큰", usd: "API 요금 환산(달러)" };
  const P = "doc-values.json presets.<이름>";
  const presets = Object.entries(d.presets);
  for (const [n, p] of presets) {
    add(`preset.${n}.title`, p.title, `${P}.title`, "프리셋 이름");
    add(`preset.${n}.kind`, p.kind, `${P}.kind`, "분류(landing 랜딩페이지, app 앱 화면, clone 클론 튜토리얼)");
    const kindLabel = { landing: "랜딩페이지", app: "앱 화면", clone: "클론 튜토리얼" }[p.kind];
    add(`preset.${n}.kindLabel`, kindLabel, `계산: ${P}.kind`, "분류 이름(랜딩페이지, 앱 화면, 클론 튜토리얼)");
    for (const [f, desc] of [["field", "짧은 분야(README 대표 예시, 프로킷 사이트 카드)"], ["summary", "컨셉 한 줄(tutorials/samples/README.md 표)"], ["difficulty", "실제 서비스로 바꾸는 난이도(tutorials/samples/README.md 표)"], ["dailyLimit", "실제 AI 답의 하루 한도(서비스 전체, 번). 근거는 프리셋 팩 features.md \"5.2 하루 한도\"(팩 저장소의 claudle 팩, 원본 ../pro-kit-samples/packs/claudle)라 팩을 바꾸면 함께 바꾼다"]])
      if (p[f]) add(`preset.${n}.${f}`, p[f], `${P}.${f}`, desc);
    if (p.pages) {
      add(`preset.${n}.pages`, p.pages, `${P}.pages`, "페이지 수");
      add(`preset.${n}.pages.rest`, Number(p.pages) - 1, `계산: ${P}.pages − 1`, "첫 화면을 뺀 나머지 페이지 수");
    }
    if (p.pageTypes) {
      add(`preset.${n}.pageTypes`, p.pageTypes, `${P}.pageTypes`, "같은 틀을 하나로 센 페이지 종류 수");
      add(`preset.${n}.pageTypes.rest`, Number(p.pageTypes) - 1, `계산: ${P}.pageTypes − 1`, "첫 화면을 뺀 나머지 페이지 종류 수");
    }
    const g = p.design;
    if (g) {
      const D = `${P}.design`;
      (g.recs ?? []).forEach((r, i) => {
        add(`preset.${n}.design.rec${i + 1}`, r.name, `${D}.recs`, `스타일 추천 ${i + 1}위 이름`);
        add(`preset.${n}.design.src${i + 1}`, d.catalogs[r.src].name, `${D}.recs + catalogs.<이름>.name`, `스타일 추천 ${i + 1}위의 카탈로그 이름`);
      });
      for (const [f, desc] of [["comp", "고른 시안 글자"], ["compName", "고른 시안 이름"], ["color", "대표 색 이름"], ["hex", "대표 색 값"], ["images", "AI로 그린 그림 수(장)"], ["clicks", "링크·버튼 눌러 본 횟수"], ["critique", "디자인 리뷰(critique) 최종 점수(40점 만점)"]])
        if (g[f]) add(`preset.${n}.design.${f}`, g[f], `${D}.${f}`, desc);
      if (g.hex) add(`preset.${n}.design.hexCode`, `\`${g.hex}\``, `${D}.hex`, "대표 색 값의 코드 꼴(백틱 포함)");
    }
    // 단계별 표에서 쪽 수·그림 수에 비례하는 행: 나머지 페이지는 쪽(올곧은 종)당 cost.stage.page × 나머지 수, 그림은 장수 × cost.image.time을 분으로 올림
    const rest = p.pageTypes ? Number(p.pageTypes) - 1 : Number(p.pages) - 1;
    if (p.kind !== "clone") for (const r of ["pack", "scratch"]) add(`preset.${n}.stages.rest.${r}.time`, minText(rest * minutes(C.stage.page[r])), `계산: doc-values.json cost.stage.page.${r} × ${P}.page${p.pageTypes ? "Types" : "s"} − 1`, `단계별 표: 나머지 페이지(${runLabel[r]})`);
    if (g?.images) add(`preset.${n}.stages.images.time`, `${Math.ceil((Number(g.images) * seconds(C.image.time)) / 60)}분`, `계산: ${P}.design.images × cost.image.time`, "단계별 표: 그림(처음부터). 장수 × 장당 시간을 분으로 올림");
    if (p.stages?.check) add(`preset.${n}.stages.check.time`, p.stages.check, `${P}.stages.check`, "단계별 표: 검사와 디자인 리뷰(두 열 같음). 쪽 수에 따라 늘지만 단위값으로 나눠 떨어지지 않아 프리셋마다 적는다");
    for (const [ch, t] of Object.entries(p.chapters ?? {})) add(`preset.${n}.chapter.${ch}.time`, t, `${P}.chapters.<장>`, "클론 README 단계별 표: 과정마다 다른 장의 최소 시간(두 과정이 같은 장은 cost.stage.*)");
    // 만든 사람이 실제로 쓴 값(실측). key 아래에 time·min(분 수)·usd·tokens·cached를 둔다. 토큰과 캐시 포함은 달러에서 계산한다
    const spent = (key, time, usd, src, what) => {
      if (time) {
        add(`${key}.time`, time, src, what);
        add(`${key}.min`, minutes(time), `계산: ${src}`, "같은 시간의 분 수(도식의 막대 길이, 합 계산)");
      }
      if (!usd) return;
      add(`${key}.usd`, usd, src, "만든 사람이 실제로 쓴 값의 API 요금 환산(달러)");
      add(`${key}.tokens`, fmtMan(Number(usd) * man(C.tokensPerUsd)), `계산: ${src}.usd × cost.tokensPerUsd`, "만든 사람이 실제로 쓴 토큰(캐시 뺀 값)");
      add(`${key}.cached`, fmtMan(Number(usd) * man(C.cachedPerUsd)), `계산: ${src}.usd × cost.cachedPerUsd`, "만든 사람이 실제로 쓴 토큰(캐시 포함)");
    };
    // 행의 합: [시간("N시간 M분"), 달러]
    const total = (rows) => [minText(rows.reduce((s, o) => s + minutes(o.time), 0)), String(rows.reduce((s, o) => s + Number(o.usd), 0))];
    // 합계(total)가 없고 행마다 달러가 있으면 행을 더한다(Claudle)
    const A = p.actual ?? {};
    const actualDesc = "만든 사람이 실제로 쓴 값. <행>은 total(합계)·redesign(첫 화면 리디자인)·build(Nextflix 2\\~4장)·plan(2\\~3장)·fix·expand·screens·review·polish. tokens·cached는 usd × cost.tokensPerUsd·cachedPerUsd로 계산한 값";
    for (const [row, o] of Object.entries(A)) spent(`preset.${n}.actual.${row}`, o.time, o.usd, `${P}.actual.${row}`, actualDesc);
    const rows = Object.values(A);
    if (rows.length > 1 && !A.total && rows.every((o) => o.usd)) spent(`preset.${n}.actual.total`, ...total(rows), `계산: ${P}.actual 행의 합`, actualDesc);
    // 원래 서비스 조사와 프리셋 팩 만들기(prep)와 팩 다듬기(packFix). 기록에서 잰 시간과 토큰(캐시 뺌·포함)이 정본이고, 달러는 토큰 ÷ cost.tokensPerUsd로 어림한다(만들기 행과 반대 방향).
    // prep 합(prep.total)이 팩으로 시작하면 줄어드는 시간이다. 조사부터 만들기까지(all)는 벽시계끼리 더한다: 만들기(made: actual 행 이름 목록의 합, 없으면 actual.total) + prep.total.
    // 팩 다듬기는 에이전트 시간의 합이라 all에 넣지 않는다
    const logged = (key, rows, src, what) => {
      const m = rows.reduce((s, o) => s + minutes(o.time), 0);
      add(`${key}.time`, rows.length > 1 ? timeText(m) : rows[0].time, src, what);
      add(`${key}.min`, m, `계산: ${src}`, "같은 시간의 분 수(도식의 막대 길이, 합 계산)");
      add(`${key}.tokens`, fmtMan(rows.reduce((s, o) => s + man(o.tokens), 0)), src, "기록에서 잰 토큰(캐시 뺀 값)");
      add(`${key}.cached`, fmtMan(rows.reduce((s, o) => s + man(o.cached), 0)), src, "기록에서 잰 토큰(캐시 포함)");
      add(`${key}.usd`, rows.reduce((s, o) => s + Math.round(man(o.tokens) / man(C.tokensPerUsd)), 0), `계산: ${src}.tokens ÷ cost.tokensPerUsd(행마다 반올림해 더한다)`, "기록 토큰을 달러로 어림한 API 요금 환산");
    };
    if (p.prep) {
      const prep = Object.values(p.prep);
      for (const [row, o] of Object.entries(p.prep)) logged(`preset.${n}.prep.${row}`, [o], `${P}.prep.${row}`, "원래 서비스 조사와 프리셋 팩 만들기의 실측(기록). <행>은 research(조사와 분석, 요청부터 리서치 끝까지 벽시계)·expand(올곧 범위 넓히기 조사)·plan(기획)·pack(팩 만들기. Claudle은 설계 포함)");
      logged(`preset.${n}.prep.total`, prep, `계산: ${P}.prep 행의 합`, "조사와 팩 만들기의 합(5분 단위). 프리셋 팩으로 시작하면 줄어드는 시간");
      if (p.packFix) logged(`preset.${n}.packFix`, [p.packFix], `${P}.packFix`, "만들기 라운드에서 찾은 점을 프리셋 팩에 되먹인 시간(에이전트 시간 합이라 벽시계 합 all에 넣지 않는다)");
      const made = (p.made ?? ["total"]).map((r) => ({ time: need(`preset.${n}.actual.${r}.time`), usd: need(`preset.${n}.actual.${r}.usd`) }));
      if (p.made) spent(`preset.${n}.made`, timeText(made.reduce((s, o) => s + minutes(o.time), 0)), String(made.reduce((s, o) => s + Number(o.usd), 0)), `계산: ${P}.actual의 ${p.made.join("·")} 합`, "프리셋 만들기 합(Claude로 한 라운드만, 5분 단위)");
      const k = p.made ? `preset.${n}.made` : `preset.${n}.actual.total`;
      const madeMin = minutes(need(`${k}.time`));
      const madeUsd = Number(need(`${k}.usd`));
      const S = `계산: ${k} + ${P}.prep 합`;
      const prepMin = Number(need(`preset.${n}.prep.total.min`));
      add(`preset.${n}.all.time`, timeText(madeMin + prepMin), S, "조사부터 만들기까지 더한 시간(벽시계, 5분 단위. 팩 다듬기 뺌)");
      add(`preset.${n}.all.min`, madeMin + prepMin, S, "같은 시간의 분 수");
      add(`preset.${n}.all.usd`, madeUsd + Number(need(`preset.${n}.prep.total.usd`)), S, "조사부터 만들기까지 API 요금 환산(만들기 달러 + 조사와 팩의 어림 달러)");
      add(`preset.${n}.all.tokens`, fmtMan(madeUsd * man(C.tokensPerUsd) + prep.reduce((s, o) => s + man(o.tokens), 0)), S, "조사부터 만들기까지 토큰(캐시 뺌. 만들기는 달러에서 바꾼 값, 조사와 팩은 기록)");
      add(`preset.${n}.all.cached`, fmtMan(madeUsd * man(C.cachedPerUsd) + prep.reduce((s, o) => s + man(o.cached), 0)), S, "같은 합의 캐시 포함 토큰");
    }
    for (const run of Object.keys(runs)) {
      if (!p[run]) continue;
      for (const [f, v] of Object.entries(p[run])) add(`preset.${n}.${run}.${f}`, v, `${P}.${run}.${f}`, `${runs[run]} ${fields[f]}`);
      const k = limitN(p[run].tokens);
      const src = `계산: ${P}.${run}.tokens ÷ limits.pro5h.tokens`;
      add(`preset.${n}.${run}.limit`, k, src, `${runs[run]} Pro 5시간 한도에 걸리는 번 수`);
      add(`preset.${n}.${run}.limitText`, limitText(k), src, `${runs[run]} "가능 (…)" 괄호 안 글`);
      span(`preset.${n}.${run}.time`, p[run].time, p[run].time, `${P}.${run}.time`, runs[run]);
    }
  }
  const screen = presets.filter(([, p]) => p.kind !== "clone");
  add("presets.count", presets.length, "doc-values.json presets 수", "프리셋 수(클론 튜토리얼 포함)");
  add("presets.screen.count", screen.length, "doc-values.json presets 중 landing·app", "화면 프리셋 수");
  for (const [kind, label] of [["landing", "랜딩페이지"], ["app", "앱 화면"], ["clone", "클론 튜토리얼"]])
    add(`presets.${kind}.count`, presets.filter(([, p]) => p.kind === kind).length, `doc-values.json presets 중 ${kind}`, `${label} 프리셋 수`);
  // 페이지 종류를 따로 세는 프리셋(pageTypes가 있는 올곧)은 크기가 달라 뺀다
  const pages = screen.filter(([, p]) => !p.pageTypes).map(([, p]) => Number(p.pages));
  add("presets.screen.pages.range", `${Math.min(...pages)}\\~${Math.max(...pages)}`, "계산: doc-values.json 화면 프리셋 pages의 최소~최대(pageTypes가 있는 프리셋 제외)", "화면 프리셋 한 개의 페이지 수 범위");
  // 만든 사람이 실제로 쓴 값(리디자인과 넓히기)의 범위. 리디자인 없이 처음부터 만든 올곧(pageTypes가 있는 프리셋)은 뺀다
  const redesigned = screen.filter(([, p]) => !p.pageTypes).map(([n]) => n);
  for (const [f, num] of [["time", minutes], ["tokens", tokens], ["usd", Number]]) {
    const s = redesigned.map((n) => need(`preset.${n}.actual.total.${f}`)).sort((a, b) => num(a) - num(b));
    add(`presets.actual.${f}.range`, `${s[0]}\\~${s.at(-1)}`, "계산: preset.<이름>.actual.total의 최소~최대(올곧 제외)", "화면 프리셋을 만든 사람이 리디자인과 넓히기에 실제로 쓴 값의 범위(시간·토큰·달러)");
  }
  add("presets.screen.pages", screen.reduce((s, [, p]) => s + Number(p.pages), 0), "doc-values.json 화면 프리셋 pages 합", "화면 프리셋 페이지 수 합");
  // 여럿을 한 줄로 알리는 범위(가장 작은 것의 값부터 가장 큰 것의 값까지). 클론 튜토리얼(clones.full)도 같은 꼴이라 클론이 늘어도 글 길이는 그대로다
  const clones = presets.filter(([, p]) => p.kind === "clone" && p.full);
  for (const [g, list, run, who] of [["presets", screen, "pack", "화면 프리셋"], ["presets", screen, "scratch", "화면 프리셋"], ["clones", clones, "full", "클론 튜토리얼"]]) {
    for (const [f, num] of [["time", minutes], ["tokens", tokens], ["cached", tokens]]) {
      const s = [...list].sort((a, b) => num(a[1][run][f]) - num(b[1][run][f]));
      const [lo, hi] = [s[0], s.at(-1)];
      add(`${g}.${run}.${f}.range`, lo[1][run][f] === hi[1][run][f] ? lo[1][run][f] : `${lo[1][run][f]}\\~${hi[1][run][f]}`, `계산: doc-values.json presets(최소 ${lo[0]}, 최대 ${hi[0]})`, `${who}을 ${runs[run]} ${fields[f]} 범위`);
      if (f === "time") span(`${g}.${run}.time`, lo[1][run].time, hi[1][run].time, `doc-values.json presets(최소 ${lo[0]}, 최대 ${hi[0]})`, `${who} 하나를 ${runs[run]}. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지`);
    }
    const ns = list.map(([, p]) => limitN(p[run].tokens));
    const [a, b] = [Math.min(...ns), Math.max(...ns)];
    const range = a === b ? (a ? `약 ${a}번` : `${W} 한도 안`) : a ? `약 ${a}\\~${b}번` : `${W} 한도 안\\~약 ${b}번`;
    add(`${g}.${run}.limit.range`, range, `계산: doc-values.json ${who} 한도 번 수의 최소~최대`, `${who}을 ${runs[run]} Pro 5시간 한도 범위`);
  }

  // 1위로 고른 스타일의 카탈로그별 수(추천 없이 만든 프리셋은 센 데서 빠진다), 디자인 리뷰 점수 순
  const firsts = screen.filter(([, p]) => p.design?.recs);
  const byCat = Object.entries(d.catalogs).map(([id, c]) => [c.name, firsts.filter(([, p]) => p.design.recs[0].src === id).length]).filter(([, k]) => k).sort((a, b) => b[1] - a[1]);
  add("presets.design.first.summary", byCat.map(([name, k]) => `${name} ${k}개`).join(", "), "계산: doc-values.json 화면 프리셋 design.recs 1위의 카탈로그", "1위로 고른 스타일의 카탈로그별 수");
  add("presets.design.critique.list", screen.filter(([, p]) => p.design?.critique).sort((a, b) => b[1].design.critique - a[1].design.critique).map(([, p]) => `${p.title} ${p.design.critique}`).join(", "), "계산: doc-values.json 화면 프리셋 design.critique 내림차순", "디자인 리뷰 점수가 높은 순서(이름 점수)");
  add("packs.count", Object.keys(json("tutorials/packs.json")).length, "tutorials/packs.json 항목 수", "프리셋 팩 수");
  // 팩마다 받는 곳(릴리스 쪽). 팩 저장소가 둘(일반, 프리미엄)이라 이름으로 저장소를 고르지 않고 packs.json의 zip 주소에서 만든다
  for (const [name, p] of Object.entries(json("tutorials/packs.json"))) add(`pack.${name}.release`, p.url.replace(/\/releases\/download\/([^/]+)\/[^/]+$/, "/releases/tag/$1"), "tutorials/packs.json url → releases/tag", `${name} 프리셋 팩 릴리스 쪽 주소`);
  for (const [name, p] of Object.entries(json("tutorials/packs.json"))) {
    add(`pack.${name}.zip`, p.url, "tutorials/packs.json url", `${name} 프리셋 팩 zip 내려받기 주소`);
    add(`pack.${name}.size`, `${(p.bytes / 1048576).toFixed(1)}MB`, "tutorials/packs.json bytes(MB, 소수 한 자리)", `${name} 프리셋 팩 zip 크기`);
  }

  // 만드는 과정과 걸리는 시간(tutorials/reference/process-and-time.md). 정본은 프리셋을 만든 기록에서 잰 분(소수)이다. 칸은 분 단위로 반올림하고 합은 5분 단위로 쓴다
  const Q = d.process;
  const QS = "doc-values.json process";
  const near = (x) => minText(Math.round(x));
  const sum = (o, keys = Object.keys(o)) => keys.reduce((s, k) => s + o[k], 0);
  // 리서치 단계에 에이전트가 일한 시간. 둘러보기와 기능 정리는 동시에 돌아서, 합(total)은 벽시계가 아니라 에이전트 시간의 합이다. decide(내 답)는 합에 넣지 않는다
  for (const [who, steps] of Object.entries(Q.research)) {
    for (const [s, x] of Object.entries(steps)) add(`process.research.${who}.${s}`, near(x), `${QS}.research.${who}.${s}`, "리서치 단계에 에이전트가 일한 시간. <과정>은 claudle·nextflix, <단계>는 scope(범위)·first·more(Claudle 첫 조사·보강)·public·login(Nextflix 공개·로그인 화면)·features(기능과 규칙)·firstSummary·moreSummary·summary·verify(분석과 요약)·decide(내 답), analysis(분석과 요약 합)·total(decide를 뺀 합, 5분 단위)은 계산값");
    add(`process.research.${who}.total`, timeText(sum(steps) - (steps.decide ?? 0)), `계산: ${QS}.research.${who}의 합(decide 빼고)`, "리서치에 에이전트가 일한 시간의 합(5분 단위)");
  }
  const RC = Q.research.claudle;
  const RN = Q.research.nextflix;
  add("process.research.claudle.analysis", near(RC.firstSummary + RC.moreSummary), `계산: ${QS}.research.claudle.firstSummary + moreSummary`, "Claudle 분석과 요약(첫 요약과 보강 요약)");
  add("process.research.nextflix.analysis", near(RN.summary + RN.verify), `계산: ${QS}.research.nextflix.summary + verify`, "Nextflix 분석과 요약(검증 포함)");
  // 조사 범위별 어림: 공개 페이지 몇 개 = Nextflix 공개 페이지(시간은 process.research.nextflix.public을 그대로 쓴다), 로그인 화면까지 = Claudle 첫 조사와 요약, 거의 모든 화면 = Claudle 조사·보강과 요약부터 리서치 전체까지
  const scopeDesc = "조사 범위별 어림(에이전트가 일한 시간의 합, 5분 단위). <범위>는 login(로그인 화면까지)·all(웹의 거의 모든 화면). 공개 페이지 몇 개는 process.research.nextflix.public";
  add("process.scope.login.time", timeText(RC.first + RC.firstSummary), `계산: ${QS}.research.claudle.first + firstSummary`, scopeDesc);
  add("process.scope.all.time", `${timeText(sum(RC, ["first", "more", "firstSummary", "moreSummary"]))}\\~${vals.get("process.research.claudle.total").value}`, `계산: ${QS}.research.claudle(조사·보강과 요약 ~ 합)`, scopeDesc);
  for (const [k, t] of Object.entries(Q.scopeTokens))
    add(`process.scope.${k}.tokens`, k === "all" ? `${t}\\~${vals.get("preset.claudle.prep.research.tokens").value}` : t, `${QS}.scopeTokens.${k}${k === "all" ? " ~ preset.claudle.prep.research.tokens" : ""}`, "조사 범위 어림의 토큰(캐시 뺀 값. 실측 토큰을 반올림)");
  // 원그래프: 만들기 라운드에서 메인 에이전트가 무엇에 시간을 썼나(분). 조각 min은 반올림한 분, pct는 합에 대한 비율(%)
  for (const [who, parts] of Object.entries(Q.pie)) {
    const all = sum(parts);
    for (const [k, x] of Object.entries(parts)) {
      add(`process.pie.${who}.${k}.min`, Math.round(x), `${QS}.pie.${who}.${k}`, "원그래프 조각(분). <조각>은 recheck(모든 페이지 확인)·model(생각하고 쓰기)·review(리뷰·디자인 검사 에이전트)·impl(구현 에이전트를 기다림)·browser(브라우저 확인)·build(빌드·내보내기·타입·포맷)·other(기타)");
      add(`process.pie.${who}.${k}.pct`, Math.round((x / all) * 100), `계산: ${QS}.pie.${who}.${k} ÷ 합`, "원그래프 조각의 비율(%)");
    }
  }
  // 올곧 라운드: 마무리 검토·두 군데·한 줄 고치기는 고칠 때 예시 값(cost.revise)을 그대로 쓰고, 합은 그 값까지 더한다. wait는 R2에서 백그라운드 작업을 기다린 시간
  for (const [k, x] of Object.entries(Q.olgot)) add(`process.olgot.${k}`, near(x), `${QS}.olgot.${k}`, "올곧 라운드의 벽시계 시간. <라운드>는 plan(기획과 홈 시안)·expand(범위 넓히기)·first(1차 14쪽)·rest(나머지)·close(닫기)·wait(1차 라운드의 백그라운드 기다림)");
  const olgotWall = sum(Q.olgot) - Q.olgot.wait + [X.reviewRoundOlgot.total, X.twoSpotsOlgot.total, need("cost.revise.oneSpot")].reduce((s, t) => s + minutes(t), 0);
  add("process.olgot.total", timeText(olgotWall), `계산: ${QS}.olgot(wait 빼고) + cost.revise의 올곧 예시 셋`, "올곧 라운드 합(벽시계, 5분 단위). preset.olgot.actual.total.time과 같아야 한다");
  add("process.olgot.work", timeText(olgotWall - Q.olgot.wait), `계산: process.olgot.total − ${QS}.olgot.wait`, "올곧 라운드 합에서 백그라운드 기다림을 뺀 일한 시간(5분 단위)");

  const T = ["neon", "supabase"];
  const tpl = (t, ...p) => join(root, "templates", `prokit-next-${t}`, ...p);
  const same = (key, f, src, desc) => {
    const [a, b] = T.map(f);
    if (a !== b) throw new Error(`${key}: 두 템플릿이 다르다(${a}, ${b})`);
    add(key, a, src, desc);
  };
  add("templates.count", readdirSync(join(root, "templates")).filter((n) => n.startsWith("prokit-next-")).length, "templates/prokit-next-* 수", "템플릿 수");
  add("templates.count.ko", ko(vals.get("templates.count").value), "templates/prokit-next-* 수", "템플릿 수의 한글 수 관형사");
  same("prokit.skills.count", (t) => readdirSync(tpl(t, "files", ".agents", "skills")).filter((n) => n.startsWith("prokit-")).length, "templates/*/files/.agents/skills/prokit-* 수", "프로젝트 스킬(prokit-*) 수");
  add("prokit.skills.count.ko", ko(vals.get("prokit.skills.count").value), "templates/*/files/.agents/skills/prokit-* 수", "프로젝트 스킬 수의 한글 수 관형사");
  same("prokit.agents.count", (t) => readdirSync(tpl(t, "files", ".claude", "agents")).filter((n) => n.endsWith(".md")).length, "templates/*/files/.claude/agents/*.md 수", "구현·리뷰 에이전트 수");
  add("prokit.agents.count.ko", ko(vals.get("prokit.agents.count").value), "templates/*/files/.claude/agents/*.md 수", "구현·리뷰 에이전트 수의 한글 수 관형사");
  const cases = (t) => JSON.parse(readFileSync(tpl(t, "files", "scripts", "dev-cycle.mjs"), "utf8").match(/export const CASES = (\[[^\]]*\])/)[1]);
  same("devCycle.cases.count", (t) => cases(t).length, "templates/*/files/scripts/dev-cycle.mjs CASES", "dev-cycle 케이스 수");
  add("devCycle.cases.count.ko", ko(vals.get("devCycle.cases.count").value), "templates/*/files/scripts/dev-cycle.mjs CASES", "dev-cycle 케이스 수의 한글 수 관형사");
  same("devCycle.cases.list", (t) => cases(t).join(", "), "templates/*/files/scripts/dev-cycle.mjs CASES", "dev-cycle 케이스 목록");
  // 이어지는 글자는 A\~F처럼 묶고 구간 사이는 ·로 잇는다(G가 없다). ~가 한 항목에 둘이면 취소선이 되므로 \~
  const runsOf = (list) => {
    const out = [];
    for (const c of list) {
      const last = out.at(-1);
      if (last && last.at(-1).charCodeAt(0) + 1 === c.charCodeAt(0)) last.push(c);
      else out.push([c]);
    }
    return out;
  };
  same("devCycle.cases.range", (t) => runsOf(cases(t)).map((r) => (r.length > 1 ? `${r[0]}\\~${r.at(-1)}` : r[0])).join("·"), "templates/*/files/scripts/dev-cycle.mjs CASES", "dev-cycle 케이스를 이어지는 구간으로 묶은 글(A\\~F·H)");
  const ui = (t) => JSON.parse(readFileSync(tpl(t, "files", ".dev-cycle.json"), "utf8")).ui;
  same("devCycle.ui.auditMin", (t) => ui(t).auditMin, "templates/*/files/.dev-cycle.json ui.auditMin", "화면 작업 audit 점수 하한(20점 만점)");
  same("devCycle.ui.a11yMin", (t) => ui(t).a11yMin, "templates/*/files/.dev-cycle.json ui.a11yMin", "화면 작업 접근성 점수 하한(4점 만점)");
  const manifest = (t) => JSON.parse(readFileSync(tpl(t, "files", "skills.manifest.json"), "utf8")).skills;
  const count = (list) => list.reduce((n, s) => n + s.skills.length, 0);
  for (const t of T)
    add(`skills.official.${t}`, count(manifest(t).filter((s) => s.agents.includes("claude-code"))), `templates/prokit-next-${t}/files/skills.manifest.json`, `${t} 템플릿 공식 스킬 수(Claude Code와 Codex에 함께 설치)`);
  same("skills.codex.superpowers", (t) => count(manifest(t).filter((s) => s.source === "obra/superpowers")), "templates/*/files/skills.manifest.json obra/superpowers", "Codex에 설치하는 superpowers 스킬 수");

  // 전역 CLI 설치 명령: manifest의 global 항목(name → install)이 정본이다. 두 템플릿에 모두 있으면 같아야 한다
  const globalInstall = (t, name) => JSON.parse(readFileSync(tpl(t, "files", "skills.manifest.json"), "utf8")).global.find((g) => g.name === name)?.install;
  for (const [id, name] of [["neon", "Neon CLI"], ["vercel", "Vercel CLI"], ["omx", "OMX CLI"]]) {
    const cmds = [...new Set(T.map((t) => globalInstall(t, name)).filter(Boolean))];
    if (cmds.length !== 1) throw new Error(`cli.${id}.install: 두 템플릿 manifest의 ${name} install이 없거나 다르다(${cmds})`);
    add(`cli.${id}.install`, cmds[0], `templates/*/files/skills.manifest.json global ${name}`, "전역 CLI 설치 명령");
    add(`cli.${id}.installCode`, `\`${cmds[0]}\``, `templates/*/files/skills.manifest.json global ${name}`, "같은 명령의 코드 꼴(백틱 포함)");
  }

  // 선택 스킬 묶음(skills.manifest.json optional). 묶음 이름은 두 템플릿이 같고 ops의 스킬만 다르다
  const optional = (t) => JSON.parse(readFileSync(tpl(t, "files", "skills.manifest.json"), "utf8")).optional;
  const bundleSkills = (t, b) => optional(t)[b].skills.flatMap((s) => s.skills);
  const code = (list) => list.map((s) => `\`${s}\``).join(", ");
  same("optional.names", (t) => Object.keys(optional(t)).join(", "), "templates/*/files/skills.manifest.json optional", "선택 스킬 묶음 이름");
  same("optional.namesCode", (t) => code(Object.keys(optional(t))), "templates/*/files/skills.manifest.json optional", "선택 스킬 묶음 이름의 코드 꼴(묶음마다 백틱)");
  same("optional.count", (t) => Object.keys(optional(t)).length, "templates/*/files/skills.manifest.json optional", "선택 스킬 묶음 수");
  add("optional.count.ko", ko(vals.get("optional.count").value), "templates/*/files/skills.manifest.json optional", "선택 스킬 묶음 수의 한글 수 관형사");
  for (const b of Object.keys(optional("neon"))) {
    for (const t of T) {
      add(`optional.${b}.skillsCode.${t}`, code(bundleSkills(t, b)), `templates/prokit-next-${t}/files/skills.manifest.json optional.${b}`, `${t} 템플릿 ${b} 묶음의 스킬(스킬마다 백틱)`);
      add(`optional.${b}.count.${t}`, bundleSkills(t, b).length, `templates/prokit-next-${t}/files/skills.manifest.json optional.${b}`, `${t} 템플릿 ${b} 묶음의 스킬 수`);
    }
    const shared = bundleSkills("neon", b).filter((s) => T.every((t) => bundleSkills(t, b).includes(s)));
    add(`optional.${b}.skillsCode.shared`, code(shared), `templates/*/files/skills.manifest.json optional.${b}`, `${b} 묶음에서 두 템플릿이 함께 가진 스킬(스킬마다 백틱)`);
    for (const t of T) {
      const only = bundleSkills(t, b).filter((s) => !shared.includes(s));
      if (only.length) add(`optional.${b}.skillsCode.${t}Only`, code(only), `templates/prokit-next-${t}/files/skills.manifest.json optional.${b}`, `${b} 묶음에서 ${t} 템플릿만 가진 스킬(스킬마다 백틱)`);
    }
    if (T.every((t) => code(bundleSkills(t, b)) === code(bundleSkills("neon", b)))) add(`optional.${b}.skillsCode`, code(bundleSkills("neon", b)), `templates/*/files/skills.manifest.json optional.${b}`, `${b} 묶음의 스킬(두 템플릿이 같을 때. 스킬마다 백틱)`);
  }

  // 같은 요청을 스킬이 있을 때와 없을 때로 나눠 채점한 비율과 DESIGN.md 효과. 정본은 그 값을 잰 기록(neon VERIFICATION.md)이다. %는 값 밖에 쓴다
  const ver = readFileSync(tpl("neon", "VERIFICATION.md"), "utf8");
  const evalAt = ver.indexOf("## 스킬 동작 eval");
  const evalRows = [...ver.slice(evalAt, ver.indexOf("\n## ", evalAt + 1)).matchAll(/^\| bts-([\w-]+) \| (\d+) \((\d+)\) \| \d+ \| (\d+)% \| (\d+)% \|$/gm)];
  if (evalAt < 0 || !evalRows.length) throw new Error("eval.*: neon VERIFICATION.md의 '스킬 동작 eval' 표를 읽지 못했다");
  const ES = "templates/prokit-next-neon/VERIFICATION.md 스킬 동작 eval 표";
  for (const [, skill, , , withSkill, without] of evalRows) {
    add(`eval.${skill}.with`, withSkill, ES, "같은 요청 비교: prokit-<스킬> 스킬이 있을 때 체크 항목을 지킨 비율(%는 값 밖)");
    add(`eval.${skill}.without`, without, ES, "같은 요청 비교: prokit-<스킬> 스킬이 없을 때 체크 항목을 지킨 비율(%는 값 밖)");
  }
  add("eval.requests", evalRows.reduce((n, r) => n + Number(r[2]), 0), `계산: ${ES}의 eval 수 합`, "같은 요청 비교에 쓴 요청 수");
  add("eval.checks", evalRows.reduce((n, r) => n + Number(r[3]), 0), `계산: ${ES}의 assertion 수 합`, "같은 요청 비교의 체크 항목 수");
  const dmAt = ver.indexOf("## DESIGN.md 효과 측정");
  const dm = dmAt < 0 ? "" : ver.slice(dmAt, ver.indexOf("\n## ", dmAt + 1));
  // 결과 표의 % 두 칸(A: DESIGN.md 있음, B: 브랜드 이름·대표 색만)을 지표 이름으로 읽는다
  const ab = (label) => {
    const m = dm.match(new RegExp(`^\\| ${label}[^|]*\\| ([\\d.]+)% \\| ([\\d.]+)% \\|$`, "m"));
    if (!m) throw new Error(`eval.designMd: neon VERIFICATION.md 'DESIGN.md 효과 측정' 절의 '${label}' 행을 읽지 못했다`);
    return [Number(m[1]), Number(m[2])];
  };
  const picks = dm.match(/^### 추천과 선택\n((?:\|.*\n)+)/m);
  if (!picks) throw new Error("eval.designMd.services: neon VERIFICATION.md 'DESIGN.md 효과 측정' 절의 '추천과 선택' 표를 읽지 못했다");
  // 측정한 서비스 수: '추천과 선택' 표의 행(머리와 구분 줄 빼고). 서비스마다 한 행이다
  add("eval.designMd.services", picks[1].trim().split("\n").length - 2, "templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 '추천과 선택' 표의 행 수", "DESIGN.md 효과를 잰 서비스 수");
  const PS = "templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표";
  const abRow = { palette: "목표 팔레트 일치율", fontSize: "글자 크기 토큰 일치율", secondScreen: "두 번째 화면이 첫 화면 색을 따른 비율" };
  for (const [k, label] of Object.entries(abRow)) {
    const [a, b] = ab(label);
    add(`eval.designMd.${k}.with`, Math.round(a), `계산: ${PS}(반올림)`, `DESIGN.md가 있을 때 ${label}(%는 값 밖)`);
    add(`eval.designMd.${k}.without`, Math.round(b), `계산: ${PS}(반올림)`, `브랜드 이름과 대표 색만 줬을 때 ${label}(%는 값 밖)`);
  }
  add("eval.designMd.palette.offTarget", Math.round(100 - ab(abRow.palette)[1]), `계산: 100 − ${PS}의 B 팔레트 일치율(반올림)`, "브랜드 이름과 대표 색만 줬을 때 화면에 쓴 색 가운데 목표 밖 색의 비율(%는 값 밖)");

  const hb = (f) => readFileSync(join(root, "handbook", f), "utf8");
  const sections = tableLinks(hb("README.md"));
  add("handbook.sections.count", sections.length, "handbook/README.md 묶음 표", "문서(handbook) 묶음 수");
  add("handbook.pages.count", sections.reduce((n, s) => n + tableLinks(hb(s)).length, 0), "handbook 묶음 README의 쪽 표", "문서 쪽 수(묶음 소개 쪽 빼고)");
  return vals;
}

// 이름 → { desc, body }. 본문에 {{b:다른 이름}}을 쓰면 그 묶음 본문이 들어간다.
export function loadBlocks(root = ROOT) {
  const dir = join(root, "docs", "blocks");
  return new Map(
    readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const lines = readFileSync(join(dir, f), "utf8").replace(/\n$/, "").split("\n");
        const desc = lines[0].match(/^<!--\s*(.*?)\s*-->$/)?.[1];
        return [f.slice(0, -3), { desc: desc ?? "", body: (desc === undefined ? lines : lines.slice(1)).join("\n") }];
      }),
  );
}

// 글 하나의 표시를 채운다. issues의 { line, key, cur, want }에서 want가 없으면 채울 수 없는 표시다.
export function fill(text, vals, blocks, uses = new Map()) {
  const issues = [];
  const done = [];
  const lineAt = (i) => text.slice(0, i).split("\n").length;
  const use = (k) => uses.set(k, (uses.get(k) ?? 0) + 1);
  const out = text.replace(MARK, (m, ...rest) => {
    const at = rest.at(-3);
    const g = rest.at(-1);
    done.push([at, at + m.length]);
    if (g.key) {
      const v = vals.get(g.key);
      if (!v) return issues.push({ line: lineAt(at), key: g.key, cur: g.val }), m;
      use(g.key);
      if (g.val !== v.value) issues.push({ line: lineAt(at), key: g.key, cur: g.val, want: v.value });
      return `<!-- v:${g.key} -->${v.value}<!-- /v -->`;
    }
    const key = `b:${g.name}`;
    const block = blocks.get(g.name);
    if (!block) return issues.push({ line: lineAt(at), key, cur: "없는 묶음" }), m;
    use(key);
    const args = Object.fromEntries([...g.args.matchAll(/([\w-]+)=(?:"([^"]*)"|(\S+))/g)].map((a) => [a[1], a[2] ?? a[3]]));
    const missing = [];
    const unknown = [];
    const noBlock = [];
    // {{b:이름}}은 다른 묶음 원본을 그 자리에 펼친다(같은 인자를 쓴다)
    const expand = (s, depth = 0) =>
      s.replace(/\{\{b:([\w-]+)\}\}/g, (m0, k) => {
        if (!blocks.has(k) || depth > 4) return noBlock.push(k), m0;
        use(`b:${k}`);
        return expand(blocks.get(k).body, depth + 1);
      });
    const body = expand(block.body)
      .replace(/\{\{([\w-]+)(?:\|([^}]*))?\}\}/g, (s, k, def) => args[k] ?? def ?? (missing.push(k), s))
      .replace(/\{\{v:([\w.-]+)\}\}/g, (s, k) => (vals.has(k) ? (use(k), vals.get(k).value) : (unknown.push(k), s)));
    if (missing.length || unknown.length || noBlock.length)
      return issues.push({ line: lineAt(at), key, cur: [missing.length && `인자 없음: ${missing}`, unknown.length && `모르는 키: ${unknown}`, noBlock.length && `모르는 묶음: ${noBlock}`].filter(Boolean).join(", ") }), m;
    const want = `${body}\n`;
    if (g.body !== want) {
      const [a, b] = [g.body.split("\n"), want.split("\n")];
      let i = 0;
      while (a[i] === b[i]) i++;
      issues.push({ line: lineAt(at) + 1 + i, key, cur: a[i] ?? "(없음)", want: b[i] ?? "(없음)" });
    }
    return `${m.slice(0, m.indexOf("\n") + 1)}${want}<!-- /b -->`;
  });
  for (const x of text.matchAll(/<!-- v:[\w.-]+ -->|^<!-- b:[\w-]+/gm))
    if (!done.some(([s, e]) => x.index >= s && x.index < e)) issues.push({ line: lineAt(x.index), key: x[0].slice(5).replace(/ -->$/, ""), cur: "닫는 표시가 없거나 인자 꼴이 틀린 표시" });
  return { out, issues };
}

const cell = (s) => String(s).replace(/\|/g, "\\|");
function howTo(src) {
  if (src.startsWith("site-links.json")) return "`node scripts/site-links.mjs set <키> <주소>`";
  if (src.includes("doc-values.json")) return "`doc-values.json`을 고친다";
  if (src.startsWith("docs/blocks/")) return "묶음 원본을 고친다";
  return "정본 파일이 바뀌면 따라 바뀐다";
}

// 목록 표. 프리셋과 에이전트마다 있는 키는 <이름>으로 묶는다.
export function table(vals, blocks, uses) {
  const rows = new Map();
  for (const [key, v] of vals) {
    const group = key
      .replace(/^(preset|agent|catalogs|cli)\.[^.]+\./, "$1.<이름>.")
      .replace(/^(cost\.(?:tokens|cached))\.[\d.]+$/, "$1.<달러>")
      .replace(/^(preset\.<이름>\.chapter)\.\d+/, "$1.<장>")
      .replace(/^(preset\.<이름>\.actual)\.\w+\.\w+$/, "$1.<행>.<값>")
      .replace(/^(cost\.revise\.example)\.\w+\.\w+$/, "$1.<예>.<과정>")
      .replace(/^(cost\.revise\.flow)\.\w+\.\w+(\.min)?$/, "$1.<예>.<단계>$2")
      .replace(/^(preset\.<이름>\.prep)\.\w+\.\w+$/, "$1.<행>.<값>")
      .replace(/^(preset\.<이름>\.(?:packFix|made|all))\.\w+$/, "$1.<값>")
      .replace(/^(process\.research)\.\w+\.(?!total$)\w+$/, "$1.<과정>.<단계>")
      .replace(/^(process\.research)\.\w+\.total$/, "$1.<과정>.total")
      .replace(/^(process\.scope)\.\w+\.(time|tokens)$/, "$1.<범위>.$2")
      .replace(/^(process\.pie)\.\w+\.\w+\.(min|pct)$/, "$1.<과정>.<조각>.$2")
      .replace(/^(process\.olgot)\.(?!total$|work$)\w+$/, "$1.<라운드>")
      .replace(/^(eval)\.(?!designMd\.)[\w-]+\.(with|without)$/, "$1.<스킬>.$2");
    const row = rows.get(group) ?? { n: 0, uses: 0, value: v.value, desc: v.desc, src: v.src };
    row.n++;
    row.uses += uses.get(key) ?? 0;
    rows.set(group, row);
  }
  for (const [name, b] of blocks) rows.set(`b:${name}`, { n: 1, uses: uses.get(`b:${name}`) ?? 0, value: "(글 묶음)", desc: b.desc, src: `docs/blocks/${name}.md` });
  const lines = ["| 키 | 값 | 뜻 | 정본 | 바꾸는 법 | 쓰는 곳 |", "|---|---|---|---|---|---|"];
  for (const [key, r] of rows)
    lines.push(`| \`${key}\` | ${r.n > 1 ? `${r.n}개(\`--list\`)` : cell(r.value)} | ${cell(r.desc)} | ${cell(r.src)} | ${howTo(r.src)} | ${r.uses} |`);
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if ((mode && mode !== "--check" && mode !== "--list" && mode !== "--json") || (mode === "--json" && !process.argv[3])) {
    console.error("사용법: node scripts/doc-values.mjs [--check|--list|--json <파일>]");
    process.exit(1);
  }
  const vals = loadValues();
  if (mode === "--json") {
    const flat = Object.fromEntries([...vals].map(([k, v]) => [k, v.value.replaceAll("\\~", "~").replaceAll("\\|", "|")]));
    writeFileSync(process.argv[3], `${JSON.stringify(flat, null, "\t")}\n`);
    console.log(`값 ${vals.size}개 → ${process.argv[3]}`);
    process.exit(0);
  }
  const blocks = loadBlocks();
  const uses = new Map();
  const issues = [];
  const changed = [];
  for (const f of execFileSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" }).split("\n")) {
    if (!f || f === LIST || f.startsWith("release/") || f.startsWith("docs/superpowers/") || !existsSync(join(ROOT, f))) continue;
    const text = readFileSync(join(ROOT, f), "utf8");
    const r = fill(text, vals, blocks, uses);
    issues.push(...r.issues.map((i) => ({ file: f, ...i })));
    if (r.out !== text) changed.push([f, r.out]);
  }
  // 표시 없이 묶음 원본과 같은 글로 둔 곳(CASES)도 쓰는 곳으로 센다(품은 묶음과 {{v:키}} 포함). 표시 구간 안의 글은 위에서 셌다
  for (const [file, block, args] of CASES) {
    const outside = readFileSync(join(ROOT, file), "utf8").replace(MARK, (m) => (m.startsWith("<!-- b:") ? "" : m)).replace(/<!-- (?:v:[\w.-]+|\/v) -->/g, "");
    const one = new Map();
    const { out } = fill(`<!-- b:${block}${Object.entries(args).map(([k, v]) => ` ${k}="${v}"`).join("")} -->\n<!-- /b -->\n`, vals, blocks, one);
    if (!outside.includes(out.slice(out.indexOf("\n") + 1, -"<!-- /b -->\n".length))) continue;
    for (const [k, n] of one) uses.set(k, (uses.get(k) ?? 0) + n);
  }
  const list = readFileSync(join(ROOT, LIST), "utf8");
  if (!LIST_RX.test(list)) issues.push({ file: LIST, line: 1, key: "doc-values:list", cur: "목록 표 자리 표시가 없다" });
  const listOut = list.replace(LIST_RX, (m, a, b) => a + table(vals, blocks, uses) + b);
  if (listOut !== list) {
    issues.push({ file: LIST, line: list.slice(0, list.indexOf("<!-- doc-values:list -->")).split("\n").length, key: "doc-values:list", cur: "옛 표", want: "다시 만든 표" });
    changed.push([LIST, listOut]);
  }

  if (mode === "--list") {
    for (const [k, v] of vals) console.log([k, v.value, v.src, uses.get(k) ?? 0].join("\t"));
    for (const [name] of blocks) console.log([`b:${name}`, "(글 묶음)", `docs/blocks/${name}.md`, uses.get(`b:${name}`) ?? 0].join("\t"));
    process.exit(0);
  }
  const errors = issues.filter((i) => i.want === undefined);
  const show = (i) => `${i.file}:${i.line}  ${i.key}  ${i.want === undefined ? `채울 수 없음: ${i.cur}` : `지금 ${JSON.stringify(i.cur)} → 정본 ${JSON.stringify(i.want)}`}`;
  if (mode === "--check") {
    for (const i of issues) console.log(show(i));
    if (issues.length) {
      console.log(`어긋난 곳 ${issues.length}개. node scripts/doc-values.mjs로 채운다(모르는 키는 정본에 더하거나 표시를 고친다)`);
      process.exit(1);
    }
    console.log("문서 값과 묶음이 정본과 같다");
  } else if (errors.length) {
    for (const i of errors) console.error(show(i));
    console.error("채울 수 없는 표시가 있어 아무 파일도 바꾸지 않았다");
    process.exit(1);
  } else {
    for (const [f, s] of changed) writeFileSync(join(ROOT, f), s);
    for (const f of new Set(issues.map((i) => i.file))) console.log(`채움 ${f}`);
    if (!changed.length) console.log("바꿀 곳 없음");
  }
}
