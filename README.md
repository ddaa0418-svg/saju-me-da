# 사주 해석

출생 정보를 입력하면 Gemini AI가 사주를 해석해 주는 웹 서비스입니다.

## 기능

- 이름, 생년월일, 태어난 시간, 성별, 양력/음력 입력
- Gemini Interactions API (`gemini-3.6-flash`)로 사주 분석
- 결과 구성
  - 한줄 요약
  - 상세 해석 (명식·성격·기질·재능)
  - 오늘의 운세
  - `{이름}님 행운을 빌어요 🍀`
- 분석 중 고양이 애니메이션과 “사주 풀이 중…” 안내

## 기술 스택

- React 19 + Vite 8
- Google Gemini Interactions API
- CSS (연보라 테마)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. API 키 설정

프로젝트 루트에 `.env` 파일을 만들고 Gemini API 키를 넣습니다.

```env
VITE_GEMINI_API_KEY=여기에_API_키_입력
```

API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급받을 수 있습니다.  
`.env`는 Git에 올라가지 않도록 `.gitignore`에 포함되어 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

### 4. 빌드

```bash
npm run build
npm run preview
```

## 프로젝트 구조

```text
src/
  App.jsx              # 입력 폼 · API 호출 · 결과 화면
  buildSajuPrompt.js   # 사주 해석 프롬프트
  App.css              # UI 스타일
  index.css            # 전역 스타일 · 색상
  assets/saju-cat.png  # 고양이 마스코트
```

## 사용 방법

1. 출생 정보를 모두 입력합니다.
2. **사주 보기**를 누릅니다.
3. 분석이 끝나면 한줄 요약, 상세 해석, 오늘의 운세가 표시됩니다.

## 참고

- 프론트엔드에서 `VITE_` 환경 변수를 사용하므로, 배포 시 API 키 노출에 주의하세요.
- 학습·데모 목적이라면 현재 구조로 충분하고, 실서비스에서는 백엔드 프록시를 두는 것을 권장합니다.
