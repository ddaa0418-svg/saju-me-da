import { toNyangSpeech } from '../utils/nyangSpeech'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export function hasGeminiKey() {
  return Boolean(API_KEY)
}

export async function askGemini(prompt) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        model: 'gemini-3.1-flash-lite',
        input: prompt,
        generation_config: {
          thinking_level: 'minimal',
          max_output_tokens: 1400,
          temperature: 0.7,
        },
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini API 요청에 실패했습니다.'
    throw new Error(message)
  }

  if (data.output_text) {
    return data.output_text
  }

  const texts = (data.steps || [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content || [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)

  const text = texts.join('\n').trim()
  if (!text) {
    throw new Error('Gemini 응답에서 텍스트를 찾지 못했습니다.')
  }

  return text
}

export function parseSajuResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { summary: '', detail: text, todayFortune: '' }
  }

  const parsed = JSON.parse(jsonMatch[0])
  return {
    summary: toNyangSpeech(parsed.summary || ''),
    detail: parsed.detail || text,
    todayFortune: toNyangSpeech(parsed.todayFortune || ''),
  }
}
