# 사주미

생년월일과 태어난 시간으로 사주를 해석해 주는 AI 사주 서비스입니다.  
고양이 점술가가 해라체·냥 말투로 한줄 요약, 상세 해석, 오늘의 운세를 알려 줍니다.

- 서비스: [https://saju-me-da.vercel.app](https://saju-me-da.vercel.app)

## 기능

- 이름, 생년월일, 태어난 시간, 성별, 양력/음력 입력
- Gemini Interactions API (`gemini-3.1-flash-lite`)로 사주 분석
- 결과 구성
  - 한줄 요약
  - 상세 해석 (성격·기질, 특이한 점, 약점, 재능)
  - 오늘의 운세
- 비회원도 사주를 볼 수 있고, 상세 해석 일부는 Google 로그인 후 이어서 확인
- Google 로그인 후 내 사주 저장, 수정, 삭제
- 다른 사람 사주도 저장해 두고 다시 보기
- 저장된 결과를 `/result/:id` 링크로 공유 (로그인 없이 열람)
- 분석 중 식빵 오븐 로딩과 고양이 마스코트

## 기술 스택

- React 19 + Vite 8
- Google Gemini Interactions API
- Supabase (Google OAuth, 사주 저장, 공개 공유 RPC)
- Vercel (SPA rewrite)
- Google Analytics 4

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 값을 넣습니다. `.env.example`을 복사해도 됩니다.

```env
VITE_GEMINI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- Gemini API 키: [Google AI Studio](https://aistudio.google.com/apikey)
- Supabase URL / anon key: 프로젝트 Settings → API Keys
- `.env`는 Git에 올라가지 않습니다.

Google 로그인을 쓰려면 Supabase Authentication에서 Google provider를 켜고, Redirect URL에 로컬·배포 origin을 등록해야 합니다.

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
  App.jsx                      # 레이아웃 조립
  App.css                      # 화면 스타일
  main.jsx                     # 앱 / 공유 페이지 분기
  api/gemini.js                # Gemini 호출
  hooks/useSajuApp.js          # 입력·인증·저장 상태
  lib/supabase.js              # 로그인, CRUD, 공유 조회
  lib/analytics.js             # GA 이벤트
  pages/SharedResultPage.jsx   # /result/:id 공개 결과
  components/
    brand/                     # 제목, 마스코트, 로딩
    form/                      # 출생 정보 입력
    layout/                    # 사이드바, 탭, 토스트
    profile/                   # 프로필 수정
    saju/                      # 폼, 결과, 공유 버튼
  utils/
    buildSajuPrompt.js         # 사주 해석 프롬프트
    shareSaju.js               # 공유 URL · Web Share
    nyangSpeech.js             # 냥 말투 보정
vercel.json                    # Vercel SPA 라우팅
```

## 사용 방법

1. 출생 정보를 입력하고 **사주 보기**를 누릅니다.
2. 분석이 끝나면 한줄 요약과 상세 해석이 나옵니다.
3. Google로 로그인하면 결과를 저장하고, 잠긴 해석까지 이어서 봅니다.
4. **내 사주**와 **다른 사람** 탭으로 저장된 사주를 오갑니다.
5. **친구에게 공유하기**로 결과 링크를 보냅니다.

로컬에서 공유하면 링크가 `http://localhost:...` 로 만들어집니다.  
다른 사람이 열려면 배포된 사이트에서 공유하세요.

## 배포

Vercel에 올린 뒤 같은 `VITE_` 환경 변수를 설정합니다.  
`vercel.json`이 `/result/:id` 같은 경로를 `index.html`로 넘기므로, 공유 링크가 새로고침되어도 열립니다.

## 참고

- 프론트엔드에서 `VITE_` 환경 변수를 사용하므로, 배포 시 API 키 노출에 주의하세요.
- 학습·데모 목적이라면 현재 구조로 충분하고, 실서비스에서는 Gemini 호출을 백엔드 프록시로 두는 것을 권장합니다.
