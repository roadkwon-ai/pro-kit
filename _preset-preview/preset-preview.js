import { isDesignOptions } from "./preset-design.js?v=b8c205c1ceaee5d0";
export const PRESET_PREVIEW_VERSION = 1;
export const previewCapabilities = [
    "font",
    "palette",
    "theme",
    "locale",
];
const isObject = (value) => typeof value === "object" && value !== null;
const isCapability = (value) => typeof value === "string" &&
    previewCapabilities.includes(value);
const hasUniqueCapabilities = (value) => Array.isArray(value) &&
    value.every(isCapability) &&
    new Set(value).size === value.length;
export const isPreviewOptions = isDesignOptions;
const hasEnvelope = (value, type) => value.type === type &&
    value.version === PRESET_PREVIEW_VERSION &&
    typeof value.slug === "string";
export function readReadyMessage(value, expectedSlug) {
    if (!isObject(value) || !hasEnvelope(value, "prokit:preview:ready"))
        return null;
    if (expectedSlug && value.slug !== expectedSlug)
        return null;
    if (!hasUniqueCapabilities(value.capabilities))
        return null;
    return value;
}
function readAppliedMessage(value) {
    if (!isObject(value) || !hasEnvelope(value, "prokit:preview:applied"))
        return null;
    if (typeof value.requestId !== "string" || !isPreviewOptions(value.options)) {
        return null;
    }
    if (!hasUniqueCapabilities(value.unsupported))
        return null;
    return value;
}
function readApplyMessage(value, expectedSlug) {
    if (!isObject(value) || !hasEnvelope(value, "prokit:preview:apply"))
        return null;
    if (value.slug !== expectedSlug ||
        typeof value.requestId !== "string" ||
        !isPreviewOptions(value.options)) {
        return null;
    }
    return value;
}
const sameCapability = (capability, a, b) => capability === "font"
    ? a.bodyFont === b.bodyFont && a.headingFont === b.headingFont
    : capability === "palette"
        ? a.palette === b.palette
        : capability === "theme"
            ? a.theme === b.theme
            : a.locale === b.locale;
export function matchAppliedRequest(value, request, capabilities) {
    const response = readAppliedMessage(value);
    if (!response ||
        response.slug !== request.slug ||
        response.requestId !== request.requestId) {
        return null;
    }
    const declared = new Set(capabilities);
    const unsupported = new Set(response.unsupported);
    const match = {
        applied: [],
        unsupported: [],
        mismatched: [],
    };
    for (const capability of previewCapabilities) {
        if (unsupported.has(capability)) {
            match.unsupported.push(capability);
        }
        else if (!declared.has(capability)) {
            match.mismatched.push(capability);
        }
        else if (sameCapability(capability, response.options, request.options)) {
            match.applied.push(capability);
        }
        else {
            match.mismatched.push(capability);
        }
    }
    return match;
}
export function preservedPreviewCapabilities(options, match) {
    return options.palette === "original" && match.unsupported.includes("theme")
        ? ["theme"]
        : [];
}
export function isAppliedRequest(value, request, capabilities) {
    const match = matchAppliedRequest(value, request, capabilities);
    return Boolean(match && match.mismatched.length === 0);
}
export function readPreviewResponse(value, request) {
    if (!isObject(value))
        return null;
    if (value.type !== "prokit:preview:applied" &&
        value.type !== "prokit:preview:error") {
        return null;
    }
    if (!hasEnvelope(value, value.type) ||
        value.slug !== request.slug ||
        value.requestId !== request.requestId) {
        return null;
    }
    return { type: value.type };
}
export function readNativePreviewSettings(value, slug) {
    if (!isObject(value) ||
        !hasEnvelope(value, "prokit:preview:settings") ||
        value.slug !== slug)
        return null;
    if ((value.theme !== "system" &&
        value.theme !== "light" &&
        value.theme !== "dark") ||
        (value.locale !== "ko" && value.locale !== "en"))
        return null;
    return {
        theme: value.theme,
        locale: value.locale,
    };
}
export function createPreviewApplyCoordinator() {
    let active = true;
    let generation = 0;
    return {
        async apply(options, prepareApply) {
            const current = ++generation;
            let commit;
            try {
                commit = await prepareApply(options);
            }
            catch (error) {
                if (!active || generation !== current)
                    return null;
                throw error;
            }
            if (!active || generation !== current)
                return null;
            const isCurrent = () => active && generation === current;
            const result = await commit(isCurrent);
            return isCurrent() ? (result ?? null) : null;
        },
        cleanup() {
            active = false;
            generation += 1;
        },
    };
}
export function previewOrigin(sampleUrl) {
    try {
        const url = new URL(sampleUrl);
        return url.protocol === "https:" || url.protocol === "http:"
            ? url.origin
            : null;
    }
    catch {
        return null;
    }
}
export function previewIframeUrl(sampleUrl, nonce = "1") {
    const url = new URL(sampleUrl);
    url.searchParams.set("prokit-preview", nonce);
    return url.href;
}
export function isTrustedPreviewEvent(event, frameWindow, sampleUrl) {
    return (frameWindow !== null &&
        frameWindow !== undefined &&
        event.source === frameWindow &&
        event.origin === previewOrigin(sampleUrl));
}
/**
 * 준비 뒤 최신 요청만 적용하고, 비동기 적용은 완료 뒤에도 최신 요청인지 검사한다.
 */
export function bindPresetPreview({ slug, allowedOrigins, capabilities, prepareApply, onConnect, }) {
    const origins = new Set(allowedOrigins);
    const coordinator = createPreviewApplyCoordinator();
    // 준비 중에는 DOM을 바꾸지 않는다.
    const respond = (target, origin, message) => target.postMessage(message, origin);
    const onMessage = async (event) => {
        if (window.parent === window ||
            event.source !== window.parent ||
            !origins.has(event.origin)) {
            return;
        }
        const parent = event.source;
        if (isObject(event.data) &&
            hasEnvelope(event.data, "prokit:preview:hello") &&
            event.data.slug === slug) {
            onConnect?.(event.origin);
            respond(parent, event.origin, {
                type: "prokit:preview:ready",
                version: PRESET_PREVIEW_VERSION,
                slug,
                capabilities: [...capabilities],
            });
            return;
        }
        const apply = readApplyMessage(event.data, slug);
        if (!apply)
            return;
        try {
            const actual = await coordinator.apply(apply.options, prepareApply);
            if (!actual ||
                !isPreviewOptions(actual.options) ||
                !hasUniqueCapabilities(actual.unsupported)) {
                return;
            }
            respond(parent, event.origin, {
                type: "prokit:preview:applied",
                version: PRESET_PREVIEW_VERSION,
                slug,
                requestId: apply.requestId,
                options: actual.options,
                unsupported: actual.unsupported,
            });
        }
        catch {
            respond(parent, event.origin, {
                type: "prokit:preview:error",
                version: PRESET_PREVIEW_VERSION,
                slug,
                requestId: apply.requestId,
            });
        }
    };
    window.addEventListener("message", onMessage);
    return () => {
        coordinator.cleanup();
        window.removeEventListener("message", onMessage);
    };
}
