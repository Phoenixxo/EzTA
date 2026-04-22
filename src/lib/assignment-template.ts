import type { SubmissionKind } from "../types/ezta";

const allowedPlaceholders = [
  "assignment_name",
  "identifier",
  "github_username",
  "name",
  "group_name",
] as const;

type TemplatePreviewInput = {
  assignmentName: string;
  identifier?: string;
  githubUsername?: string;
  studentName?: string;
  groupName?: string;
};

function slugifyTemplateValue(value: string) {
  let slug = "";
  let previousWasDash = false;

  for (const char of value.trim()) {
    const lower = char.toLowerCase();
    if ((lower >= "a" && lower <= "z") || (lower >= "0" && lower <= "9")) {
      slug += lower;
      previousWasDash = false;
    } else if (!previousWasDash) {
      slug += "-";
      previousWasDash = true;
    }
  }

  return slug.replace(/^-+|-+$/g, "");
}

export function validateRepoTemplate(
  template: string,
  submissionKind: SubmissionKind = "individual",
) {
  const trimmed = template.trim();
  if (!trimmed) {
    return "Repo template is required.";
  }

  const matches = [...trimmed.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const invalid = matches.filter(
    (match) => !allowedPlaceholders.includes(match as (typeof allowedPlaceholders)[number]),
  );

  if (invalid.length > 0) {
    return `Unknown placeholder${invalid.length === 1 ? "" : "s"}: ${invalid
      .map((value) => `{${value}}`)
      .join(", ")}`;
  }

  if (submissionKind === "group") {
    if (!trimmed.includes("{group_name}")) {
      return "Template should include {group_name} so each team resolves to one shared repo.";
    }
    return "";
  }

  if (!trimmed.includes("{github_username}") && !trimmed.includes("{identifier}")) {
    return "Template should include {github_username} or {identifier} so each repo resolves uniquely.";
  }

  return "";
}

export function previewRepoTemplate(template: string, input: TemplatePreviewInput) {
  return [
    ["{assignment_name}", input.assignmentName.trim() || "unit10"],
    ["{identifier}", input.identifier?.trim() || "s1234567"],
    ["{github_username}", input.githubUsername?.trim() || "octocat"],
    ["{name}", input.studentName?.trim() || "Jane Student"],
    ["{group_name}", slugifyTemplateValue(input.groupName?.trim() || "group-a")],
  ].reduce(
    (current, [placeholder, replacement]) =>
      current.split(placeholder).join(replacement),
    template,
  );
}

export function getRepoTemplateHelpText(submissionKind: SubmissionKind = "individual") {
  if (submissionKind === "group") {
    return "Available placeholders: {assignment_name}, {identifier}, {github_username}, {name}, {group_name}. Group assignments should include {group_name}.";
  }
  return "Available placeholders: {assignment_name}, {identifier}, {github_username}, {name}, {group_name}. Individual assignments should include {github_username} or {identifier}.";
}
