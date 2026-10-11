export const defaultDesignOptions = {
    bodyFont: "original",
    headingFont: "original",
    palette: "original",
    theme: "system",
    locale: "ko",
};
export const designFonts = [
    {
        id: "original",
        name: "원래 서체",
        role: "프리셋의 원래 조합",
        family: "var(--font-pretendard, sans-serif)",
    },
    {
        id: "Pretendard",
        name: "Pretendard",
        role: "범용 본문·한국어 기준",
        family: '"Preset Pretendard", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/pretendard-variable.ttf",
        weight: "45 920",
        files: [
            {
                source: "/fonts/preset-design/pretendard-variable.ttf",
                weight: "45 920",
            },
        ],
        specimen: "/fonts/preset-design/specimens/pretendard-v2.png",
    },
    {
        id: "SUIT",
        name: "SUIT",
        role: "본문·정보 화면",
        family: '"Preset SUIT", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/suit-variable.woff2",
        weight: "100 900",
        files: [
            { source: "/fonts/preset-design/suit-variable.woff2", weight: "100 900" },
        ],
        specimen: "/fonts/preset-design/specimens/suit-v2.png",
    },
    {
        id: "SUITE",
        name: "SUITE",
        role: "기하학적 제목",
        family: '"Preset SUITE", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/suite-variable.woff2",
        weight: "300 900",
        files: [
            {
                source: "/fonts/preset-design/suite-variable.woff2",
                weight: "300 900",
            },
        ],
        specimen: "/fonts/preset-design/specimens/suite-v2.png",
    },
    {
        id: "Wanted Sans",
        name: "Wanted Sans",
        role: "스타트업 본문·제목",
        family: '"Preset Wanted Sans", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/wanted-sans-variable.woff2",
        weight: "400 1000",
        files: [
            {
                source: "/fonts/preset-design/wanted-sans-variable.woff2",
                weight: "400 1000",
            },
        ],
        specimen: "/fonts/preset-design/specimens/wanted-sans-v2.png",
    },
    {
        id: "Gmarket Sans",
        name: "Gmarket Sans",
        role: "커머스 제목",
        family: '"Preset Gmarket Sans", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/gmarket-sans-medium.woff2",
        weight: "500",
        files: [
            {
                source: "/fonts/preset-design/gmarket-sans-medium.woff2",
                weight: "500",
            },
        ],
        specimen: "/fonts/preset-design/specimens/gmarket-sans-v2.png",
    },
    {
        id: "MaruBuri",
        name: "MaruBuri",
        role: "매거진·긴 글",
        family: '"Preset MaruBuri", var(--font-pretendard, serif)',
        source: "/fonts/preset-design/maru-buri-regular.woff2",
        weight: "400",
        files: [
            { source: "/fonts/preset-design/maru-buri-regular.woff2", weight: "400" },
        ],
        specimen: "/fonts/preset-design/specimens/maru-buri-v2.png",
    },
    {
        id: "LINE Seed KR",
        name: "LINE Seed KR",
        role: "친근한 브랜드",
        family: '"Preset LINE Seed KR", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/line-seed-kr-regular.woff2",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/line-seed-kr-regular.woff2",
                weight: "400",
            },
        ],
        specimen: "/fonts/preset-design/specimens/line-seed-kr-v2.png",
    },
    {
        id: "nanum-square-neo",
        name: "나눔스퀘어 네오",
        role: "단정한 제목·본문",
        family: '"Preset Nanum Square Neo", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/nanum-square-neo-regular.ttf",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/nanum-square-neo-regular.ttf",
                weight: "400",
            },
            {
                source: "/fonts/preset-design/nanum-square-neo-bold.ttf",
                weight: "700",
            },
        ],
        specimen: "/fonts/preset-design/specimens/nanum-square-neo-v2.png",
    },
    {
        id: "noto-sans-kr",
        name: "Noto Sans KR",
        role: "읽기 쉬운 본문",
        family: '"Preset Noto Sans KR", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/noto-sans-kr-variable.ttf",
        weight: "100 900",
        files: [
            {
                source: "/fonts/preset-design/noto-sans-kr-variable.ttf",
                weight: "100 900",
            },
        ],
        specimen: "/fonts/preset-design/specimens/noto-sans-kr-v2.png",
    },
    {
        id: "ibm-plex-sans-kr",
        name: "IBM Plex Sans KR",
        role: "정보 밀도 높은 화면",
        family: '"Preset IBM Plex Sans KR", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/ibm-plex-sans-kr-regular.woff2",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/ibm-plex-sans-kr-regular.woff2",
                weight: "400",
            },
            {
                source: "/fonts/preset-design/ibm-plex-sans-kr-bold.woff2",
                weight: "700",
            },
        ],
        specimen: "/fonts/preset-design/specimens/ibm-plex-sans-kr-v2.png",
    },
    {
        id: "spoqa-han-sans-neo",
        name: "스포카 한 산스 네오",
        role: "서비스 본문",
        family: '"Preset Spoqa Han Sans Neo", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/spoqa-han-sans-neo-regular.woff2",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/spoqa-han-sans-neo-regular.woff2",
                weight: "400",
            },
            {
                source: "/fonts/preset-design/spoqa-han-sans-neo-bold.woff2",
                weight: "700",
            },
        ],
        specimen: "/fonts/preset-design/specimens/spoqa-han-sans-neo-v2.png",
    },
    {
        id: "s-core-dream",
        name: "에스코어 드림",
        role: "선명한 제목",
        family: '"Preset S-Core Dream", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/s-core-dream-regular.otf",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/s-core-dream-regular.otf",
                weight: "400",
            },
            { source: "/fonts/preset-design/s-core-dream-bold.otf", weight: "700" },
        ],
        specimen: "/fonts/preset-design/specimens/s-core-dream-v2.png",
    },
    {
        id: "cafe24-ssurround",
        name: "카페24 써라운드",
        role: "강한 프로모션 제목",
        family: '"Preset Cafe24 Ssurround", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/cafe24-ssurround.woff2",
        weight: "700",
        files: [
            { source: "/fonts/preset-design/cafe24-ssurround.woff2", weight: "700" },
        ],
        specimen: "/fonts/preset-design/specimens/cafe24-ssurround-v2.png",
    },
    {
        id: "bm-hanna-pro",
        name: "배민 한나체 Pro",
        role: "개성 있는 제목",
        family: '"Preset BM Hanna Pro", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/bm-hanna-pro.otf",
        weight: "400",
        files: [{ source: "/fonts/preset-design/bm-hanna-pro.otf", weight: "400" }],
        specimen: "/fonts/preset-design/specimens/bm-hanna-pro-v2.png",
    },
    {
        id: "bm-dohyeon",
        name: "배민 도현체",
        role: "굵은 간판형 제목",
        family: '"Preset BM DoHyeon", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/bm-dohyeon.otf",
        weight: "400",
        files: [{ source: "/fonts/preset-design/bm-dohyeon.otf", weight: "400" }],
        specimen: "/fonts/preset-design/specimens/bm-dohyeon-v2.png",
    },
    {
        id: "jalnan",
        name: "여기어때 잘난체",
        role: "활기찬 제목",
        family: '"Preset Jalnan", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/jalnan.otf",
        weight: "400",
        files: [{ source: "/fonts/preset-design/jalnan.otf", weight: "400" }],
        specimen: "/fonts/preset-design/specimens/jalnan-v2.png",
    },
    {
        id: "gowun-dodum",
        name: "고운돋움",
        role: "부드러운 본문",
        family: '"Preset Gowun Dodum", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/gowun-dodum-regular.ttf",
        weight: "400",
        files: [
            { source: "/fonts/preset-design/gowun-dodum-regular.ttf", weight: "400" },
        ],
        specimen: "/fonts/preset-design/specimens/gowun-dodum-v2.png",
    },
    {
        id: "gowun-batang",
        name: "고운바탕",
        role: "차분한 매거진 제목",
        family: '"Preset Gowun Batang", var(--font-pretendard, serif)',
        source: "/fonts/preset-design/gowun-batang-regular.ttf",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/gowun-batang-regular.ttf",
                weight: "400",
            },
            { source: "/fonts/preset-design/gowun-batang-bold.ttf", weight: "700" },
        ],
        specimen: "/fonts/preset-design/specimens/gowun-batang-v2.png",
    },
    {
        id: "nanum-barun-gothic",
        name: "나눔바른고딕",
        role: "안정적인 본문",
        family: '"Preset Nanum Barun Gothic", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/nanum-barun-gothic-regular.ttf",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/nanum-barun-gothic-regular.ttf",
                weight: "400",
            },
            {
                source: "/fonts/preset-design/nanum-barun-gothic-bold.ttf",
                weight: "700",
            },
        ],
        specimen: "/fonts/preset-design/specimens/nanum-barun-gothic-v2.png",
    },
    {
        id: "source-han-sans",
        name: "본고딕 Source Han Sans",
        role: "고밀도 한국어 본문",
        family: '"Preset Source Han Sans", var(--font-pretendard, sans-serif)',
        source: "/fonts/preset-design/source-han-sans-kr-regular.otf",
        weight: "400",
        files: [
            {
                source: "/fonts/preset-design/source-han-sans-kr-regular.otf",
                weight: "400",
            },
            {
                source: "/fonts/preset-design/source-han-sans-kr-bold.otf",
                weight: "700",
            },
        ],
        specimen: "/fonts/preset-design/specimens/source-han-sans-v2.png",
    },
];
export const designPalettes = [
    {
        id: "original",
        name: "원래 색상",
        light: {},
        dark: {},
    },
    {
        id: "ocean",
        name: "청록",
        light: {
            background: "#f7fbff",
            surface: "#ffffff",
            text: "#102a43",
            muted: "#52708a",
            accent: "#0b7285",
            accentText: "#ffffff",
            border: "#cbd5e1",
        },
        dark: {
            background: "#081a2b",
            surface: "#102a43",
            text: "#f0f7ff",
            muted: "#a8c4dd",
            accent: "#4fd1c5",
            accentText: "#062331",
            border: "#274c6b",
        },
    },
    {
        id: "forest",
        name: "숲빛",
        light: {
            background: "#f7faf7",
            surface: "#ffffff",
            text: "#1c2b21",
            muted: "#5f7264",
            accent: "#277a52",
            accentText: "#ffffff",
            border: "#cddbd1",
        },
        dark: {
            background: "#10251a",
            surface: "#1d3827",
            text: "#edf9f0",
            muted: "#b5d1bc",
            accent: "#7bd89c",
            accentText: "#10251a",
            border: "#355d43",
        },
    },
    {
        id: "plum",
        name: "자두빛",
        light: {
            background: "#fcf8ff",
            surface: "#ffffff",
            text: "#301b3f",
            muted: "#735c80",
            accent: "#7e3f98",
            accentText: "#ffffff",
            border: "#decfe7",
        },
        dark: {
            background: "#24142e",
            surface: "#382147",
            text: "#fbf4ff",
            muted: "#d7bddf",
            accent: "#e0aaff",
            accentText: "#32163f",
            border: "#654576",
        },
    },
    {
        id: "sand",
        name: "모래빛",
        light: {
            background: "#fffaf3",
            surface: "#ffffff",
            text: "#35291d",
            muted: "#756451",
            accent: "#a95727",
            accentText: "#ffffff",
            border: "#e1d4c5",
        },
        dark: {
            background: "#2d2117",
            surface: "#443323",
            text: "#fff8ef",
            muted: "#ddc9b4",
            accent: "#f1a15d",
            accentText: "#382315",
            border: "#6d5139",
        },
    },
    {
        id: "slate",
        name: "회청색",
        light: {
            background: "#f8fafc",
            surface: "#ffffff",
            text: "#172033",
            muted: "#64748b",
            accent: "#475569",
            accentText: "#ffffff",
            border: "#cbd5e1",
        },
        dark: {
            background: "#111827",
            surface: "#1f2937",
            text: "#f8fafc",
            muted: "#cbd5e1",
            accent: "#94a3b8",
            accentText: "#172033",
            border: "#475569",
        },
    },
    {
        id: "crimson",
        name: "진홍",
        light: {
            background: "#fff7f7",
            surface: "#ffffff",
            text: "#431313",
            muted: "#7a3030",
            accent: "#b42318",
            accentText: "#ffffff",
            border: "#efc8c6",
        },
        dark: {
            background: "#2a0f0f",
            surface: "#441818",
            text: "#fff5f5",
            muted: "#f0b4b0",
            accent: "#ff9b8f",
            accentText: "#3b0b08",
            border: "#713131",
        },
    },
    {
        id: "rose",
        name: "장미빛",
        light: {
            background: "#fff7fb",
            surface: "#ffffff",
            text: "#4a1730",
            muted: "#7a3555",
            accent: "#b42360",
            accentText: "#ffffff",
            border: "#f0c7d9",
        },
        dark: {
            background: "#2c1020",
            surface: "#461a33",
            text: "#fff4fa",
            muted: "#f2b8d2",
            accent: "#ff9fca",
            accentText: "#4a102e",
            border: "#733755",
        },
    },
    {
        id: "cobalt",
        name: "짙은 파랑",
        light: {
            background: "#f6f8ff",
            surface: "#ffffff",
            text: "#15265c",
            muted: "#425787",
            accent: "#2854c5",
            accentText: "#ffffff",
            border: "#c8d3f1",
        },
        dark: {
            background: "#101a3a",
            surface: "#1a2a57",
            text: "#f3f6ff",
            muted: "#b6c7f5",
            accent: "#9ab7ff",
            accentText: "#12245b",
            border: "#3a5090",
        },
    },
    {
        id: "indigo",
        name: "남색",
        light: {
            background: "#f8f7ff",
            surface: "#ffffff",
            text: "#292057",
            muted: "#5e5687",
            accent: "#5544b7",
            accentText: "#ffffff",
            border: "#d6d1ec",
        },
        dark: {
            background: "#1d173b",
            surface: "#302653",
            text: "#f7f5ff",
            muted: "#c8c0ea",
            accent: "#b8a7ff",
            accentText: "#2b205b",
            border: "#534879",
        },
    },
    {
        id: "carbon",
        name: "검정",
        light: {
            background: "#f1f1f1",
            surface: "#ffffff",
            text: "#18181b",
            muted: "#52525b",
            accent: "#000000",
            accentText: "#ffffff",
            border: "#71717a",
        },
        dark: {
            background: "#050505",
            surface: "#141414",
            text: "#f5f5f5",
            muted: "#c8c8c8",
            accent: "#e4e4e7",
            accentText: "#09090b",
            border: "#343434",
        },
    },
    {
        id: "porcelain",
        name: "흰색",
        light: {
            background: "#ffffff",
            surface: "#f7f8fa",
            text: "#1d1f23",
            muted: "#59636f",
            accent: "#2b2d31",
            accentText: "#ffffff",
            border: "#dfe3e8",
        },
        dark: {
            background: "#f8f8f6",
            surface: "#ffffff",
            text: "#171717",
            muted: "#555555",
            accent: "#101010",
            accentText: "#ffffff",
            border: "#d8d8d4",
        },
    },
    {
        id: "amber",
        name: "호박빛",
        light: {
            background: "#fffbeb",
            surface: "#ffffff",
            text: "#4a2b08",
            muted: "#775522",
            accent: "#a35a00",
            accentText: "#ffffff",
            border: "#ecd9a8",
        },
        dark: {
            background: "#2d210d",
            surface: "#45341a",
            text: "#fff9eb",
            muted: "#e7ca92",
            accent: "#ffc763",
            accentText: "#3b2607",
            border: "#70552b",
        },
    },
    {
        id: "yellow",
        name: "노랑",
        light: {
            background: "#fff9df",
            surface: "#fffdf4",
            text: "#27200a",
            muted: "#655a2b",
            accent: "#f6c600",
            accentText: "#211a00",
            border: "#e7d88f",
        },
        dark: {
            background: "#211b08",
            surface: "#302812",
            text: "#fffbea",
            muted: "#e6d897",
            accent: "#ffdc00",
            accentText: "#211a00",
            border: "#6e5b18",
        },
    },
    {
        id: "gray",
        name: "회색",
        light: {
            background: "#f4f4f2",
            surface: "#fafaf8",
            text: "#292927",
            muted: "#62625e",
            accent: "#60605c",
            accentText: "#ffffff",
            border: "#d7d7d2",
        },
        dark: {
            background: "#1c1c1a",
            surface: "#292927",
            text: "#f5f5f1",
            muted: "#c6c6c0",
            accent: "#b0b0aa",
            accentText: "#1c1c1a",
            border: "#4b4b46",
        },
    },
];
const fontById = (id) => designFonts.find((font) => font.id === id);
const paletteById = (id) => designPalettes.find((palette) => palette.id === id);
export const fontFamily = (id) => fontById(id)?.family ?? designFonts[0].family;
export function isDesignOptions(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const options = value;
    return (typeof options.bodyFont === "string" &&
        Boolean(fontById(options.bodyFont)) &&
        typeof options.headingFont === "string" &&
        Boolean(fontById(options.headingFont)) &&
        typeof options.palette === "string" &&
        Boolean(paletteById(options.palette)) &&
        (options.theme === "system" ||
            options.theme === "light" ||
            options.theme === "dark") &&
        (options.locale === "ko" || options.locale === "en"));
}
function originalFonts(sample) {
    return sample.fonts?.join(", ") || "프리셋의 원래 서체";
}
function originalColors(sample) {
    return (sample.colors?.map((color) => `${color.role} ${color.hex}`).join(", ") ||
        "프리셋의 원래 색상");
}
export function buildDesignPrompt(base, options, sample) {
    if (!isDesignOptions(options))
        return base;
    const body = options.bodyFont === "original"
        ? originalFonts(sample)
        : fontById(options.bodyFont)?.name;
    const heading = options.headingFont === "original"
        ? originalFonts(sample)
        : fontById(options.headingFont)?.name;
    const palette = paletteById(options.palette);
    if (!palette)
        return base;
    const colors = palette.id === "original"
        ? `원래 색상: ${originalColors(sample)}`
        : `라이트: ${Object.entries(palette.light)
            .map(([role, hex]) => `${role} ${hex}`)
            .join(", ")}\n다크: ${Object.entries(palette.dark)
            .map(([role, hex]) => `${role} ${hex}`)
            .join(", ")}`;
    const additions = [
        `## ${sample.name} 디자인 설정`,
        "아래 자동 디자인 설정과 필수 기능이 요청 본문·원본 스크린샷의 상충 지시보다 우선해. 화면 구성과 그림은 팩 지시를 유지해.",
        `본문: ${body}`,
        `제목: ${heading}`,
        ...selectedFonts(options).map((font) => `서체 원본: ${font.name} (${(font.files ?? [{ source: font.source, weight: font.weight }]).map((file) => `${file.source?.split("/").pop()} · 굵기 ${file.weight}`).join(", ")}). 공식 라이선스와 저작권 고지를 보존하고 자체 호스팅해. 수정 금지 서체는 원본 파일을 그대로 써.`),
        colors,
        `초기 모드: ${options.theme} (지원: system · light · dark)`,
        `초기 언어: ${options.locale} (지원: ko · en)`,
        "영문 전용 서체를 쓸 때는 한글을 Pretendard로 대체해.",
        "색상은 background·surface·text·muted·accent·accentText·border 의미 토큰에 연결하고 상태 색은 바꾸지 마.",
        "선택한 폰트와 색상은 디자인 토큰에 고정해줘. 실제 서비스에는 폰트·색상 선택 팔레트, 설정 견본, 프로킷 전용 미리보기 연결을 넣지 마.",
        "정적 HTML 내보내기에도 선택한 서체·팔레트·모드·언어가 유지돼야 해.",
    ];
    const required = [
        "시스템·라이트·다크 모드 전환과 한국어·영어 전환을 모든 페이지의 기본 기능으로 넣어줘. 화면 문구는 같은 키를 가진 두 언어의 번역 사전에서 관리하고, 전환해도 현재 페이지와 입력을 유지해줘. HTML로 내보낸 뒤에도 전환이 동작하게 해줘.",
        "언어 전환 때 html.lang을 현재 언어로 갱신해.",
        "날짜·숫자·금액은 현재 언어에 맞춰 Intl로 표시해.",
        "테마는 현재 모드 아이콘을 눌러 시스템·라이트·다크를 고르고, 언어 메뉴는 국기와 한국어·English 이름을 함께 보여줘. 키보드 선택과 접근성 이름도 제공해.",
        "제작 전에 이 선택값을 docs/preset-design.json과 DESIGN.md에 기록해. 본문·제목 서체, 실제 서체 파일·굵기·라이선스, 라이트·다크 의미 토큰, 초기 모드·언어를 대조 기준으로 삼아.",
        "완료 전에 실행 화면과 내보낸 HTML에서 document.fonts 로딩과 getComputedStyle의 실제 본문·제목 서체·색상 토큰을 위 선택값과 대조해. 모든 페이지·폼·모달에서 세 모드·두 언어 전환과 입력·페이지 유지를 확인해. 양쪽 모드의 본문·버튼 문구는 4.5:1 이상, 큰 글자·아이콘·조작부는 3:1 이상 대비를 확인하고 불일치는 수정해. 검증 증거와 미확인 항목을 결과에 보고하고 검사 없이 반영 완료라고 하지 마.",
    ];
    const request = base
        .replace(/<!-- prokit:preset-design:start -->[\s\S]*?<!-- prokit:preset-design:end -->/g, "")
        .trim();
    return `${request}\n\n<!-- prokit:preset-design:start -->\n${[...additions, ...required].join("\n")}\n<!-- prokit:preset-design:end -->`;
}
export function selectedFonts(options) {
    return [...new Set([options.bodyFont, options.headingFont])]
        .map(fontById)
        .filter((font) => Boolean(font?.source));
}
