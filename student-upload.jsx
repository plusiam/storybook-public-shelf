// 학생 업로드 화면 — upload_code 입력 + 필명·작품 정보 + JSON 드래그
/* global React, PB */
const { useState: useStateUp, useEffect: useEffectUp, useCallback: useCallbackUp, useRef: useRefUp, useMemo: useMemoUp } = React;

/* ─── 헬퍼 ─────────────────────────────────────────────────────────── */

// URL hash의 쿼리(#/upload?y=2026-1)에서 학년도 자동 채움
function parseUploadQuery() {
  const hash = window.location.hash || '';
  const qIdx = hash.indexOf('?');
  if (qIdx < 0) return { school_year: '' };
  const params = new URLSearchParams(hash.slice(qIdx + 1));
  return { school_year: params.get('y') || '' };
}

function defaultSchoolYearStu() {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 3 && month <= 7) return `${year}-1`;
  if (month >= 8) return `${year}-2`;
  return `${year - 1}-2`;
}

// 흔한 한국어 실명 패턴 — 김민준, 이서연 같은 2~4자 한글
// 강제 차단은 아니고 학생에게 경고만. 서버 측 placeholder 검증은 별개.
function looksLikeRealName(s) {
  return /^[가-힣]{2,4}$/.test((s || '').trim());
}

/* ─── 성공 화면 ───────────────────────────────────────────────────── */

function UploadSuccess({ slug, penName, title, onUploadAnother }) {
  const url = `${window.location.origin}${window.location.pathname}#/b/${slug}`;
  const [copied, setCopied] = useStateUp(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      window.prompt('아래 주소를 복사해서 사용해 주세요', url);
    }
  };

  return (
    <div className="stu-success">
      <div className="stu-success-icon">🎉</div>
      <h2 className="stu-success-title">업로드 성공!</h2>
      <p className="stu-success-sub">
        <strong>{penName}</strong>의 그림책이 학급 작품집에 올라갔어요.
      </p>

      <div className="stu-success-link">
        <span className="stu-success-link-label">📲 내 책 단권 주소</span>
        <code className="stu-success-link-value">{url}</code>
        <button type="button" className="btn primary" onClick={copy}>
          {copied ? '✅ 복사됨' : '📋 복사하기'}
        </button>
      </div>

      <div className="stu-success-actions">
        <a className="btn" href={`#/b/${slug}`} target="_blank" rel="noopener noreferrer">
          🔗 내 책 펼쳐 보기
        </a>
        <button type="button" className="btn" onClick={onUploadAnother}>
          ＋ 다른 작품 더 올리기
        </button>
        <a className="btn" href="#/">
          🏠 홈으로
        </a>
      </div>

      <p className="stu-success-hint">
        💡 위 주소를 친구·가족에게 공유하면 책처럼 펼쳐서 볼 수 있어요.<br />
        학급 전체 작품집은 선생님이 알려주신 <strong>열람 코드</strong>로 들어갈 수 있어요.
      </p>
    </div>
  );
}

/* ─── 메인 — 학생 업로드 ──────────────────────────────────────────── */

function StudentUpload() {
  // URL 쿼리에서 학년도 자동 채움 (없으면 현재 학기 추정)
  const initial = useMemoUp(() => parseUploadQuery(), []);
  const [schoolYear, setSchoolYear] = useStateUp(
    initial.school_year || defaultSchoolYearStu()
  );

  const [uploadCode, setUploadCode] = useStateUp('');
  const [penName, setPenName] = useStateUp('');
  const [title, setTitle] = useStateUp('');
  const [intro, setIntro] = useStateUp('');

  const [file, setFile] = useStateUp(null);
  const [parsed, setParsed] = useStateUp(null);
  const [dragOver, setDragOver] = useStateUp(false);
  const inputRef = useRefUp(null);

  const [submitting, setSubmitting] = useStateUp(false);
  const [error, setError] = useStateUp(null);
  const [result, setResult] = useStateUp(null);

  const handleFile = useCallbackUp(async (f) => {
    if (!f) return;
    setError(null);
    setParsed(null);
    setFile(f);
    if (!f.name.toLowerCase().endsWith('.json')) {
      setError('JSON 파일이 아니에요. picturebook-storyboard에서 저장한 JSON을 올려주세요.');
      return;
    }
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!data?.pages || !Array.isArray(data.pages)) {
        throw new Error('그림책 데이터가 아니에요 (pages 배열이 없음)');
      }
      setParsed(data);
      // JSON에 들어 있는 student.title이 있으면 자동 채움. 단 student.name은 자동 채우지 않음(실명일 가능성).
      if (!title && data?.student?.title) setTitle(data.student.title);
      // 작품 안에 실명처럼 보이는 이름이 들어 있으면 미리 안내 (서버도 거부하지만 학생 친화 차원)
      const inName = (data?.student?.name || data?.author?.name || '').trim();
      if (inName && looksLikeRealName(inName)) {
        setError(`작품 안에 "${inName}"이라는 이름이 들어 있어요. picturebook-storyboard에서 이름 칸을 별명으로 바꾼 뒤 다시 저장해 올려주세요. (그대로 올리면 거부됩니다)`);
      }
    } catch (e) {
      setError(e?.message || '파일을 읽지 못했어요');
    }
  }, [title]);

  const onDrop = useCallbackUp((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const submit = async (e) => {
    e.preventDefault();
    if (!parsed) {
      setError('JSON 파일을 먼저 골라주세요');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { slug } = await PB.uploadStudentBook({
        uploadCode,
        schoolYear,
        penName,
        title,
        intro,
        data: parsed,
      });
      setResult({ slug, penName, title });
    } catch (err) {
      const msg = err?.message || '업로드에 실패했어요';
      const code = err?.code;
      if (code === 'P0001') {
        setError('업로드 코드가 맞지 않아요. 학년도·6자리 코드를 다시 확인해 주세요.');
      } else if (code === 'P0002') {
        setError('업로드 코드가 일시 잠겼어요. 선생님께 말씀드려 주세요.');
      } else if (code === 'P0003') {
        setError('필명을 다시 입력해 주세요. 실명이나 "학생/이름" 같은 단어는 쓸 수 없어요. (40자 이내)');
      } else if (code === 'P0006') {
        setError('책 데이터가 너무 크거나 형식이 잘못됐어요. 이미지 화질을 낮추거나 picturebook-storyboard에서 다시 저장해 주세요.');
      } else if (code === 'P0007') {
        setError('페이지 수가 맞지 않아요 (1~30장).');
      } else if (code === 'P0008') {
        setError('제목 또는 작가 소개가 너무 길어요 (각 80자 이내).');
      } else if (code === 'P0009') {
        setError('작품 안에 허용되지 않은 외부 이미지 주소가 들어 있어요. picturebook-storyboard에서 다시 저장한 JSON을 올려주세요.');
      } else if (code === 'P0010') {
        setError(msg); // 서버가 "실명으로 보이는 이름..." 같은 구체적 안내 메시지를 줌
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = useCallbackUp(() => {
    setResult(null);
    setFile(null);
    setParsed(null);
    setTitle('');
    setIntro('');
    setError(null);
    // upload_code, school_year, penName은 보존 (연속 업로드 편의)
  }, []);

  // 성공 화면
  if (result) {
    return (
      <div className="stu-scene">
        <UploadSuccess
          slug={result.slug}
          penName={result.penName}
          title={result.title}
          onUploadAnother={reset}
        />
      </div>
    );
  }

  const penWarn = penName && looksLikeRealName(penName);

  return (
    <div className="stu-scene">
      <form className="stu-form" onSubmit={submit}>
        <div className="stu-topbar">
          <a className="btn btn-sm" href="#/" aria-label="홈으로">← 홈</a>
        </div>
        <header className="stu-header">
          <span className="stu-tag">✍️ 작가로 등록하기</span>
          <h1 className="stu-title">내가 만든 그림책을<br /><em>학급 작품집에 올려요</em></h1>
          <p className="stu-sub">
            선생님께 받은 <strong>6자리 업로드 코드</strong>와 함께 작품을 올리면 친구·가족이 볼 수 있어요.
          </p>
        </header>

        {/* 학급 정보 */}
        <fieldset className="stu-fieldset">
          <legend>학급 정보</legend>
          <div className="stu-row">
            <label className="stu-field stu-field--year">
              <span>학년도</span>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="2026-1"
                disabled={submitting}
                required
              />
            </label>
            <label className="stu-field stu-field--code">
              <span>업로드 코드 (6자리)</span>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={6}
                value={uploadCode}
                onChange={(e) => setUploadCode(
                  e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6)
                )}
                placeholder="ABC234"
                disabled={submitting}
                required
              />
            </label>
          </div>
        </fieldset>

        {/* 작가 정보 */}
        <fieldset className="stu-fieldset">
          <legend>작가 정보</legend>
          <label className="stu-field">
            <span>필명 (별명)</span>
            <input
              type="text"
              value={penName}
              onChange={(e) => setPenName(e.target.value)}
              placeholder="예: 별이, 곰돌이 작가"
              maxLength={40}
              disabled={submitting}
              required
            />
            {penWarn && (
              <span className="stu-field-warn">
                ⚠️ 실명처럼 보여요. 친구·가족도 부르는 <strong>별명</strong>을 써주세요.
              </span>
            )}
          </label>

          <label className="stu-field">
            <span>한 줄 작가 소개 (선택)</span>
            <input
              type="text"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="예: 고양이를 좋아하는 5학년 작가"
              maxLength={80}
              disabled={submitting}
            />
          </label>
        </fieldset>

        {/* 작품 */}
        <fieldset className="stu-fieldset">
          <legend>작품 파일</legend>

          <div
            className={`stu-drop${dragOver ? ' is-dragover' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={submitting}
            />
            {parsed ? (
              <div className="stu-drop-parsed">
                <span className="stu-drop-icon">📄</span>
                <strong>{file?.name}</strong>
                <span className="stu-drop-info">📚 {parsed.pages.length}페이지</span>
              </div>
            ) : (
              <div className="stu-drop-empty">
                <span className="stu-drop-icon">📁</span>
                <span>JSON 파일을 여기로 끌어다 놓거나 클릭해서 골라요</span>
                <span className="stu-drop-hint">
                  picturebook-storyboard에서 저장한 .json 파일
                </span>
              </div>
            )}
          </div>

          <label className="stu-field">
            <span>책 제목 (자동 채움)</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              maxLength={80}
              disabled={submitting}
            />
          </label>
        </fieldset>

        <p className="stu-privacy">
          🔒 실명·학번·학교명을 작품 속에 적지 않았는지 한 번 더 확인해 주세요.
          올라간 작품은 학급 전체 작품집에 함께 보입니다.
        </p>

        {error && <p className="stu-error">{error}</p>}

        <button
          type="submit"
          className="btn primary stu-submit"
          disabled={!parsed || !penName.trim() || !uploadCode || submitting}
        >
          {submitting ? '올리는 중...' : '🚀 작가로 올리기'}
        </button>
      </form>
    </div>
  );
}

window.StudentUpload = StudentUpload;
