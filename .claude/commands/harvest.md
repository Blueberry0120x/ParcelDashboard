# /harvest -- Run CTRL-001 Harvest across all repos

Quick inspection of all repos for branch health and compliance.

## Steps

1. Run `py -m src.main inspect --config config/repos.json --format md --dry-run`
2. Show the inspection table with all INSP flags
3. For any new flags: note them and suggest action
4. Compare against last inspection in `report/inspection.md`
