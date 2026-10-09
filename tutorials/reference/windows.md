# Windows 준비

pro-kit은 Windows에서 WSL2(Windows 안에서 Linux를 쓰게 해 주는 기능)의 Ubuntu로만 써요. PowerShell이나 Git Bash에서는 설치가 멈춰요.

## 1. WSL2와 Ubuntu 설치

1. 시작 메뉴에서 "PowerShell"을 찾아 마우스 오른쪽 버튼을 누르고 "관리자 권한으로 실행"을 고르세요.
2. 아래 명령을 붙여 넣고 엔터를 누르세요.

   ```powershell
   wsl --install
   ```

3. 설치가 끝나면 컴퓨터를 다시 시작하세요.
4. Ubuntu 창이 열리면 사용할 이름과 비밀번호를 만드세요. 비밀번호는 입력해도 화면에 보이지 않는 게 정상이에요.

## 2. Docker Desktop 설치 (실제 서비스로 만들 때만)

화면만 만들 때는 건너뛰어도 돼요. 로그인과 DB 저장이 되는 실제 서비스로 만들 때 설치하세요.

1. [docker.com](https://www.docker.com/products/docker-desktop/)에서 Windows용 Docker Desktop을 받아 설치하세요.
2. Docker Desktop을 열고 **Settings → Resources → WSL integration**에서 Ubuntu를 켜세요.

## 3. 앞으로 지킬 것

- 모든 명령은 **Ubuntu 창**에서 입력해요. [시작하기](../start/README.md)의 터미널은 Ubuntu 창을 뜻해요.
- 프로젝트는 Ubuntu의 홈 폴더(`~/projects`)에 만들어요. `/mnt/c` 아래(Windows의 C 드라이브)에 만들면 느리고 오류가 나요.
- 만든 화면은 Windows의 브라우저에서 <!-- v:port.web.urlCode -->`http://localhost:3001`<!-- /v -->로 열면 돼요.

준비가 끝나면 [시작하기](../start/README.md)의 3단계부터 하면 돼요.
