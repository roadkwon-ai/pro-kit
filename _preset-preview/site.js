// 사이트 주소와 원본 위치의 정본. 다른 파일에 주소 글자를 복사하지 않고 여기서 읽는다.
// 순수 상수만 둔다(import, `@/` 별칭, env 없음). check 스크립트와 scripts/*.mjs가 Node type stripping으로 바로 import한다.
// pro-kit 원본 site-links.json(home, pages, repo, packs, premiumPacks)과 같아야 한다(tutorials:check가 대조한다).
// 홈페이지(Vercel). 두 사본(Vercel, GitHub Pages 루트) 모두 canonical·og 주소의 바탕은 production이다.
export const SITE_URLS = {
    production: "https://prokit-web.vercel.app",
    productionAlias: "https://prokit.highvalue.kr",
    preview: "https://dev-prokit.highvalue.kr",
};
// 프리셋 사이트(GitHub Pages). 프리셋은 `${PAGES_URL}/<이름>/`, 루트는 홈페이지 사본(pnpm pages:export).
export const PAGES_URL = "https://roadkwon-ai.github.io/pro-kit";
// Pages 사본의 basePath(/pro-kit). 이 값 하나에서 얻는다.
export const PAGES_BASE = new URL(PAGES_URL).pathname;
export const REPO = "roadkwon-ai/pro-kit";
export const GITHUB_URL = `https://github.com/${REPO}`;
// 프리셋 팩 저장소: 일반 팩과 프리미엄 팩(R7). 어느 팩이 어느 저장소인지는 원본 packs.json이 정하고 lib/pack-download.ts가 읽는다.
export const PACKS_URL = "https://github.com/roadkwon-ai/pro-kit-packs";
export const PREMIUM_PACKS_URL = "https://github.com/roadkwon-ai/pro-kit-premium-packs";
// pro-kit 저장소 위치(이 저장소 루트 기준). 튜토리얼·문서·릴리스 노트 sync의 원본이다.
export const PROKIT_DIR = "../pro-kit";
