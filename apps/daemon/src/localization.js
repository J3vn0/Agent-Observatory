const summaries = {
  agent: {
    en: "Local agent configuration discovered.",
    ko: "로컬 에이전트 설정을 발견했습니다.",
  },
  skill: {
    en: "Local skill discovered.",
    ko: "로컬 스킬을 발견했습니다.",
  },
  plugin: {
    en: "Local plugin configuration discovered.",
    ko: "로컬 플러그인 설정을 발견했습니다.",
  },
  hook: {
    en: "Local hook configuration discovered.",
    ko: "로컬 훅 설정을 발견했습니다.",
  },
  "mcp-server": {
    en: "Local MCP server configuration discovered.",
    ko: "로컬 MCP 서버 설정을 발견했습니다.",
  },
  provider: {
    en: "Local configuration root.",
    ko: "로컬 설정 루트입니다.",
  },
};

export function localizeAsset(kind, label) {
  const summary = summaries[kind] ?? {
    en: "Local asset discovered.",
    ko: "로컬 자산을 발견했습니다.",
  };

  return {
    label: { en: label, ko: label },
    summary,
  };
}
