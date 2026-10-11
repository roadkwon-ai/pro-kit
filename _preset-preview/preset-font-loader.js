const loads = new Map();
const faceFamily = (font) => font.family.match(/"([^"]+)"/)?.[1] ?? null;
const normalizeBase = (base) => base.replace(/\/+$/, "");
const assetUrl = (source, assetBase) => {
    if (/^https?:\/\//.test(source))
        return source;
    const [base, query] = assetBase.split("?");
    return `${normalizeBase(base)}${source}${query ? `?${query}` : ""}`;
};
// document.fonts.add는 프리뷰·사이트 런타임이 각자 호출해 자기 문서에 등록한다.
export function loadDesignFont(font, assetBase = "") {
    const family = faceFamily(font);
    if (!font.source || !family || typeof FontFace === "undefined") {
        return Promise.resolve(null);
    }
    const base = normalizeBase(assetBase);
    const key = [family, base, font.source, font.weight ?? ""].join("\0");
    let load = loads.get(key);
    if (!load) {
        const face = new FontFace(family, `url(${assetUrl(font.source, base)})`, {
            weight: font.weight,
        });
        load = face.load().catch((error) => {
            loads.delete(key);
            throw error;
        });
        loads.set(key, load);
    }
    return load;
}
export function loadDesignFonts(font, assetBase = "") {
    const files = font.files?.length
        ? font.files
        : font.source
            ? [{ source: font.source, weight: font.weight ?? "" }]
            : [];
    return Promise.all(files.map((file) => loadDesignFont({ ...font, ...file, files: undefined }, assetBase))).then((faces) => faces.filter((face) => Boolean(face)));
}
