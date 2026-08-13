import sajuCat from '../../assets/saju-cat.png'

export default function Toast({ toast }) {
  if (!toast) return null

  return (
    <div
      className={`toast toast--cat${toast.leaving ? ' toast--leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <p key={`bubble-${toast.id}`} className="toast-bubble">
        {toast.message}
      </p>
      <div key={`cat-${toast.id}`} className="toast-cat-stage">
        <img className="toast-cat" src={sajuCat} alt="" width={160} height={160} />
      </div>
    </div>
  )
}
