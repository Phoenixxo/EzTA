# Scripts

## Export Classroom team roster

Generate an EzTA-compatible roster CSV for GitHub Classroom group assignments from GitHub organization teams:

```bash
node scripts/export-classroom-team-roster.mjs \
  --org YOUR_ORG \
  --teams "C+++,Donut Days,Jedi Adventure,KCA,PG13" \
  --output team-roster.csv
```

The script writes CSV columns in this format:

```csv
identifier,github_username,github_id,name,group_name
```

Notes:

- Team names are matched against GitHub org team display names.
- `identifier` defaults to the GitHub login.
- `name` is fetched from the public GitHub user profile when available.
- Use `--no-fetch-names` to skip per-user profile lookups and use logins as names.
