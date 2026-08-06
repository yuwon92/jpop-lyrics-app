# Ctrl+E 기본형 추천 기능 구현 계획

## 목표

가사에서 일본어 단어를 드래그한 뒤 `Ctrl+E`를 누르면 단어장 추가 모달이 열린다. 선택한 단어가 활용형이면 형태소 분석으로 기본형을 찾아 **추천값**으로 채운다.

- 예: `食べました` 선택 → `食べる` 추천, 읽기 `たべる` 자동 입력
- 사용자는 원래 선택한 `食べました`를 유지하거나 직접 수정할 수 있다.
- 사전 또는 AI 없이 기본형 추천이 동작한다.
- 기존 `Ctrl+E` 단축키와 단어장 추가 기능은 분석 실패 시에도 그대로 동작한다.

## 사용자 경험

| 상황 | 모달 동작 |
| --- | --- |
| `食べました` 선택 | 단어 필드에 `食べる`을 입력하고, 원문과 추천 기본형을 표시 |
| `高かった` 선택 | 단어 필드에 `高い`를 입력 |
| `愛` 선택 | 원문 `愛`를 입력하며 추천 안내는 표시하지 않음 |
| `夜に駆ける`처럼 여러 단어 선택 | 원문을 유지하고 자동 치환하지 않음 |
| 분석기 오류 또는 초기화 실패 | 원문을 유지하고 기존 단어장 추가 흐름을 계속 진행 |

활용형이 추천된 경우 모달의 단어 필드 위에 아래 정보를 표시한다.

```text
선택한 형태: 食べました
추천 기본형: 食べる  [원문 사용]
```

`원문 사용`을 누르면 단어 필드는 원문으로 바뀌고, 버튼은 `기본형 추천 사용`으로 바뀐다. 사용자가 직접 수정한 값은 자동으로 덮어쓰지 않는다.

## 구현 범위

### 1. 형태소 분석기 추가

현재 `kuroshiro-analyzer-kuromoji`는 후리가나 변환에 사용된다. 기본형(`basic_form`)을 안정적으로 얻기 위해 `kuromoji`를 직접 의존성에 추가한다.

- `package.json`에 `kuromoji`와 타입 정의를 추가한다.
- Electron 메인 프로세스에서 tokenizer를 앱 시작 시 한 번 초기화한다.
- tokenizer 초기화 실패는 앱 실행을 막지 않고, 추천 기능만 비활성화한다.

### 2. 기본형 추천 모듈

`src/main/lemma-handler.ts`를 새로 만든다.

입력과 반환 형식:

```ts
type LemmaRecommendation = {
  selected: string
  lemma: string
  reading: string
  suggested: boolean
}
```

추천 규칙:

1. 선택 텍스트 앞뒤 공백을 제거한다.
2. tokenizer로 분석한다.
3. 자립어 하나만 선택됐고 `basic_form`이 유효하며 원문과 다르면 기본형을 추천한다.
4. `basic_form`이 `*`, 빈 문자열, 또는 원문과 같으면 원문을 유지한다.
5. 조사·기호 등 단독 선택, 여러 자립어가 포함된 선택, 분석 실패는 원문을 유지한다.
6. 읽기는 기본형을 기준으로 반환한다. 읽기가 없는 경우 기존 후리가나 변환으로 보완한다.

### 3. IPC 및 preload 연결

메인 프로세스에 `japanese:recommend-lemma` IPC 핸들러를 등록한다.

`src/preload/index.ts`에 다음 API를 노출한다.

```ts
japanese: {
  recommendLemma: (text: string): Promise<LemmaRecommendation>
}
```

렌더러는 tokenizer나 Node API에 직접 접근하지 않고 preload API만 사용한다.

### 4. Ctrl+E 열기 흐름 변경

`src/renderer/src/pages/LyricsEditor.tsx`의 `openWordModal()`을 비동기 흐름으로 바꾼다.

1. 기존 방식으로 선택 텍스트를 가져온다.
2. `window.api.japanese.recommendLemma(selectedText)`를 호출한다.
3. 성공 시 추천 결과를 모달 상태에 저장하고 모달을 연다.
4. 실패 시 선택 텍스트를 `initialWord`로 사용해 모달을 연다.

`Ctrl+E` 키 조합, 선택 힌트, 플로팅 추가 버튼은 유지한다. 플로팅 추가 버튼과 단어장 화면의 일반 추가는 기본형 추천을 적용하지 않는다.

### 5. 단어장 추가 모달 확장

`src/renderer/src/components/vocabulary/AddWordModal.tsx`에 아래 props를 선택적으로 추가한다.

```ts
selectedWord?: string
lemmaSuggested?: boolean
```

추가 사항:

- 추천 상태 안내와 원문/기본형 전환 버튼을 표시한다.
- 추천 기본형을 `initialWord`로 사용한다.
- 원문/기본형 전환 시 읽기와 뜻 자동 채우기를 해당 단어 기준으로 다시 실행한다.
- 편집 모달(`initialMeaning`이 있는 경우)에는 추천 안내를 표시하지 않는다.
- 모달을 닫거나 새로운 선택으로 열면 진행 중인 비동기 요청 결과가 이전 모달을 덮어쓰지 않게 취소 처리한다.

### 6. 자동 읽기·뜻 채우기 연동

현재 `AddWordModal`은 `initialWord`를 기준으로 읽기 변환과 API 키가 있을 때 한국어 뜻 자동 번역을 수행한다.

- 추천 기본형을 첫 입력값으로 전달해 기본형의 읽기와 뜻이 채워지게 한다.
- 사용자가 원문으로 전환하면 원문 기준으로 다시 요청한다.
- API 키가 없으면 뜻은 비워 두고, 기본형 추천만 정상 동작해야 한다.

## 수정 대상 파일

| 파일 | 변경 내용 |
| --- | --- |
| `package.json` | `kuromoji` 직접 의존성 및 타입 정의 추가 |
| `src/main/lemma-handler.ts` | tokenizer 초기화, 기본형 추천, IPC 핸들러 구현 |
| `src/main/index.ts` | 기본형 추천 모듈 초기화 및 핸들러 등록 |
| `src/preload/index.ts` | `window.api.japanese.recommendLemma` 노출 |
| `src/renderer/src/pages/LyricsEditor.tsx` | Ctrl+E 선택어를 기본형 추천 후 모달에 전달 |
| `src/renderer/src/components/vocabulary/AddWordModal.tsx` | 추천 안내, 원문/기본형 전환, 자동 채우기 재실행 |
| `src/renderer/src/components/vocabulary/AddWordModal.css` | 추천 안내 영역과 전환 버튼 스타일 |

## 검증 기준

### 자동 테스트

- `食べました`가 `食べる`로 추천된다.
- `飲んで`가 `飲む`로 추천된다.
- `高かった`가 `高い`로 추천된다.
- `愛`는 추천 상태가 아닌 원문 유지 결과를 반환한다.
- 여러 자립어가 포함된 `夜に駆ける`는 원문을 유지한다.
- tokenizer 실패 시 원문 유지 결과를 반환한다.

### 수동 확인

- 가사에서 드래그 후 `Ctrl+E`로 모달이 열린다.
- 추천 기본형, 읽기, 뜻이 기본형 기준으로 자동 채워진다.
- `원문 사용`과 `기본형 추천 사용` 전환이 정상 동작한다.
- 단어 필드를 직접 수정한 뒤에는 비동기 응답이 값을 덮어쓰지 않는다.
- API 키가 없어도 기본형 추천 및 단어장 저장이 가능하다.
- `npm run typecheck`와 `npm test`를 통과한다.
- 패키징 빌드에서 kuromoji의 사전 파일이 정상 로드된다.

## 완료 조건

`Ctrl+E`로 추가하는 활용형 단어가 기본형으로 추천되고, 사용자가 원문과 기본형을 선택할 수 있으며, 분석 실패가 기존 단어장 추가 흐름을 막지 않는다.
