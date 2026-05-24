# J-Pop 가사 번역 앱 구현 계획

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Electron + React (TypeScript) | PC 데스크톱 앱, 크로스플랫폼, 풍부한 UI 생태계 |
| 스타일링 | CSS Modules + 커스텀 CSS | 픽셀 레트로 UI는 Tailwind보다 직접 작성이 유리 |
| 데이터베이스 | SQLite (better-sqlite3) | 로컬 저장, 설치 불필요, 가볍고 빠름 |
| 히라가나 변환 | kuroshiro + kuromoji | 한자 → 히라가나 자동 변환 라이브러리 |
| 번들러 | Vite + electron-vite | 빠른 개발 환경 |
| 빌드 | electron-builder | Windows 설치 파일(.exe) 패키징 |

---

## 프로젝트 구조

```
jpop-lyrics-app/
├── src/
│   ├── main/                    # Electron 메인 프로세스 (Node.js)
│   │   ├── index.ts             # Electron 앱 진입점
│   │   ├── database.ts          # SQLite DB 초기화 및 쿼리
│   │   └── ipc-handlers.ts      # 렌더러 ↔ 메인 통신 핸들러
│   ├── preload/
│   │   └── index.ts             # 보안 브릿지 (contextBridge)
│   └── renderer/                # React 프론트엔드
│       ├── App.tsx              # 루트 컴포넌트, 라우팅
│       ├── pages/
│       │   ├── Home.tsx         # 저장된 노래 목록
│       │   ├── LyricsEditor.tsx # 가사 편집 메인 화면
│       │   └── Vocabulary.tsx   # 단어장 화면
│       ├── components/
│       │   ├── layout/
│       │   │   ├── MenuBar.tsx          # 상단 레트로 OS 메뉴바
│       │   │   └── RetroWindow.tsx      # 창문형 카드 컴포넌트 (공통)
│       │   ├── lyrics/
│       │   │   ├── LyricsInput.tsx      # 일본어 가사 붙여넣기 입력창
│       │   │   ├── LyricsRow.tsx        # 한 줄: [원문 / 히라가나 / 번역]
│       │   │   └── LyricsDisplay.tsx    # 전체 가사 렌더링
│       │   ├── vocabulary/
│       │   │   ├── AddWordModal.tsx     # [+] 버튼 → 단어 추가 모달
│       │   │   ├── FloatingAddButton.tsx # 우하단 고정 [+] 버튼
│       │   │   ├── WordCard.tsx         # 단어 카드 (단어 + 뜻)
│       │   │   └── VocabFilter.tsx      # 노래별/전체 탭 필터
│       │   └── shared/
│       │       ├── PixelButton.tsx      # 레트로 버튼 공통 컴포넌트
│       │       ├── PixelInput.tsx       # 레트로 입력창 공통 컴포넌트
│       │       └── TabMenu.tsx          # 탭 메뉴
│       ├── hooks/
│       │   ├── useSongs.ts              # 노래 CRUD 훅
│       │   └── useVocabulary.ts         # 단어장 CRUD 훅
│       ├── styles/
│       │   ├── global.css               # 전역 스타일, CSS 변수(컬러 팔레트)
│       │   ├── retro.css                # 픽셀 테두리, 레트로 컴포넌트 공통
│       │   └── fonts.css                # 폰트 임포트
│       └── types/
│           └── index.ts                 # Song, LyricLine, VocabWord 타입
├── electron.vite.config.ts
├── electron-builder.config.js
└── package.json
```

---

## 데이터 모델 (SQLite 스키마)

```sql
-- 저장된 노래
CREATE TABLE songs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  artist    TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 가사 라인 (노래 1개당 N개)
CREATE TABLE lyric_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id     INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  line_index  INTEGER NOT NULL,        -- 순서
  original    TEXT NOT NULL,           -- 원래 일본어
  reading     TEXT,                    -- 히라가나 발음 (자동 생성)
  translation TEXT DEFAULT ''          -- 사용자 입력 번역
);

-- 단어장
CREATE TABLE vocabulary (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id   INTEGER REFERENCES songs(id) ON DELETE SET NULL,  -- null이면 전체 단어장
  word      TEXT NOT NULL,             -- 일본어 단어
  meaning   TEXT NOT NULL,             -- 뜻
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 화면별 기능 명세

### 1. Home (노래 목록)
- 저장된 노래 카드 그리드 표시
- 각 카드: 제목, 아티스트, 저장 날짜, 단어 수 뱃지
- [새 노래 번역 시작] 버튼 → LyricsEditor로 이동
- 노래 카드 클릭 → 해당 노래 이어서 편집

### 2. LyricsEditor (가사 편집)
- **Step 1**: 제목/아티스트 입력 + 일본어 가사 전체 붙여넣기
- **Step 2**: 줄바꿈 기준으로 라인 분리 → kuroshiro로 히라가나 자동 생성
- **Step 3**: 각 라인이 3행 구조로 렌더링됨
  ```
  ┌─────────────────────────────────┐
  │ 夜に駆ける                       │  ← 원문 (읽기 전용)
  │ よるにかける                     │  ← 히라가나 (읽기 전용)
  │ [번역을 입력하세요...]           │  ← 사용자 입력 (편집 가능)
  └─────────────────────────────────┘
  ```
- [저장] 버튼 → DB에 저장
- 우하단 [+] 버튼 → AddWordModal 오픈 (현재 노래 연결)

### 3. Vocabulary (단어장)
- 상단 탭: [전체 단어장] / [노래별]
- 노래별 탭 선택 시 드롭다운으로 노래 선택
- 단어 카드: 일본어 단어(크게) + 뜻(작게) + 출처 노래 태그
- 단어 삭제 버튼

### 4. AddWordModal (단어 추가)
- 일본어 단어 입력창
- 뜻 입력창  
- [저장] / [취소] 버튼
- 현재 편집 중인 노래에 자동 연결 (없으면 전체 단어장)

---

## 디자인 시스템

### 컬러 팔레트 (CSS 변수)
```css
--bg-primary:    #F8DDEB;
--bg-secondary:  #E7D8FF;
--bg-tertiary:   #D7ECFF;
--win-bg:        #FFF7FB;
--win-bg-alt:    #F4F0FF;
--border-dark:   #3D3552;
--border-mid:    #5B5272;
--accent-pink:   #F6A6C8;
--accent-lavender:#BBA7FF;
--accent-blue:   #A9D8FF;
--text-main:     #3B3450;
--text-muted:    #7A7190;
```

### 폰트
- 한국어 전용: `PfStardust30S` (픽셀 레트로 감성, 아래 @font-face 사용)
- 일본어: `Noto Sans JP` (Google Fonts, 가독성 우선)
- 영어/숫자: `PfStardust30S` 또는 `Noto Sans JP` 폴백

```css
@font-face {
    font-family: 'PfStardust30S';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/2506-1@1.0/PFStardustS.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
}
@font-face {
    font-family: 'PfStardust30S';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/2506-1@1.0/PFStardustSBold.woff2') format('woff2');
    font-weight: 700;
    font-display: swap;
}
@font-face {
    font-family: 'PfStardust30S';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/2506-1@1.0/PFStardustSExtraBold.woff2') format('woff2');
    font-weight: 800;
    font-display: swap;
}
```

```css
/* 전역 font-family 적용 전략 */
font-family: 'PfStardust30S', 'Noto Sans JP', sans-serif;
/* 일본어 원문/히라가나 라인만 별도 적용 */
font-family: 'Noto Sans JP', sans-serif;
```

### 레트로 창 컴포넌트 (RetroWindow)
```
┌─[♪]─ TITLE ────────────── [─][□][×]─┐
│                                       │
│  (content)                            │
│                                       │
└───────────────────────────────────────┘
```
- 2px solid 테두리 (#3D3552)
- 타이틀바 배경: accent-pink 또는 accent-lavender
- 창 배경: win-bg

### 픽셀 버튼
- 기본: 연한 배경 + 2px 하단/우측 dark 테두리 (입체감)
- hover: 배경색 살짝 진해짐
- active: 테두리 방향 반전 (눌리는 효과)

---

## 구현 단계

### Phase 1 — 프로젝트 세팅 (1단계)
- [ ] electron-vite로 Electron + React + TypeScript 프로젝트 초기화
- [ ] 폴더 구조 생성
- [ ] 컬러 팔레트 CSS 변수 설정
- [ ] 폰트 임포트 (Google Fonts)
- [ ] SQLite 연결 및 스키마 마이그레이션

### Phase 2 — 코어 컴포넌트 (2단계)
- [ ] RetroWindow, PixelButton, PixelInput 공통 컴포넌트
- [ ] MenuBar (상단 탭: 홈 / 번역 / 단어장)
- [ ] FloatingAddButton (우하단 고정)
- [ ] AddWordModal

### Phase 3 — 가사 편집 기능 (3단계)
- [ ] kuroshiro + kuromoji 연동 (메인 프로세스에서 실행)
- [ ] LyricsInput (가사 붙여넣기 영역)
- [ ] LyricsRow (원문/히라가나/번역 3행 컴포넌트)
- [ ] LyricsDisplay (전체 가사 렌더링)
- [ ] IPC: 히라가나 변환 요청/응답

### Phase 4 — 데이터 영속성 (4단계)
- [ ] IPC 핸들러: 노래 저장/불러오기/삭제
- [ ] IPC 핸들러: 단어장 CRUD
- [ ] useSongs, useVocabulary 훅

### Phase 5 — 단어장 화면 (5단계)
- [ ] VocabFilter 탭 (전체/노래별)
- [ ] WordCard 컴포넌트
- [ ] 노래별 필터링 로직

### Phase 6 — 홈 화면 & 마무리 (6단계)
- [ ] 노래 목록 홈 화면
- [ ] 전체 UI 픽셀 디자인 다듬기
- [ ] 반응형 레이아웃 점검
- [ ] electron-builder로 Windows .exe 패키징

---

## IPC 통신 채널 목록

| 채널 이름 | 방향 | 설명 |
|-----------|------|------|
| `convert-reading` | renderer → main | 일본어 텍스트 → 히라가나 변환 |
| `songs:get-all` | renderer → main | 전체 노래 목록 조회 |
| `songs:get-one` | renderer → main | 특정 노래 + 가사 조회 |
| `songs:save` | renderer → main | 노래 + 가사 저장 |
| `songs:delete` | renderer → main | 노래 삭제 |
| `vocab:get-all` | renderer → main | 전체 단어장 조회 |
| `vocab:get-by-song` | renderer → main | 노래별 단어장 조회 |
| `vocab:add` | renderer → main | 단어 추가 |
| `vocab:delete` | renderer → main | 단어 삭제 |
