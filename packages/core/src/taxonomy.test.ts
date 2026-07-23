import { describe, expect, it } from "vitest";
import {
  PROGRAMMING_TAGS,
  PROGRAMMING_TAG_LABELS,
  classifyProgrammingAsset,
  getProgrammingTagLabel,
  isProgrammingTag,
} from "./taxonomy";

describe("programming taxonomy", () => {
  it("has a stable tag order and English and Korean labels", () => {
    expect(PROGRAMMING_TAGS).toEqual([
      "programming",
      "frontend",
      "backend",
      "infrastructure",
      "devops",
      "cloud",
      "database",
      "testing",
      "security",
      "mobile",
      "data-ai",
      "api",
      "git",
      "tooling",
      "documentation",
      "design-system",
    ]);
    expect(PROGRAMMING_TAG_LABELS.frontend).toEqual({
      en: "Frontend",
      ko: "프론트엔드",
    });
    expect(getProgrammingTagLabel("security", "ko")).toBe("보안");
    expect(isProgrammingTag("design-system")).toBe(true);
    expect(isProgrammingTag("finance")).toBe(false);
  });
});

describe("classifyProgrammingAsset", () => {
  it("classifies frontend assets with ordered, field-level evidence", () => {
    const result = classifyProgrammingAsset({
      name: "Frontend UI Builder",
      description: "Build React components with TypeScript, CSS, and Storybook.",
      path: "skills/frontend-ui/SKILL.md",
    });

    expect(result.programming).toBe(true);
    expect(result.tags).toEqual([
      "programming",
      "frontend",
      "design-system",
    ]);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        { tag: "frontend", field: "name", keyword: "frontend" },
        { tag: "frontend", field: "description", keyword: "react" },
        { tag: "frontend", field: "description", keyword: "css" },
        {
          tag: "design-system",
          field: "description",
          keyword: "storybook",
        },
      ]),
    );
  });

  it("classifies backend database and API assets", () => {
    const result = classifyProgrammingAsset({
      name: "Backend API Engineer",
      description: "Implements a FastAPI service backed by PostgreSQL.",
      path: "agents/backend-api.md",
    });

    expect(result.tags).toEqual([
      "programming",
      "backend",
      "database",
      "api",
    ]);
    expect(result.evidence).toContainEqual({
      tag: "database",
      field: "description",
      keyword: "postgresql",
    });
  });

  it("classifies infrastructure, DevOps, and cloud assets", () => {
    const result = classifyProgrammingAsset({
      name: "Terraform AWS Deployment",
      description:
        "Infrastructure as code with Kubernetes and a GitHub Actions deployment pipeline.",
      path: "skills/devops/terraform",
    });

    expect(result.tags).toEqual([
      "programming",
      "infrastructure",
      "devops",
      "cloud",
      "git",
    ]);
  });

  it("classifies application security assets without treating securities as security", () => {
    const security = classifyProgrammingAsset({
      name: "Application Security Auditor",
      description:
        "Find vulnerabilities in source code and verify OAuth authorization.",
      path: "skills/security-audit",
    });

    expect(security.tags).toEqual(["programming", "security"]);
    expect(security.evidence).toContainEqual({
      tag: "security",
      field: "description",
      keyword: "vulnerabilities",
    });

    const finance = classifyProgrammingAsset({
      name: "Securities Portfolio Analyst",
      description:
        "Reviews financial infrastructure, investment risk, tax, and regulatory compliance.",
      path: "skills/finance/legal-review.md",
    });

    expect(finance).toEqual({
      programming: false,
      tags: [],
      evidence: [],
    });
  });

  it("does not classify legal prose that mentions a code or database", () => {
    const result = classifyProgrammingAsset({
      name: "Legal Research",
      description:
        "Search a database of court decisions and explain the tax code and contract law.",
      path: "skills/legal/research.md",
    });

    expect(result.programming).toBe(false);
    expect(result.tags).toEqual([]);
    expect(result.evidence).toEqual([]);
  });

  it("returns identical output for identical input", () => {
    const input = {
      name: "API Test Helper",
      description: "Runs Playwright integration tests for a GraphQL API.",
      path: "tools/api-test.ts",
    };

    expect(classifyProgrammingAsset(input)).toEqual(
      classifyProgrammingAsset(input),
    );
  });
});
