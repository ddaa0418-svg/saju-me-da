import BrandMascot from './BrandMascot'

export default function BrandHeader({
  loading = false,
  readingCount = null,
  tagline,
  loadingTagline,
}) {
  return (
    <header className="brand">
      {loading ? null : <BrandMascot />}
      <h1>사주 해석</h1>
      <p className="brand-tagline">
        {loading ? loadingTagline || tagline : tagline}
      </p>
      {readingCount > 0 ? (
        <p className="brand-stat">
          지금까지 총{' '}
          <span>{readingCount.toLocaleString('ko-KR')}</span>
          개의 사주가 생성되었습니다.
        </p>
      ) : null}
    </header>
  )
}
