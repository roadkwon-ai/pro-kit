# 완성팩 활용과 담당 구분
https://prokit-web.vercel.app/docs/design/preset-publication/

> 한눈에: 완성팩은 다 만든 프리셋을 내 프로젝트에 되살려 쓰는 묶음이에요. 프로킷은 팩을 받아 복원하고, 내용과 기능을 바꾼 뒤 완성 프리셋과 비교하는 일을 맡아요. **공식 프리셋을 처음 만드는 일은 이 저장소와 사용자 템플릿에 들어 있지 않아요.**

## 완성팩으로 앱을 만들어요

완성팩으로 사용자 앱을 만들 때는 `prokit-pack-use`를 따라요. 팩을 받아 무결성을 확인하고 복원 계획을 검사한 뒤 실제로 복원해요. 개인화와 API·DB 연결 뒤에도 완성 프리셋의 화면과 모션을 기준으로 비교하며 원본 사이트를 다시 조사하지 않아요.

팩을 받은 것과 앱에 적용한 것은 달라요. `apply-pack.mjs --check`는 복원 계획과 충돌을 확인하고, 실제 적용 뒤 설치·빌드·화면 검사를 수행해요. 기존 팩에 비교 자료가 없으면 그 부분은 미확인으로 남겨요.

## 담당 구분

공식 프리셋의 원본 조사, COPY 제작, 원본 충실도 검수, 팩 조립과 프로킷 웹 게시는 비공개 저장소 `pro-kit-preset-skills`의 스킬이 맡고 `pro-kit-web`에서 조율해요. 이 저장소와 일반 사용자 템플릿에는 그 스킬과 역할을 설치하지 않아요. 템플릿 스킬은 그런 요청을 받으면 직접 처리하지 않고 담당으로 넘겨요.

## 기록된 범위만 표시해요

교재의 전체 제작 시간, 팩을 재현할 때의 예상 시간, 실제 관측한 세션 일부는 서로 다른 값이에요. 교재는 기록된 시간이 일부뿐이면 범위와 빠진 단계를 함께 적어요. 비용 해석은 [시간과 비용 읽는 법](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/)을 확인해요.

## 자세히

- 팩 받기: `node scripts/pack.mjs <이름>`. 받아 둔 zip은 `--zip <경로>`를 붙여 같은 확인을 거쳐요.
- 복원 계획 검사: `node scripts/apply-pack.mjs --pack <팩 폴더> --project <프로젝트> --check`
- 팩 설정 적용 기준: 템플릿의 `prokit-ui/references/preset-settings.md`
- 완성 프리셋과 비교: 템플릿의 `prokit-verify/references/pack-baseline.md`

## 관련 문서

- [prokit 스킬](https://prokit-web.vercel.app/docs/skills/prokit-skills/)
- [UI/UX 흐름](https://prokit-web.vercel.app/docs/design/ui-flow/)
- [설치된 프로젝트의 폴더 구조](https://prokit-web.vercel.app/docs/reference/project-structure/)
- [슬라이드랩](https://prokit-web.vercel.app/tutorials/samples/slidelab/)
