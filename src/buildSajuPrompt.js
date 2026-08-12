export function buildSajuPrompt({ name, birth, time, gender, calendar, today }) {
  return `반드시 한국어 JSON만 출력하세요. 마크다운·설명·축복 문구는 넣지 마세요.

당신은 사주 해석 전문가입니다. 명식을 먼저 짧게 정리한 뒤 해석하세요.

오늘: ${today}
이름: ${name} / 생년월일: ${birth} / 시간: ${time} / 성별: ${gender} / ${calendar}

{
  "summary": "사주 한줄 요약 1문장",
  "detail": "명식 요약(년주·월주·일주·시주·오행) 1~2문장 + 성격·기질·재능 해석 3문장. 장점과 약점 포함",
  "todayFortune": "오늘의 운세 1~2문장"
}`
}
