/* global React */
const { useMemo: useMemoTpl, useState: useStateTpl } = React;

/* ======================================================
   페이지 데이터 정규화 + 타입별 컴포넌트
   ====================================================== */

const TYPE_LABELS = {
  cover: '표지',
  start: '시작',
  middle: '중간',
  climax: '✨ 빛나는 순간',
  end: '끝',
  author: '작가',
};

// 그림이 있는지 — base64 data URI 또는 우리 Storage 공개 URL 둘 다 인정
// (업로드 시 extractAndUploadImages가 base64를 Storage URL로 교체하므로 둘 다 나옴)
const PB_STORAGE_PREFIX = 'https://ipjdoabdjuuieuojvryl.supabase.co/storage/v1/object/public/book-images/';
function hasDrawing(p) {
  const d = p?.drawing;
  if (typeof d !== 'string' || d.length === 0) return false;
  return d.startsWith('data:image/') || d.startsWith(PB_STORAGE_PREFIX);
}

function normalizeBook(data) {
  if (!data) return null;
  const pages = (data.pages || []).slice().sort((a, b) => (a.page || 0) - (b.page || 0));
  const hasAuthor = pages.some((p) => p.type === 'author');
  if (!hasAuthor && data.author) {
    pages.push({ page: pages.length + 1, type: 'author', label: '작가', ...data.author });
  }
  return {
    student: data.student || {},
    author: data.author || {},
    meta: data.meta || {},
    pages,
  };
}

/* ---------- 그림 슬롯 (클릭 확대 지원) ---------- */
function ImageSlot({ page, label, onZoom }) {
  if (hasDrawing(page)) {
    return (
      <div
        className="page-image is-clickable"
        onClick={(e) => { e.stopPropagation(); onZoom && onZoom(page.drawing, page.prompt || page.label); }}
        role="button"
        tabIndex={0}
        title="클릭해서 크게 보기"
      >
        <img src={page.drawing} alt={page.prompt || page.label || ''} />
        <div className="page-image-zoom-hint">🔍</div>
      </div>
    );
  }
  return (
    <div className="page-image">
      <div className="image-placeholder">
        <div>
          <div className="image-placeholder-icon">🎨</div>
          <div className="image-placeholder-text">{page.prompt || page.guide || '그림이 들어갈 자리'}</div>
          {label && <div className="image-placeholder-name">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- 표지 — 4가지 템플릿 ---------- */
function CoverPage({ book, variant = 'classic', onZoom }) {
  const s = book.student || {};
  const lps = (s.learnerProfiles || []).filter(Boolean);
  const primary = s.learnerProfilePrimary;
  const coverPage = book.pages.find((p) => p.type === 'cover');
  const hasImg = coverPage && hasDrawing(coverPage);

  if (variant === 'fullbleed') {
    return (
      <div className="cover cover-fullbleed">
        {hasImg && <img className="cover-fullbleed-img" src={coverPage.drawing} alt="" />}
        <div className="cover-fullbleed-overlay">
          <p className="cover-tag">📖 나의 그림책</p>
          <h1 className="cover-title">{s.title || '제목 없는 그림책'}</h1>
          {s.protagonist && <span className="cover-subtitle">주인공 · {s.protagonist}</span>}
          <div className="cover-credit"><p className="cover-author-name">글·그림 {s.name || ''}{s.class ? ` · ${s.class}반` : ''}</p></div>
        </div>
      </div>
    );
  }

  if (variant === 'split') {
    return (
      <div className="cover cover-split">
        <div className="cover-split-image">
          {hasImg ? <img src={coverPage.drawing} alt="" /> : <div className="cover-split-placeholder">📚</div>}
        </div>
        <div className="cover-split-text">
          <p className="cover-tag">{s.class ? `${s.class}반의 그림책` : '나의 그림책'}</p>
          <h1 className="cover-title">{s.title || '제목 없는 그림책'}</h1>
          {s.protagonist && <p className="cover-subtitle">— {s.protagonist}의 이야기 —</p>}
          {lps.length > 0 && (
            <div className="lp-badges">
              {lps.map((lp, i) => (
                <span key={i} className={`lp-badge ${lp === primary ? 'primary' : ''}`}>{lp === primary ? '⭐ ' : ''}{lp}</span>
              ))}
            </div>
          )}
          <div className="cover-credit"><p className="cover-credit-label">글 · 그림</p><p className="cover-author-name">{s.name || '작가'}</p></div>
        </div>
      </div>
    );
  }

  if (variant === 'frame') {
    return (
      <div className="cover cover-frame">
        <div className="cover-frame-deco">
          <p className="cover-tag">📖 나의 그림책</p>
          <h1 className="cover-title">{s.title || '제목 없는 그림책'}</h1>
          {s.protagonist && <span className="cover-subtitle">주인공 · {s.protagonist}</span>}
        </div>
        <div className="cover-frame-image">
          {hasImg ? <img src={coverPage.drawing} alt="" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 64 }}>📚</div>}
        </div>
        {lps.length > 0 && (
          <div className="lp-badges">
            {lps.slice(0, 4).map((lp, i) => (
              <span key={i} className={`lp-badge ${lp === primary ? 'primary' : ''}`}>{lp === primary ? '⭐ ' : ''}{lp}</span>
            ))}
          </div>
        )}
        <div className="cover-credit"><p className="cover-credit-label">글 · 그림</p><p className="cover-author-name">{s.name || '작가'}{s.class ? ` · ${s.class}반` : ''}</p></div>
      </div>
    );
  }

  // 'classic' (기본)
  return (
    <div className="cover">
      <p className="cover-tag">📖 나의 그림책</p>
      <div className="cover-title-block">
        <h1 className="cover-title">{s.title || '제목 없는 그림책'}</h1>
        {s.protagonist && <span className="cover-subtitle">주인공 · {s.protagonist}</span>}
      </div>
      {hasImg ? (
        <div className="cover-image"><img src={coverPage.drawing} alt="표지 그림" /></div>
      ) : (
        <div className="cover-image" style={{ display: 'grid', placeItems: 'center', fontSize: 64, background: 'var(--accent-soft)' }}>📚</div>
      )}
      {lps.length > 0 && (
        <div className="lp-badges">
          {lps.map((lp, i) => (
            <span key={i} className={`lp-badge ${lp === primary ? 'primary' : ''}`}>{lp === primary ? '⭐ ' : ''}{lp}</span>
          ))}
        </div>
      )}
      <div className="cover-credit">
        <p className="cover-credit-label">글 · 그림</p>
        <p className="cover-author-name">{s.name || '작가'}{s.class ? ` · ${s.class}반` : ''}</p>
      </div>
    </div>
  );
}

/* ---------- 작가 페이지 ---------- */
function AuthorPage({ book }) {
  const a = book.author || {};
  const s = book.student || {};
  return (
    <div className="author-page">
      <div className="author-portrait">✍️</div>
      <p className="author-greeting">작가의 말</p>
      <h2 className="author-name-big">{a.name || s.name}</h2>
      {a.message && <p className="author-message">{a.message}</p>}
      {!a.message && <p className="author-message" style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>이 책을 만들어 준 {a.name || s.name || '나'}의 이야기였어요.</p>}
      {a.dedicationTo && <p className="author-dedication">— {a.dedicationTo}에게 —</p>}
    </div>
  );
}

/* ---------- 일반 페이지 — type별 시각 차별화 ---------- */
function StoryPage({ page, layout, total, onZoom }) {
  const eff = layout === 'spread' ? 'classic' : layout;
  const typeClass = `is-${page.type || 'middle'}`;

  return (
    <div className={`page-content layout-${eff} ${typeClass}`}>
      {page.type === 'climax' && <div className="climax-sparkles" aria-hidden>✨</div>}
      {page.type === 'end' && <div className="end-flourish" aria-hidden>꽃</div>}
      {(eff === 'classic' || eff === 'gallery' || eff === 'immersive') && (
        <ImageSlot page={page} label={page.label} onZoom={onZoom} />
      )}
      <div className="page-text-block">
        <div className="page-meta-row">
          <span className={`page-type-tag tag-${page.type || 'middle'}`}>{TYPE_LABELS[page.type] || page.label}</span>
          {page.prompt && <p className="page-prompt">{page.prompt}</p>}
        </div>
        <div className="page-text">{page.text || ' '}</div>
      </div>
      <span className="page-number">{page.page} / {total}</span>
    </div>
  );
}

/* ---------- 펼침면 (spread) 분리 ---------- */
function SpreadImage({ page, onZoom }) {
  const typeClass = `is-${page.type || 'middle'}`;
  return (
    <div className={`page-content layout-spread-image ${typeClass}`} style={{ padding: 0, height: '100%' }}>
      <ImageSlot page={page} label={page.label} onZoom={onZoom} />
    </div>
  );
}
function SpreadText({ page, total }) {
  const typeClass = `is-${page.type || 'middle'}`;
  return (
    <div className={`page-content layout-typography ${typeClass}`}>
      {page.type === 'climax' && <div className="climax-sparkles" aria-hidden>✨</div>}
      <span className={`page-type-tag tag-${page.type || 'middle'}`}>{TYPE_LABELS[page.type] || page.label}</span>
      {page.prompt && <p className="page-prompt">{page.prompt}</p>}
      <div className="page-text" style={{ textAlign: 'left', maxWidth: '100%' }}>{page.text || ' '}</div>
      <span className="page-number">{page.page} / {total}</span>
    </div>
  );
}

/* ---------- 페이지 라우터 ---------- */
function PageRenderer({ page, book, layout, kind = 'full', total, coverVariant, onZoom }) {
  if (!page) return <div className="page-content" />;
  if (page.type === 'cover' || kind === 'cover') return <CoverPage book={book} variant={coverVariant} onZoom={onZoom} />;
  if (page.type === 'author' || kind === 'author') return <AuthorPage book={book} />;
  if (kind === 'spread-image') return <SpreadImage page={page} onZoom={onZoom} />;
  if (kind === 'spread-text') return <SpreadText page={page} total={total} />;
  return <StoryPage page={page} layout={layout} total={total} onZoom={onZoom} />;
}

/* ---------- 그림 확대 모달 ---------- */
function ZoomModal({ src, caption, onClose }) {
  if (!src) return null;
  return (
    <div className="zoom-modal" onClick={onClose} role="dialog">
      <button className="zoom-close" aria-label="닫기" onClick={onClose}>×</button>
      <img src={src} alt={caption || ''} onClick={(e) => e.stopPropagation()} />
      {caption && <div className="zoom-caption">{caption}</div>}
    </div>
  );
}

window.PageRenderer = PageRenderer;
window.normalizeBook = normalizeBook;
window.hasDrawing = hasDrawing;
window.ZoomModal = ZoomModal;
