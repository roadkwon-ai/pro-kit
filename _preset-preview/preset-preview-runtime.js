import { defaultDesignOptions, designFonts, designPalettes, } from "./preset-design.js?v=acdfa9ef56daaf3f";
import { loadDesignFonts } from "./preset-font-loader.js?v=acdfa9ef56daaf3f";
import { bindPresetPreview, PRESET_PREVIEW_VERSION, } from "./preset-preview.js?v=acdfa9ef56daaf3f";
import { createPresetPreviewCss, getPresetPreviewProfile, } from "./preset-preview-profiles.js?v=acdfa9ef56daaf3f";
import { PAGES_URL, SITE_URLS } from "./site.js?v=acdfa9ef56daaf3f";
export const previewAllowedParentOrigins = [
    ...Object.values(SITE_URLS).map((url) => new URL(url).origin),
    new URL(PAGES_URL).origin,
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3013",
    "http://127.0.0.1:3013",
];
export const previewRuntimeCapabilities = [
    "font",
    "palette",
    "theme",
    "locale",
];
export async function waitForNativeSettings(windowLike, enabled, timeoutMs = 4000) {
    if (!enabled)
        return undefined;
    const target = windowLike;
    if (target.__prokitPresetSettings)
        return target.__prokitPresetSettings;
    return new Promise((resolve) => {
        const ready = () => {
            const adapter = target.__prokitPresetSettings;
            if (adapter)
                finish(adapter);
        };
        const finish = (adapter) => {
            clearTimeout(timer);
            target.removeEventListener("prokit:native-settings-ready", ready);
            resolve(adapter);
        };
        const timer = setTimeout(() => finish(), timeoutMs);
        target.addEventListener("prokit:native-settings-ready", ready);
        ready();
    });
}
export function previewRuntimeSlug(documentLike) {
    return (documentLike.querySelector("script[data-prokit-preview-script]")?.dataset
        ?.prokitPreviewScript ?? null);
}
export function resolvePreviewMode(theme, systemDark) {
    return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}
const runtimeFont = (id) => designFonts.find((font) => font.id === id);
export const previewFontFamily = (id) => runtimeFont(id)?.family;
const hasOwnFont = (id) => Boolean(runtimeFont(id)?.source);
export function previewActualOptions(options, previous, originalTheme, documentLocale, fontFailed, nativeSettings) {
    const originalPalette = options.palette === "original";
    const unsupported = nativeSettings ? [] : ["locale"];
    if (fontFailed)
        unsupported.push("font");
    if (originalPalette && !nativeSettings)
        unsupported.push("theme");
    return {
        options: {
            ...options,
            bodyFont: fontFailed ? previous.bodyFont : options.bodyFont,
            headingFont: fontFailed ? previous.headingFont : options.headingFont,
            theme: nativeSettings?.theme ??
                (originalPalette ? originalTheme : options.theme),
            locale: nativeSettings?.locale ?? documentLocale,
        },
        unsupported,
    };
}
export function installPresetPreviewRuntime(windowLike = window, documentLike = document) {
    if (windowLike.top === windowLike)
        return () => { };
    const slug = previewRuntimeSlug(documentLike);
    const profile = slug ? getPresetPreviewProfile(slug) : undefined;
    if (!slug || !profile)
        return () => { };
    const style = documentLike.createElement("style");
    style.dataset.prokitPreviewRuntime = slug;
    documentLike.head.append(style);
    documentLike.documentElement.dataset.prokitPreview = "";
    const assetUrl = new URL("./", import.meta.url);
    assetUrl.search = new URL(import.meta.url).search;
    const assetBase = assetUrl.href;
    const media = windowLike.matchMedia("(prefers-color-scheme: dark)");
    const nativeEnabled = Boolean(documentLike.querySelector("[data-prokit-native-settings]"));
    let applied = defaultDesignOptions;
    let parentOrigin;
    const refreshCss = (options) => {
        const palette = designPalettes.find((item) => item.id === options.palette);
        const mode = resolvePreviewMode(options.theme, media.matches);
        const colors = palette && palette.id !== "original"
            ? palette[mode]
            : undefined;
        const bodyFont = options.bodyFont === "original"
            ? undefined
            : previewFontFamily(options.bodyFont);
        const headingFont = options.headingFont === "original"
            ? undefined
            : previewFontFamily(options.headingFont);
        documentLike.documentElement.toggleAttribute("data-prokit-preview-mode", Boolean(colors));
        if (colors)
            documentLike.documentElement.dataset.prokitPreviewMode = mode;
        style.textContent = createPresetPreviewCss(profile, {
            colors,
            bodyFont,
            headingFont,
            mode: colors ? mode : undefined,
        });
    };
    const stopBridge = bindPresetPreview({
        slug,
        allowedOrigins: previewAllowedParentOrigins,
        onConnect: (origin) => {
            parentOrigin = origin;
        },
        capabilities: previewRuntimeCapabilities.filter((capability) => nativeEnabled || capability !== "locale"),
        prepareApply: async (options) => {
            const load = (id) => {
                const font = runtimeFont(id);
                return hasOwnFont(id) && font
                    ? loadDesignFonts(font, assetBase).catch(() => [])
                    : Promise.resolve([]);
            };
            const [bodyFace, headingFace] = await Promise.all([
                load(options.bodyFont),
                load(options.headingFont),
            ]);
            const bodyFailed = hasOwnFont(options.bodyFont) && !bodyFace.length;
            const headingFailed = hasOwnFont(options.headingFont) && !headingFace.length;
            const nativeAdapter = await waitForNativeSettings(windowLike, nativeEnabled);
            return async (isCurrent) => {
                if (!isCurrent())
                    return;
                let nativeSettings;
                if (nativeAdapter)
                    nativeSettings = await nativeAdapter.apply({
                        theme: options.theme,
                        locale: options.locale,
                    });
                if (!isCurrent())
                    return;
                for (const face of [...bodyFace, ...headingFace])
                    documentLike.fonts.add(face);
                const result = previewActualOptions(options, applied, profile.originalTheme, documentLike.documentElement.lang.startsWith("en") ? "en" : "ko", bodyFailed || headingFailed, nativeSettings);
                const actual = result.options;
                refreshCss(actual);
                applied = actual;
                return result;
            };
        },
    });
    const onSystemTheme = () => refreshCss(applied);
    const onNativeSettings = () => {
        const settings = windowLike.__prokitPresetSettings?.get();
        if (!parentOrigin || !settings)
            return;
        applied = { ...applied, ...settings };
        refreshCss(applied);
        windowLike.parent.postMessage({
            type: "prokit:preview:settings",
            version: PRESET_PREVIEW_VERSION,
            slug,
            ...settings,
        }, parentOrigin);
    };
    media.addEventListener("change", onSystemTheme);
    windowLike.addEventListener("prokit:native-user-settings", onNativeSettings);
    return () => {
        stopBridge();
        media.removeEventListener("change", onSystemTheme);
        windowLike.removeEventListener("prokit:native-user-settings", onNativeSettings);
        style.remove();
        documentLike.documentElement.removeAttribute("data-prokit-preview");
        documentLike.documentElement.removeAttribute("data-prokit-preview-mode");
    };
}
if (typeof window !== "undefined" && typeof document !== "undefined") {
    installPresetPreviewRuntime();
}
