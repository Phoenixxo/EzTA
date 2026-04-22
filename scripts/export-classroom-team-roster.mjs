#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.org || options.teams.length === 0) {
    printHelp("Both --org and at least one --team are required.");
    process.exit(1);
  }

  ensureGhAvailable();

  const teams = listOrgTeams(options.org);
  const rows = [];

  for (const requestedTeamName of options.teams) {
    const team = findTeamByName(teams, requestedTeamName);
    if (!team) {
      const knownNames = teams.map((entry) => entry.name).sort((left, right) => left.localeCompare(right));
      throw new Error(
        `Could not find team "${requestedTeamName}" in org "${options.org}". Known team names: ${knownNames.join(", ")}`,
      );
    }

    const members = listTeamMembers(options.org, team.slug);
    if (members.length === 0) {
      rows.push({
        identifier: "",
        github_username: "",
        github_id: "",
        name: "",
        group_name: team.name,
      });
      continue;
    }

    for (const member of members) {
      const profileName = options.fetchNames ? fetchGithubDisplayName(member.login) : "";
      rows.push({
        identifier: member.login,
        github_username: member.login,
        github_id: String(member.id ?? ""),
        name: profileName || member.login,
        group_name: team.name,
      });
    }
  }

  const csv = toCsv(rows);
  if (options.outputPath) {
    writeFileSync(options.outputPath, csv, "utf8");
  } else {
    process.stdout.write(csv);
  }
}

function parseArgs(args) {
  const options = {
    org: "",
    teams: [],
    outputPath: "",
    fetchNames: true,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--org") {
      options.org = args[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--team") {
      const value = args[index + 1] ?? "";
      if (value.trim()) {
        options.teams.push(value.trim());
      }
      index += 1;
      continue;
    }
    if (arg === "--teams") {
      const value = args[index + 1] ?? "";
      options.teams.push(
        ...value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }
    if (arg === "--output") {
      options.outputPath = args[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--no-fetch-names") {
      options.fetchNames = false;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(errorMessage = "") {
  const output = [
    errorMessage,
    "Usage:",
    "  node scripts/export-classroom-team-roster.mjs --org ORG --team \"C+++\" --team \"Donut Days\"",
    "  node scripts/export-classroom-team-roster.mjs --org ORG --teams \"C+++,Donut Days,Jedi Adventure,KCA,PG13\" --output roster.csv",
    "",
    "Options:",
    "  --org ORG             GitHub organization name that owns the Classroom teams",
    "  --team NAME           Team display name to export, repeat for multiple teams",
    "  --teams A,B,C         Comma-separated team display names",
    "  --output PATH         Write CSV to a file instead of stdout",
    "  --no-fetch-names      Skip per-user profile lookups and use GitHub logins as names",
    "  --help                Show this message",
    "",
    "Output columns:",
    "  identifier,github_username,github_id,name,group_name",
  ]
    .filter(Boolean)
    .join("\n");

  console.error(output);
}

function ensureGhAvailable() {
  const result = spawnSync("gh", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error("GitHub CLI `gh` is required and was not found on PATH.");
  }
}

function listOrgTeams(org) {
  return runGhJson(["api", `/orgs/${org}/teams`, "--paginate"]);
}

function findTeamByName(teams, requestedTeamName) {
  const exact = teams.find((team) => team.name === requestedTeamName);
  if (exact) {
    return exact;
  }

  const normalizedRequested = normalizeTeamName(requestedTeamName);
  return (
    teams.find((team) => normalizeTeamName(team.name) === normalizedRequested) ?? null
  );
}

function normalizeTeamName(value) {
  return value.trim().toLowerCase();
}

function listTeamMembers(org, slug) {
  return runGhJson(["api", `/orgs/${org}/teams/${slug}/members`, "--paginate"]).sort((left, right) =>
    left.login.localeCompare(right.login),
  );
}

function fetchGithubDisplayName(login) {
  const user = runGhJson(["api", `/users/${login}`]);
  return typeof user.name === "string" ? user.name.trim() : "";
}

function runGhJson(args) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `gh ${args.join(" ")} failed`);
  }

  const stdout = result.stdout.trim();
  return stdout ? JSON.parse(stdout) : [];
}

function toCsv(rows) {
  const header = [
    "identifier",
    "github_username",
    "github_id",
    "name",
    "group_name",
  ];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.identifier,
        row.github_username,
        row.github_id,
        row.name,
        row.group_name,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
