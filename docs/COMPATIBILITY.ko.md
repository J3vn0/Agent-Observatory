# AI 환경 호환성

최종 검토: 2026-08-01 · [English](./COMPATIBILITY.md)

Agent Observatory는 로컬 AI 코딩 환경을 위한 관찰·거버넌스 계층입니다.
호환성은 모델 제공자가 아니라 검사 가능한 설정·세션 형식을 기준으로
판단합니다. GPT, Claude, Gemini 또는 다른 모델을 사용하는 클라이언트라도
전용 어댑터가 로컬 메타데이터를 안전하게 정규화할 수 있으면 관찰 대상이
될 수 있습니다.

## 상태 기준

- **네이티브 어댑터**: 프로젝트, 세션, 서브에이전트 전용 파서가 있습니다.
- **공용 매니페스트**: 재사용 정의를 인덱싱하지만 실행 이력까지 의미하지는 않습니다.
- **어댑터 후보**: 원본 클라이언트에 구조화된 메타데이터가 있지만 현재 Agent Observatory는 스캔하지 않습니다.

## 현재 지원

| 환경 | 탐색 루트 또는 출처 | 프로젝트 / 세션 / 서브에이전트 | 스킬 / 플러그인 / 훅 / MCP | 안전한 쓰기 작업 | 상태 |
|---|---|---:|---:|---|---|
| OpenAI Codex | `~/.codex` | 지원 | 승인된 로컬 파일에서 발견될 때 인덱싱 | `~/.codex/agents/<name>.toml` 생성 전 미리보기·승인; 생성 파일이 바뀌지 않았을 때만 실행 취소 | 네이티브 |
| Anthropic Claude Code | `~/.claude` | 지원 | 승인된 로컬 파일에서 발견될 때 인덱싱 | 관찰 프로필을 공용 Markdown 또는 Codex TOML 승격 형식으로 정규화 | 네이티브 |
| 공용 에이전트 정의 | `~/.agents` | 정의만 지원 | 발견될 때 인덱싱 | `~/.agents/agents/<name>.md` 생성 전 미리보기·승인; 생성 파일이 바뀌지 않았을 때만 실행 취소 | 공용 매니페스트 |

데몬은 허용 목록 메타데이터만 읽고 인증정보로 보이는 필드를 제거합니다.
화면 표시를 위해 프롬프트 본문을 읽거나, 인벤토리 도중 MCP 도구를 실행하거나,
기존 승격 대상을 조용히 덮어쓰지 않습니다.

## 어댑터 후보

| 환경 | 원본 환경이 제공하는 구조화 기능 | 향후 어댑터로 가능한 작업 | 현재 경계 |
|---|---|---|---|
| [Cursor](https://docs.cursor.com/context/model-context-protocol) | stdio, SSE, Streamable HTTP 방식의 MCP 서버 | MCP 인벤토리, 프로젝트 규칙, 프로젝트별 기능 관계 | Cursor 프로젝트·규칙·세션 스캐너 없음 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md) | 사용자·프로젝트 `settings.json`, MCP 서버 탐색·상태·도구·프롬프트·리소스 | MCP 설정·상태 인벤토리와 프로젝트·세션 귀속 | `~/.gemini`와 프로젝트 `.gemini`를 스캔하지 않음 |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents) | 도구와 선택적 MCP 서버를 가진 Markdown 커스텀 에이전트 프로필; CLI 스킬 지원 | 저장소 에이전트·스킬·MCP 인벤토리와 프로필 우선순위 | `.github/agents`와 Copilot CLI 어댑터 없음 |
| [Windsurf](https://docs.windsurf.com/windsurf/cascade/mcp) | Cascade MCP 설정과 stdio, HTTP, SSE 전송 방식 | MCP 인벤토리와 환경별 연결 상태 | Windsurf 설정·세션 어댑터 없음 |
| [OpenCode](https://opencode.ai/docs/agents) | 권한을 가진 JSON/Markdown 주·서브에이전트; [MCP 설정](https://opencode.ai/v2/docs/mcp-servers) | 에이전트 계층, 권한, 단계 제한, MCP 관계 | OpenCode 설정·세션 어댑터 없음 |
| [Cline](https://docs.cline.bot/cli/cli-reference) | 글로벌·프로젝트 에이전트, 스킬, 훅, 플러그인, MCP 설정, 세션 저장소 | 기능·예약·세션·프로젝트/글로벌 중복을 포괄하는 어댑터 | Cline 설정·SQLite 세션 어댑터 없음 |

위 항목은 **통합 후보**이며 현재 자동 지원을 뜻하지 않습니다. 각 도구가
MCP를 지원하더라도 Agent Observatory가 즉시 연결되는 범용 MCP 서버가 되는
것은 아닙니다. 향후 어댑터나 선택형 컨트롤 플레인 서버가 활용할 안정적인
프로토콜 접점이 있다는 뜻입니다.

## 모든 전용 어댑터가 제공해야 할 기능

1. 비밀정보를 읽지 않고 글로벌·프로젝트 설정 탐지
2. 프로젝트, 세션, 부모·자식 에이전트, 역할, 기능 정규화
3. 근거가 있을 때만 스킬, 플러그인, 훅, MCP 서버 귀속
4. 설명 가능성을 위한 출처 경로와 시간 정보 보존
5. 관찰된 사용과 단순 설치 상태 분리
6. 쓰기 전 형식 변환 미리보기와 기존 대상 충돌 거부
7. 읽기 전용 탐색에서 도구 실행·모델 호출 분리

## 제안하는 어댑터 구현 순서

1. **GitHub Copilot** — 저장소 에이전트 프로필을 버전 관리할 수 있고 공용 Markdown 모델과 잘 맞습니다.
2. **Gemini CLI** — 명확한 사용자·프로젝트 설정과 MCP 상태가 있어 탐색 경계를 정하기 쉽습니다.
3. **Cursor** — 프로젝트 규칙과 MCP 범위를 먼저 지원하고 안정적인 출처가 있을 때 세션 귀속을 추가합니다.
4. **OpenCode** — 풍부한 에이전트·권한·단계 제한 메타데이터를 거버넌스·비용 화면에 활용할 수 있습니다.
5. **Cline** — 설정·세션 범위가 넓지만 SQLite 이력과 예약 기능을 더 신중히 다뤄야 합니다.
6. **Windsurf** — MCP 설정 인벤토리부터 시작하고 안정적인 세션 메타데이터가 문서화될 때 확장합니다.

## 모델과 클라이언트의 경계

- GPT, Claude, Gemini 같은 **모델**은 응답을 생성합니다.
- Codex, Claude Code, Cursor, Gemini CLI, OpenCode 같은 **클라이언트·환경**은 Agent Observatory가 검사할 메타데이터를 저장합니다.
- ChatGPT, Claude.ai, Gemini 웹 대화는 로컬 코딩 환경 어댑터가 아니므로 현재 탐색 범위 밖입니다.

따라서 네이티브 지원 표시는 단순 MCP 지원이 아니라 이 저장소에 파서,
fixture, 테스트가 있을 때만 부여합니다.
