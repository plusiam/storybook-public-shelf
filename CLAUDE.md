# CLAUDE.md — AI 작업 가이드

이 저장소에서 작업하는 AI(Claude·다른 모델 포함)가 자동으로 따라야 할 규칙입니다. 새 작업을 시작하기 전에 반드시 읽어 주세요.

## 1. 저장소 정체성

**`plusiam/storybook-public-shelf`** = **공개 학생 작가 작품집** (Supabase 백엔드, Vercel 배포)

- **목적**: 학생을 작가로 모시고, 학생이 직접 자기 작품을 학급 작품집에 올리는 공개 도구
- **사용자**: 학생(업로드)·관람객(열람)·교사(어드민)
- **운영**: 한기쌤(plusiam) 1인 어드민
- **배포**: https://storybook-bookshelf.vercel.app/

## 2. 별도 저장소가 있다 — 절대 혼동 금지

**`plusiam/storybook-bookshelf`** = **학생 피드백 모드** (백엔드 없는 정적 뷰어)

- 한기쌤 수업 중 학생 작품을 같이 보며 피드백하는 GitHub Pages 도구
- **이 저장소(public-shelf)와 별개로 운영**되며, 코드도 분리되어 있음
- 영구 동결(태그 `v1-feedback-final` 부착). 변경하지 마세요.
- 도메인: https://plusiam.github.io/storybook-bookshelf/

> 사용자가 "main에", "기존 저장소에", "학생 피드백 쪽" 같은 표현을 쓰면 **저쪽 저장소를 의미할 가능성**을 의심하세요. 이 저장소(public-shelf)와는 다른 곳입니다.

## 3. 정체성 변화 history

이 저장소의 main은 원래 `plusiam/storybook-bookshelf`의 `family` 브랜치였습니다.

- `family-archived-pre-split` 태그(옛 저장소)에 분리 시점 마지막 커밋(`b3401da`) 보존
- Phase 7~12 (DB v3 + 공개 작품집 재설계) 작업 결과가 이주됨
- 이전 가족 비공개 모드 시도(`feat-archived-pre-split` 태그)도 참고용으로 옛 저장소에 보존

자세한 결정 history는 운영 정책 문서([OPERATIONS.md](./OPERATIONS.md))를 참고하세요.

## 4. 핵심 인프라

| 항목 | 값 |
|---|---|
| Supabase 프로젝트 이름 | `storybook-bookshelf` |
| Supabase ref | `ipjdoabdjuuieuojvryl` |
| 리전 | ap-northeast-2 (서울) |
| Vercel 프로덕션 도메인 | `https://storybook-bookshelf.vercel.app` |
| 배포 브랜치 | `main` |

`config.js`에 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 박혀 있음. **anon key는 RLS로 보호되어 노출 안전**. service_role 키는 절대 클라이언트나 git에 넣지 말 것.

## 5. 합의서 v3 (잠금된 결정)

| 항목 | 결정 |
|---|---|
| 학급 코드 | `view_code` 4자리(누구나 열람) + `upload_code` 6자리(학생 업로드) 분리 |
| 이름 정책 | **필명 강제** (실명 입력 차단, server-side validation) |
| 검색엔진 | `<meta name="robots" content="noindex, nofollow">` |
| 업로드 주체 | 학생 (anon RPC) |
| 열람 주체 | 누구나 (anon RPC) |
| visibility | 폐기 (학급 단위 공개만) |
| 교사 인증 | Supabase Auth 비밀번호 + OTP 폴백 |
| 데이터 보존 | 수동 삭제 + 1년 경과 어드민 ⚠️ 배지 |

새 작업이 이 항목들과 충돌하면 **먼저 사용자에게 확인**하세요.

## 6. 작업 시 절대 규칙

1. **학생 실명을 DB에 저장하지 않습니다.** `pen_name`(필명)만. 대구시교육청 정보보호 기준.
2. **`service_role` 키는 절대 클라이언트·git에 노출하지 않습니다.** 필요하면 Edge Function 등 서버 측 처리.
3. **RPC 4개(`view_class_books` / `upload_book` / `get_book` / `record_upload_failure`)는 anon에 EXECUTE 허용**된 의도된 설계입니다. Supabase Advisor가 WARN을 띄워도 무시하세요.
4. **무료 운영 한도**: Supabase 500MB DB, Vercel hobby 트래픽 한도. 학교 1곳 규모로 운영. 그 이상 확장 시 별도 결정.
5. **상대 경로** 사용 (Vercel 정적 호스팅이지만 `<base href>` 의존 없이 동작하도록).

## 7. 코드베이스 한눈

| 파일 | 역할 |
|---|---|
| `index.html` | 진입점. Babel standalone으로 JSX 변환 |
| `config.js` | Supabase URL/key |
| `supabase-client.js` | `window.PB` 노출. 인증·학급·책·업로드·열람 모든 RPC 호출 헬퍼 |
| `app.jsx` | hash 라우터 + `HomeScene` + `GuestEntryForm` |
| `admin-auth.jsx` | 교사 로그인(비밀번호/OTP 탭) + `AdminShell` |
| `admin-classes.jsx` | 학급 CRUD + 두 코드 발급/재발급 + 안내문 복사 |
| `admin-books.jsx` | 학급 안의 책 모니터·삭제 |
| `student-upload.jsx` | 학생 업로드 폼 + 성공 화면 |
| `public-gallery.jsx` | 공개 학급 작품집 + 단권 뷰어 |
| `book.jsx`, `page-templates.jsx` | 책 뷰어 (학생 피드백 repo와 공유했던 원본의 v3 분기) |
| `schema.sql` | DB v3 — 통째로 적용 가능 |

## 8. 운영 정책 한 줄

- 단일 교사 모드 ([OPERATIONS.md](./OPERATIONS.md))
- 학부모 동의서 ([family-consent.md](./family-consent.md))
- README는 가족·관람객·교사 모두를 위한 안내 ([README.md](./README.md))

---

🌱 만든 사람 [룰루랄라 한기쌤](https://plusiam.github.io) · 2026
