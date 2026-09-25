import { useEffect, useId, useRef, useState } from 'react';

function Star({ fill = 0 }) {
  const shape = '12,2 15.1,8.3 22,9.3 17,14.2 18.2,21.1 12,17.8 5.8,21.1 7,14.2 2,9.3 8.9,8.3';
  return (
    <span className="rating-star" aria-hidden="true">
      <svg viewBox="0 0 24 24"><polygon points={shape} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      <svg viewBox="0 0 24 24" style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}><polygon points={shape} fill="currentColor" /></svg>
    </span>
  );
}

// Existing 1–10 scores represent half-star steps (7 = 3.5 stars).
export default function StarRating({ title, rating, onChange }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const panelId = useId();
  const value = preview ?? rating ?? 0;

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!root.current?.contains(event.target)) { setOpen(false); setPreview(null); }
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  async function choose(next) {
    setSaving(true);
    try {
      const saved = await onChange(next);
      if (saved !== false) { setOpen(false); trigger.current?.focus(); }
    } finally { setSaving(false); setPreview(null); }
  }

  return (
    <div className="star-rating" ref={root} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); setPreview(null); trigger.current?.focus(); }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setPreview(null); }
    }}>
      <button type="button" className="rating-trigger" ref={trigger} aria-expanded={open} aria-controls={panelId}
        aria-label={`Rate ${title}${rating ? `, ${rating / 2} out of 5 stars` : ', not rated'}`}
        onClick={() => { setOpen(!open); setPreview(null); }}>
        <Star fill={1} />
        {rating ? <span>{rating / 2}/5</span> : null}
      </button>
      {open ? (
        <div className="rating-panel" id={panelId} role="group" aria-label={`Rating for ${title}`} aria-busy={saving}>
          <div className="rating-options" onMouseLeave={() => setPreview(null)}>
            {Array.from({ length: 5 }, (_, index) => (
              <span className="rating-choice" key={index}>
                <Star fill={Math.max(0, Math.min(1, (value - index * 2) / 2))} />
                {[1, 2].map((half) => {
                  const score = index * 2 + half;
                  return <button key={half} type="button" className={`rating-half half-${half}`} disabled={saving}
                    aria-label={`${score / 2} out of 5 stars`} aria-pressed={rating === score}
                    onMouseEnter={() => setPreview(score)} onFocus={() => setPreview(score)} onBlur={() => setPreview(null)}
                    onClick={() => choose(score)} />;
                })}
              </span>
            ))}
          </div>
          <div className="rating-caption" aria-live="polite">{saving ? 'Saving…' : value ? `${value / 2} out of 5` : 'Choose half or full stars'}</div>
          {rating ? <button type="button" className="link" disabled={saving} onClick={() => choose(null)}>Clear rating</button> : null}
        </div>
      ) : null}
    </div>
  );
}
