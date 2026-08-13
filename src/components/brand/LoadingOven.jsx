import { useEffect, useState } from 'react'
import bakingCat from '../../assets/saju-cat-baking.png'

const LOADING_LINES = [
  '식빵 굽는 중. 사주도 같이 익히는 중이다냥.',
  '오븐 예열 끝. 명식부터 정리한다.',
  '겉은 바삭하게, 해석은 팩트로. 조금만 기다려.',
]

export default function LoadingOven() {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % LOADING_LINES.length)
    }, 2400)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="loading-oven" aria-live="polite" aria-busy="true">
      <div className="loading-oven-stage">
        <span className="loading-oven-glow" aria-hidden="true" />
        <span className="loading-oven-steam" aria-hidden="true" />
        <span className="loading-oven-steam loading-oven-steam--delay" aria-hidden="true" />
        <img
          className="loading-oven-cat"
          src={bakingCat}
          alt=""
          width={280}
          height={280}
        />
      </div>
      <p className="loading-text">{LOADING_LINES[lineIndex]}</p>
    </div>
  )
}
