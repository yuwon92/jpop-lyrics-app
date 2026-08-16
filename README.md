
# 🎵 J-Pop 가사 번역 & 단어장

일본어 가사를 공부하기 위한 데스크톱 앱입니다.  
가사를 붙여넣으면 히라가나를 자동으로 생성해주고, 번역을 입력하며 단어를 저장할 수 있습니다.

---

## 설치 방법

[Releases 페이지](https://github.com/yuwon92/jpop-lyrics-app/releases/latest)에서 운영체제에 맞는 파일을 다운로드하세요.

### Windows

1. `J-Pop Vocab Setup x.x.x.exe` 다운로드 후 실행
2. "Windows의 PC 보호" 파란 경고 창이 뜨면 **추가 정보 → 실행** 클릭
   - 개인 개발 앱이라 서명 인증서가 없어서 뜨는 경고입니다
3. 설치가 끝나면 바탕화면/시작 메뉴의 **J-Pop Vocab**으로 실행

### Mac

1. `J-Pop Vocab-x.x.x.dmg` 다운로드 후 열기
2. 앱 아이콘을 **응용 프로그램(Applications)** 폴더로 드래그
3. 터미널(Terminal)을 열고 아래 명령어 실행 — 다운로드한 앱에 대한 macOS 차단(격리 속성)을 해제합니다:

   ```bash
   xattr -dr com.apple.quarantine "/Applications/J-Pop Vocab.app"
   ```

4. 응용 프로그램 폴더에서 **J-Pop Vocab** 실행

> 실행 시 "예기치 않게 종료되었습니다" 메시지가 뜨면 아래 명령어로 서명을 붙인 뒤 다시 실행하세요:
>
> ```bash
> codesign --force --deep --sign - "/Applications/J-Pop Vocab.app"
> ```

---

## 주요 기능

- **히라가나 자동 변환** — 가사를 붙여넣으면 한자 → 히라가나 자동 생성 (로컬 동작)
- **한글 발음 토글** — `ひ → 가` 버튼으로 히라가나 발음 ↔ 한글 발음 전환 (첫 변환 1회만 AI 사용, 이후 캐시)
- **유튜브 플레이어** — 가사 화면 오른쪽에서 유튜브 영상 재생, 노래마다 URL 저장·복원, 접거나 탭을 이동해도 재생 유지
- **단어 즉시 저장** — 모르는 단어를 드래그 후 `Ctrl+E`로 단어장에 추가 (발음 자동 변환, 뜻 AI 번역, 활용형이면 기본형 추천)
- **단어장** — 전체/노래별 보기, 즐겨찾기, 셔플, 낱말카드(플립·키보드 조작)
- **문법 노트** — 문법 포인트 저장·관리 전용 탭
- **가사 줄 분석** *(베타)* — 줄 우측 `?` 버튼으로 AI가 직역/의역·핵심 단어·문법을 분석해 표시 (결과는 캐시, 내용이 부정확할 수 있음)
- **컬러 테마** — 파스텔 / 화이트 / 다크

## 스크린샷

<img width="1468" height="938" alt="스크린샷 2026-06-23 225400" src="https://github.com/user-attachments/assets/b5fdd099-911e-4bf5-a7b9-cbc84d13d6b9" />
<img width="1465" height="945" alt="스크린샷 2026-06-23 225409" src="https://github.com/user-attachments/assets/6bb0ef52-1e8c-43aa-a3a8-b77d1666c39f" />
<img width="1465" height="932" alt="스크린샷 2026-06-23 225417" src="https://github.com/user-attachments/assets/0023c4bf-897c-48e7-ae48-a4ec4caccedc" />
<img width="1466" height="943" alt="스크린샷 2026-06-23 225510" src="https://github.com/user-attachments/assets/ee8d1d08-0338-4564-a797-519efe3d7a7a" />

---

## AI 기능과 API 키

한글 발음 변환·단어 뜻 번역·가사 줄 분석은 Anthropic API 키가 필요합니다.

- 처음 사용할 때 키 입력 모달이 뜹니다 — [Anthropic Console](https://console.anthropic.com/)에서 발급
- 키는 기기에 암호화되어 로컬 저장되며 외부로 전송되지 않습니다
- 변환 결과는 로컬에 캐시되어 같은 내용에 API를 다시 호출하지 않습니다
- 비용은 Claude Haiku 기준 곡당 약 $0.002 (약 3원) 수준입니다

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| 프레임워크 | Electron 29 + React 18 + TypeScript |
| 빌드 | electron-vite |
| 히라가나 변환 | kuroshiro + kuroshiro-analyzer-kuromoji |
| 한글 발음 변환 | Claude AI API (claude-haiku, 사용자 API 키 필요) |
| 데이터 저장 | JSON 파일 (`%APPDATA%\jpop-lyrics-app\`) |
| UI | 레트로 픽셀 스타일 (PF Stardust 3.0 / Noto Sans JP) |

---

## 개발

```bash
npm install        # 의존성 설치
npm run dev        # 개발 서버 실행 (cmd 권장)
npm run package    # 배포용 빌드 (관리자 권한 cmd) → dist/ 폴더에 생성
```

> **Windows 주의사항** — 시스템 환경변수에 `ELECTRON_RUN_AS_NODE=1`이 설정되어 있으면 앱이 실행되지 않습니다. 해당 항목을 삭제한 뒤 실행하세요.

---

## 데이터 위치

저장된 노래와 단어장은 `%APPDATA%\jpop-lyrics-app\jpop-lyrics-data.json`에 저장됩니다.  
다른 PC로 이전하려면 이 파일을 복사하면 됩니다.
