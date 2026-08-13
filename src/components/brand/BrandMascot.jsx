import sajuCat from '../../assets/saju-cat.png'

export default function BrandMascot() {
  return (
    <div className="brand-mascot">
      <img
        className="brand-mascot-img"
        src={sajuCat}
        alt="사주 해석 전문 뚱냥이"
        width={360}
        height={360}
      />
    </div>
  )
}
