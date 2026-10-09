<!-- 두 템플릿 README에서 팀원이 프로젝트를 클론했을 때 하는 일 문단. 인자: tail(뒤에 붙는 말. 앞에 띄어쓰기를 둔다. 없으면 붙이지 않는다) -->
팀원이 이 프로젝트를 클론했을 때: `pnpm install` 뒤 `pnpm skills:setup`을 한 번 실행한다(스킬 파일은 커밋되어 있으므로 빠진 것만 받는다. Claude 플러그인을 받고, OMX 기기별 설정을 만들고, {{v:policy.agentBrowser.da}}). 전역 도구까지 맞추려면 `pnpm skills:setup --with-global`. 상태만 보려면 `pnpm skills:check`(`omx`가 없는 기기는 OMX를 누락으로 세지 않는다).{{tail|}}
