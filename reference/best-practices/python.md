# Python Best Practices

**Applies to:** All repos with `.py` files
**Source:** PEP 8 + project conventions
**Synced by:** CTRL-004 Baseline Push

---

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Modules / files | `snake_case` | `repo_inspector.py` |
| Functions | `snake_case` | `write_note()` |
| Classes | `PascalCase` | `ControllerNote` |
| Constants | `UPPER_SNAKE` | `NOTE_DIR_NAME` |
| Private/internal | `_` prefix | `_touch_ping()`, `_parse_file()` |
| Dunder/magic | `__` prefix+suffix | `__init__()`, `__post_init__()` |

**`_` prefix rule:** Functions and variables prefixed with `_` are internal
implementation details. They may change without notice. Other modules should
only import and call the public API (no `_` prefix). This keeps interfaces
stable while allowing internal refactoring.

## Imports

- `from __future__ import annotations` at top of every module
- Absolute imports only: `from src.models import Rule` (never relative)
- stdlib first, then third-party, then local — separated by blank lines
- Lazy imports (inside functions) for optional deps: `# noqa: PLC0415`

## Style

- 4 spaces indentation (no tabs)
- Lines under 100 characters
- f-strings over `.format()` or `%`
- Type hints on all public function signatures
- Docstrings on public functions (one-liner or Google style)

## Data Modeling

- Use `@dataclass` for structured data (not dicts or tuples)
- All shared dataclasses go in `src/models.py` (one central location)
- Use `field(default_factory=list)` for mutable defaults

## File I/O

- `pathlib.Path` for all file operations — never `os.path`
- Always specify `encoding="utf-8"` when reading/writing text files
- All Python files: UTF-8, no BOM

## Error Handling

- Only catch specific exceptions — never bare `except:`
- Use `try/finally` for resource cleanup (COM objects, file handles)
- Validate at system boundaries (user input, external APIs), trust internal code

## Anti-Patterns to Avoid

- Don't use `os.system()` — use `subprocess.run()` with explicit args
- Don't hardcode paths — derive from `__file__` or `Path.cwd()`
- Don't use `.format()` on strings containing `{}` (JS templates, JSON) — use `str.replace()`
- Don't tokenize placeholder text like "No description provided." into tags/keywords
