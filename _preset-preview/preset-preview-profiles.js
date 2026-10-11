export const presetPreviewColorRoles = [
    "background",
    "surface",
    "text",
    "muted",
    "accent",
    "accentText",
    "border",
];
const scope = "[data-prokit-preview]";
const solidAccentClasses = [
    "primary",
    "brand",
    "action",
    "gold",
    "signal",
    "highlighter-yellow",
    "yellow-press",
];
const solidAccentSelectors = solidAccentClasses.flatMap((name) => [
    `.bg-${name}`,
    `.hover\\:bg-${name}:hover`,
    `.aria-\\[current\\=true\\]\\:bg-${name}[aria-current="true"]`,
    `.aria-\\[pressed\\=true\\]\\:bg-${name}[aria-pressed="true"]`,
    `.aria-\\[selected\\=true\\]\\:bg-${name}[aria-selected="true"]`,
    `.data-checked\\:bg-${name}[data-checked]`,
]);
const solidAccentForeground = ':is(.text-white,[class*="text-white/"],.text-primary,.text-primary-foreground,.text-brand-foreground,.text-action-foreground,.text-gold-foreground,.text-signal-foreground)';
const shadcnPaletteVariables = {
    "--background": "background",
    "--card": "surface",
    "--popover": "surface",
    "--sidebar": "surface",
    "--secondary": "surface",
    "--muted": "surface",
    "--accent": "surface",
    "--foreground": "text",
    "--card-foreground": "text",
    "--popover-foreground": "text",
    "--sidebar-foreground": "text",
    "--secondary-foreground": "text",
    "--accent-foreground": "text",
    "--muted-foreground": "muted",
    "--primary": "accent",
    "--ring": "accent",
    "--sidebar-primary": "accent",
    "--sidebar-ring": "accent",
    "--primary-foreground": "accentText",
    "--sidebar-primary-foreground": "accentText",
    "--border": "border",
    "--input": "border",
    "--sidebar-border": "border",
};
const sharedFontRoles = {
    bodyVariables: ["--font-sans", "--stack-sans", "--default-font-family"],
    bodySelectors: ["body", ".font-sans"],
    headingVariables: ["--font-display", "--font-label"],
    headingSelectors: ["h1", "h2", "h3", "h4", "h5", "h6", ".font-display"],
};
const withHeadingSelectors = (...headingSelectors) => ({
    ...sharedFontRoles,
    headingSelectors: [...sharedFontRoles.headingSelectors, ...headingSelectors],
});
const slidelabFontRoles = {
    bodyVariables: [...sharedFontRoles.bodyVariables, "--font-noto"],
    bodySelectors: sharedFontRoles.bodySelectors,
    headingVariables: [...sharedFontRoles.headingVariables, "--font-outfit"],
    headingSelectors: [...sharedFontRoles.headingSelectors, ".brand"],
};
const profile = (originalTheme, paletteVariables = {}, fontRoles = sharedFontRoles, protectedForegroundSelectors, paletteRules) => ({
    originalTheme,
    paletteVariables: { ...shadcnPaletteVariables, ...paletteVariables },
    fontRoles,
    protectedForegroundSelectors,
    paletteRules,
});
// 오류·성공·과목과 사진·로고 색은 의도적으로 이 연결표 밖에 둔다.
export const presetPreviewProfiles = {
    afterglow: profile("dark", { "--driftwood": "muted" }, withHeadingSelectors(".ag-display")),
    fitslot: profile("light", {
        "--sage": "surface",
        "--sand": "surface",
        "--action": "accent",
        "--action-foreground": "accentText",
    }),
    goru: profile("light"),
    jecheol: profile("light", {
        "--color-linen": "background",
        "--color-walnut": "text",
        "--color-whisper": "muted",
        "--color-apple": "accent",
    }),
    olgot: profile("light", {
        "--academy-navy": "accent",
        "--navy-press": "accent",
        "--highlighter-yellow": "accent",
        "--yellow-press": "accent",
        "--ink": "text",
        "--charcoal": "text",
        "--steel": "muted",
        "--line": "border",
        "--line-strong": "border",
        "--hairline-fill": "surface",
        "--paper": "surface",
    }, sharedFontRoles, undefined, [
        { selector: "#home-title", property: "color", role: "text" },
        { selector: ".bg-banner", property: "background", role: "accent" },
        { selector: ".bg-banner", property: "color", role: "accentText" },
        {
            selector: '.bg-banner :is(.text-white,[class*="text-white/"],.text-highlighter-yellow)',
            property: "color",
            role: "accentText",
        },
        {
            selector: ":is(.bg-white,.bg-white\\/95,.bg-white\\/25)",
            property: "background-color",
            role: "surface",
        },
        {
            selector: ":is(.bg-white,.bg-white\\/95,.bg-white\\/25)",
            property: "color",
            role: "text",
        },
        {
            selector: ':is(.bg-white,.bg-white\\/95,.bg-white\\/25) :is(.text-primary,.text-charcoal,.text-black,[class*="text-primary/"])',
            property: "color",
            role: "text",
        },
        {
            selector: ':is(.bg-white,.bg-white\\/95,.bg-white\\/25) :is(.text-steel,[class*="text-steel/"])',
            property: "color",
            role: "muted",
        },
        {
            selector: ":is(.border-primary,.border-action)",
            property: "border-color",
            role: "text",
        },
        { selector: "header", property: "background-color", role: "surface" },
        { selector: "header", property: "color", role: "text" },
        {
            selector: "header .bg-white",
            property: "background-color",
            role: "surface",
        },
        { selector: "header .text-black", property: "color", role: "text" },
        {
            selector: "aside[data-quick-menu]",
            property: "background-color",
            role: "surface",
        },
        {
            selector: "aside[data-quick-menu]",
            property: "color",
            role: "text",
        },
        {
            selector: "aside[data-quick-menu] .bg-white",
            property: "background-color",
            role: "surface",
        },
        {
            selector: 'aside[aria-label="빠른 메뉴 버튼"]',
            property: "background-color",
            role: "surface",
        },
        {
            selector: 'aside[aria-label="빠른 메뉴 버튼"]',
            property: "color",
            role: "text",
        },
        {
            selector: ".bg-linear-to-t.from-primary.via-primary\\/90",
            property: "color",
            role: "accentText",
        },
        {
            selector: '.bg-linear-to-t.from-primary.via-primary\\/90 :is(.text-white,[class*="text-white/"])',
            property: "color",
            role: "accentText",
        },
        {
            selector: ".bg-charcoal",
            property: "background-color",
            role: "surface",
        },
        { selector: ".bg-charcoal", property: "color", role: "text" },
        {
            selector: ".hover\\:bg-charcoal:hover",
            property: "background-color",
            role: "surface",
        },
        {
            selector: '.bg-charcoal :is(.text-white,[class*="text-white/"])',
            property: "color",
            role: "text",
        },
        { selector: ".bg-ink", property: "background-color", role: "surface" },
        { selector: ".bg-ink", property: "color", role: "text" },
        {
            selector: ".hover\\:bg-ink:hover",
            property: "background-color",
            role: "surface",
        },
        {
            selector: '.bg-ink :is(.text-white,[class*="text-white/"])',
            property: "color",
            role: "text",
        },
    ]),
    pacecrew: profile("light", {
        "--ink": "text",
        "--canvas": "background",
        "--canvas-soft": "surface",
        "--body-text": "muted",
        "--mute": "border",
        "--hi-vis-yellow": "accent",
    }),
    studyday: profile("light", {
        "--primary-active": "accent",
        "--stage-muted": "muted",
    }),
    ullim: profile("dark", {
        "--gold": "accent",
        "--gold-foreground": "accentText",
        "--stage": "surface",
    }),
    uptrail: profile("dark", { "--signal": "accent" }),
    nextflix: profile("dark", {
        "--color-brand": "accent",
        "--color-brand-hover": "accent",
        "--color-brand-pressed": "accent",
        "--color-canvas": "background",
        "--color-panel": "surface",
        "--color-carbon": "surface",
        "--color-charcoal": "surface",
        "--color-slate": "surface",
        "--color-ash": "border",
        "--color-soft": "muted",
    }, sharedFontRoles, [
        "#billboard-title",
        "#billboard-title + p",
        "#billboard-title + p + p",
        'section[aria-labelledby="billboard-title"] > span',
        "main#main > section:first-child > div:last-child > :is(h1,p)",
        "video + p.text-soft",
    ], [
        {
            selector: ".bg-charcoal",
            property: "background-color",
            role: "surface",
        },
        { selector: ".bg-carbon", property: "background-color", role: "surface" },
        { selector: ".bg-panel", property: "background-color", role: "surface" },
        { selector: ".bg-slate", property: "background-color", role: "surface" },
        { selector: ".bg-brand", property: "background-color", role: "accent" },
        { selector: ".bg-brand", property: "color", role: "accentText" },
        {
            selector: ".hover\\:bg-charcoal:hover",
            property: "background-color",
            role: "surface",
        },
        {
            selector: ".hover\\:bg-slate:hover",
            property: "background-color",
            role: "surface",
        },
        { selector: ".text-fog", property: "color", role: "muted" },
        { selector: ".text-soft", property: "color", role: "muted" },
        {
            selector: ".bg-charcoal::placeholder",
            property: "color",
            role: "muted",
        },
    ]),
    claudle: profile("light", {
        "--ink-secondary": "muted",
        "--brand": "accent",
        "--brand-hover": "accent",
        "--brand-foreground": "accentText",
        "--brand-ink": "accent",
        "--band-foreground": "muted",
    }, withHeadingSelectors(".display-title", ".greeting", ".reply :where(h1,h2,h3,h4)")),
    slidelab: profile("dark", {
        "--sl-bg": "background",
        "--sl-surface": "surface",
        "--sl-card": "surface",
        "--sl-ink": "text",
        "--sl-muted": "muted",
        "--sl-lime": "accent",
        "--sl-lime-ink": "accentText",
        "--sl-line": "border",
        "--sl-control-line": "border",
    }, slidelabFontRoles),
};
export const presetPreviewSlugs = Object.keys(presetPreviewProfiles);
export function getPresetPreviewProfile(slug) {
    return presetPreviewProfiles[slug];
}
const cssValue = (value) => value && !/[;{}]/.test(value) ? value : undefined;
const colorSchemeFor = (background, fallback) => {
    const hex = background?.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (!hex)
        return fallback;
    const [red, green, blue] = hex
        .slice(1)
        .map((value) => Number.parseInt(value, 16));
    return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 128 ? "dark" : "light";
};
/** 공개 프리셋 문서의 html에 data-prokit-preview를 붙인 runtime만 이 CSS를 적용한다. */
export function createPresetPreviewCss(profile, { colors, bodyFont, headingFont, mode }) {
    if (!profile)
        return "";
    const declarations = [];
    const paletteRules = [];
    if (colors) {
        for (const [variable, role] of Object.entries(profile.paletteVariables)) {
            const color = cssValue(colors[role]);
            if (color)
                declarations.push(`${variable}:${color}!important`);
        }
        for (const rule of profile.paletteRules ?? []) {
            const color = cssValue(colors[rule.role]);
            if (color) {
                paletteRules.push(`${scope} ${rule.selector}{${rule.property}:${color}!important}`);
            }
        }
        const accent = cssValue(colors.accent);
        const accentText = cssValue(colors.accentText);
        if (accent && accentText) {
            const accentScope = `${scope} :is(${solidAccentSelectors.join(",")})`;
            paletteRules.push(`${accentScope}{background-color:${accent}!important;color:${accentText}!important}`, `${accentScope}:is(${solidAccentForeground}),${accentScope} ${solidAccentForeground}{color:${accentText}!important}`);
        }
    }
    const body = cssValue(bodyFont);
    if (body) {
        for (const variable of profile.fontRoles.bodyVariables) {
            declarations.push(`${variable}:${body}!important`);
        }
    }
    const heading = cssValue(headingFont);
    if (heading) {
        for (const variable of profile.fontRoles.headingVariables) {
            declarations.push(`${variable}:${heading}!important`);
        }
    }
    const rules = [];
    if (declarations.length)
        rules.push(`${scope}{${declarations.join(";")}}`);
    rules.push(...paletteRules);
    if (colors && profile.protectedForegroundSelectors?.length) {
        for (const selector of profile.protectedForegroundSelectors) {
            rules.push(`${scope} ${selector}{color:#fff!important}`);
        }
    }
    if (body) {
        const selectors = profile.fontRoles.bodySelectors
            .map((selector) => `${scope} ${selector}`)
            .join(",");
        rules.push(`${selectors}{font-family:${body}!important}`);
    }
    if (heading) {
        const selectors = profile.fontRoles.headingSelectors
            .map((selector) => `${scope} ${selector}`)
            .join(",");
        rules.push(`${selectors}{font-family:${heading}!important}`);
    }
    if (mode) {
        rules.push(`${scope}[data-prokit-preview-mode="${mode}"]{color-scheme:${colorSchemeFor(colors?.background, mode)}!important}`);
    }
    return rules.join("\n");
}
