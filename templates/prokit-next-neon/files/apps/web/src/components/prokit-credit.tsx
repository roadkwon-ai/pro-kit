// 프로킷으로 만든 사이트의 제작 표시. 프로킷 사이트 푸터의 "이 사이트도 프로킷으로 만들었어요" 줄과 같은 모양이다.
// 선택해서 쓰는 출처 표시다. MIT의 저작권·허가문 보존과는 별개로 표시 여부·문구·배치를 조정할 수 있다.
import { useId } from "react";

// 프로킷 주소는 여기에만 있다. 홈페이지 주소가 바뀌면 PROKIT_LINKS만 고친다(프로젝트마다 같은 파일이라 그대로 복사해도 된다).
export const PROKIT_LINKS = {
	site: "https://prokit-web.vercel.app/",
	github: "https://github.com/roadkwon-ai/pro-kit",
};

export function ProkitCredit({ className = "" }: { className?: string }) {
	// 한 쪽에 표시가 둘이고 하나가 가려지면(모바일 메뉴 등) 같은 mask id를 가려진 쪽에서 찾아 심볼이 사각형으로 나온다. 표시마다 id를 따로 둔다
	const mask = `prokit-credit-${useId().replace(/[^\w-]/g, "")}`;
	return (
		<p
			className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${className}`}
		>
			{/* 프로킷 심볼. 글자 색으로 칠하고 몸통은 비워 바탕색이 비친다(밝은 바탕은 검게, 어두운 바탕은 반전) */}
			<svg viewBox="0 0 32 32" aria-hidden="true" className="size-5 shrink-0">
				<mask id={mask}>
					<rect width="32" height="32" fill="white" />
					<rect x="13.5" y="3.5" width="5" height="5.5" rx="1.5" fill="black" />
					<path
						d="M22.6 5.2 23.8 3.2M24.6 7.4l2-1.1"
						stroke="black"
						strokeWidth="1.6"
						strokeLinecap="round"
					/>
					<rect x="5.5" y="8" width="21" height="18" rx="6.5" fill="black" />
					<rect x="8.5" y="11.2" width="15" height="11" rx="4.2" fill="white" />
					<path
						d="M11.2 18.2q1.6-2.6 3.2 0M17.6 18.2q1.6-2.6 3.2 0"
						fill="none"
						stroke="black"
						strokeWidth="1.7"
						strokeLinecap="round"
					/>
				</mask>
				<rect
					width="32"
					height="32"
					rx="8"
					fill="currentColor"
					mask={`url(#${mask})`}
				/>
			</svg>
			<a href={PROKIT_LINKS.site} className="underline underline-offset-4">
				이 사이트도 <span translate="no">프로킷</span>으로 만들었어요
			</a>
			<span aria-hidden="true">·</span>
			<a href={PROKIT_LINKS.github} className="underline underline-offset-4">
				GitHub
			</a>
		</p>
	);
}
