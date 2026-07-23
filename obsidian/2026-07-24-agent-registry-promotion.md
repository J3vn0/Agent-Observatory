---
tags:
  - project/agent-observatory
  - feature/agent-registry
  - domain/agent-ops
  - status/implemented
created: 2026-07-24
updated: 2026-07-24
---

# Agent Registry & Global Promotion Preview

## Problem

프로젝트마다 같은 역할의 서브에이전트가 반복해서 생성되면 정의가 분산되고 유지보수 비용이 커진다. 여러 프로젝트에서 재사용되는 정의는 글로벌 에이전트 후보로 식별하되, 세션 실행 기록과 에이전트 정의를 혼동해서는 안 된다.

## Identity model

- 글로벌 에이전트: 로컬 구성에서 명시적으로 발견된 재사용 가능 정의
- 프로젝트 서브에이전트: 프로젝트 세션 아래에서 관찰된 서브에이전트 정의
- 기본 세션(primary session): 실행 컨텍스트이며 승격 후보 정의에서 제외
- 공개 메타데이터: 이름, 역할, 태그, 기능, 스킬, MCP, 권한, 프로젝트 ID, 사용 횟수, 관찰 시각
- 제외 데이터: 프롬프트, 지시문, 대화 본문, 자격 증명, 홈 디렉터리 경로

## Similarity contract

결정론적 가중치와 필드별 증거를 사용한다.

| Feature | Weight |
|---|---:|
| Name | 0.24 |
| Role | 0.20 |
| Tags | 0.14 |
| Capabilities | 0.10 |
| Skills | 0.14 |
| MCP servers | 0.10 |
| Permissions | 0.08 |

값이 없는 필드는 유효 가중치에서 제외하고 나머지 가중치를 다시 정규화한다. 각 비교 결과는 공통 값, 왼쪽에만 있는 값, 오른쪽에만 있는 값을 제공한다.

## Promotion policy

- 서로 다른 두 개 이상의 프로젝트에서 유사도 80% 이상인 정의만 후보 클러스터에 포함
- 90% 이상이며 차단 요소가 없으면 글로벌 승격 권고
- 현재 UI는 읽기 전용 계획 미리보기만 제공
- 실제 파일 생성·이동·삭제는 별도 승인과 되돌리기 설계가 구현된 뒤 제공

## Live observation

2026-07-24 로컬 스냅샷에서 Claude의 `workflow-subagent`가 다음 4개 프로젝트에서 발견되었다.

- VoxFader: 106회
- Formypet: 112회
- 4-1 · 4bbd: 100회
- KW-libra: 4회

총 322회 실행, 정의 유사도 100%로 글로벌 승격 후보 1개가 생성되었다. 기본 세션은 후보 계산에서 제외했다.

## UI

- 전용 `#/registry` 페이지
- 글로벌/프로젝트/후보/완전 중복 지표
- 전체, 완전 중복, 검토 필요 필터
- 프로젝트 원본이 하나의 글로벌 정의로 수렴하는 비교 레이아웃
- 환경 및 프로젝트 범위 연동
- 한국어/영어 카피, 화이트 기반 데스크톱 우선 반응형 UI

## Verification

- `npm test`: daemon 6, dashboard 5, core 14 tests passed
- `npm run typecheck`: passed
- `npm run build`: passed
- Desktop 1440×1000: no horizontal overflow
- Responsive viewport (Chrome minimum 501×845): no horizontal overflow
- Console errors/warnings/issues: 0
- Network 4xx/5xx: 0
- External font requests: 0
- UI privacy check for username and home paths: no matches

## Next

1. 후보를 기존 글로벌 정의와 비교해 이미 승격된 중복을 표시한다.
2. 차이 선택, 이름 충돌 해결, 권한 합집합 경고를 포함한 승격 계획서를 만든다.
3. 승인 후 글로벌 정의 생성과 프로젝트별 참조 전환을 하나의 되돌릴 수 있는 변경 세트로 실행한다.
4. 동일한 증거 모델을 스킬 중복·사용자화 흐름으로 확장한다.
