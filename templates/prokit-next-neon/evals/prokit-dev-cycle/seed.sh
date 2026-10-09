#!/usr/bin/env bash
# prokit-dev-cycle eval 4 시드. evals/seed/apply.sh를 먼저 실행한 프로젝트에 D 라운드를 열고,
# zod가 이미 하는 제목 정리(trim, 200자)를 손으로 다시 짠 코드(구현 하나뿐인 인터페이스, 팩터리, 안 쓰는 옵션)를 넣는다.
# 새 파일은 추적하지 않은 채로 둔다(git diff <base>에 나오지 않는 경우를 함께 본다). 커밋하지 않는다.
# 사용법: seed.sh <프로젝트>
set -euo pipefail
cd "$1"
pnpm dev-cycle table D --write --title "할 일 제목 앞뒤 공백 정리" >/dev/null
mkdir -p packages/api/src/lib
cat > packages/api/src/lib/title.ts <<'TS'
export interface TitleNormalizer {
	normalize(input: string): string;
}

export interface TitleNormalizerOptions {
	maxLength: number;
	collapseWhitespace: boolean;
}

const DEFAULT_OPTIONS: TitleNormalizerOptions = {
	maxLength: 200,
	collapseWhitespace: false,
};

function isWhitespace(ch: string): boolean {
	return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

export class DefaultTitleNormalizer implements TitleNormalizer {
	constructor(
		private readonly options: TitleNormalizerOptions = DEFAULT_OPTIONS,
	) {}

	normalize(input: string): string {
		let start = 0;
		let end = input.length;
		while (start < end && isWhitespace(input.charAt(start))) start++;
		while (end > start && isWhitespace(input.charAt(end - 1))) end--;
		const trimmed = input.slice(start, end);
		return trimmed.length > this.options.maxLength
			? trimmed.slice(0, this.options.maxLength)
			: trimmed;
	}
}

export function createTitleNormalizer(
	options?: TitleNormalizerOptions,
): TitleNormalizer {
	return new DefaultTitleNormalizer(options);
}
TS
f=packages/api/src/routers/todo.ts
perl -0pi -e 's#(import \{ protectedProcedure \} from "\.\./index";\n)#$1import { createTitleNormalizer } from "../lib/title";\n#; s#title: input\.title,#title: createTitleNormalizer().normalize(input.title),#' "$f"
grep -q "normalize(input.title)" "$f"
grep -q 'from "../lib/title"' "$f"
pnpm exec biome check --write packages/api/src >/dev/null 2>&1 || true
