<!-- 두 템플릿 README "Vercel 배포" 절의 첫 문단 -->
로컬 Vercel CLI로 develop(Preview 배포 + 고정 주소)과 production을 배포한다. 절차 정본은 `prokit-deploy` 스킬이다. 에이전트에게 "develop에 배포해줘", "운영에 배포해줘"처럼 요청하면 이 스킬을 따른다. Vercel 연결과 운영 DB 적용은 사용자가 요청할 때만 한다. 배포는 요청할 때와, 라운드 끝에서 사용자가 "릴리스하고 production 배포"를 고를 때 한다(`prokit-dev-cycle` 5절).
