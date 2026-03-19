#!/usr/bin/env python3
"""
mobilize.py - Desktop-to-Mobile Responsive Analyzer & Generator

Analyzes HTML/CSS files for desktop-only layout patterns and generates
responsive @media queries or React useMobile() hooks.

Usage:
    python mobilize.py <file_or_dir> [--breakpoint 767] [--dry-run] [--report-only]

Examples:
    python mobilize.py src/css/style.css
    python mobilize.py src/
    python mobilize.py src/checklist.html --dry-run
    python mobilize.py src/ --report-only
"""

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ── Pattern Definitions ────────────────────────────────────────────────────

@dataclass
class Finding:
    file: str
    line: int
    pattern: str
    selector: str
    detail: str
    fix: str


BREAKPOINT = 767

# CSS patterns to detect
PATTERNS = {
    "fixed_height": {
        "desc": "Fixed height container",
        "regex": r"height\s*:\s*(\d{2,})\s*px",
        "fix": "height: auto; min-height: 0;",
        "min_val": 100,  # only flag heights >= 100px
    },
    "flex_row": {
        "desc": "Flex row (should stack on mobile)",
        "regex": r"display\s*:\s*flex",
        "fix": "flex-direction: column;",
    },
    "fixed_sidebar": {
        "desc": "Fixed-width sidebar/panel",
        "regex": r"width\s*:\s*(\d{2,})\s*%",
        "fix": "width: 100%; min-width: 0;",
        "context_keywords": ["sidebar", "panel", "col-left", "col-right", "info-col"],
    },
    "resize_divider": {
        "desc": "Resize divider (hide on mobile)",
        "regex": r"cursor\s*:\s*col-resize",
        "fix": "display: none;",
    },
    "small_touch_target": {
        "desc": "Small touch target",
        "regex": r"padding\s*:\s*([0-3])\s*px",
        "fix": "min-height: 36px; padding: 6px 10px;",
    },
    "multi_col_grid": {
        "desc": "Multi-column grid",
        "regex": r"grid-template-columns\s*:\s*(.+)",
        "fix": "grid-template-columns: 1fr;",
        "min_cols": 3,
    },
    "min_width_panel": {
        "desc": "Min-width panel (overflows on small screens)",
        "regex": r"min-width\s*:\s*(\d{3,})\s*px",
        "fix": "min-width: 0;",
        "min_val": 200,
    },
}


# ── CSS Analyzer ───────────────────────────────────────────────────────────

def extract_selector(lines: list[str], line_idx: int) -> str:
    """Walk backwards from a property line to find its CSS selector."""
    for i in range(line_idx, max(line_idx - 15, -1), -1):
        line = lines[i].strip()
        # Look for selector line (ends with { or contains { after text)
        m = re.match(r'^([^{]+)\{', line)
        if m:
            return m.group(1).strip()
    return "unknown"


def analyze_css(filepath: str) -> list[Finding]:
    """Analyze a CSS file for desktop-only layout patterns."""
    findings = []
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    lines = content.split('\n')

    # Check if already has mobile media query
    has_mobile_mq = bool(re.search(
        r'@media\s*\(\s*max-width\s*:\s*7\d\dpx\s*\)', content
    ))

    # Track which selectors we're inside
    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip if inside existing @media block
        # (simple heuristic: check if we're past a @media opening)

        for pat_key, pat in PATTERNS.items():
            m = re.search(pat['regex'], stripped)
            if not m:
                continue

            # Additional filtering
            if pat_key == "fixed_height":
                val = int(m.group(1))
                if val < pat.get("min_val", 0):
                    continue

            if pat_key == "fixed_sidebar":
                selector = extract_selector(lines, i)
                has_keyword = any(
                    kw in selector.lower()
                    for kw in pat.get("context_keywords", [])
                )
                if not has_keyword:
                    continue

            if pat_key == "multi_col_grid":
                cols_str = m.group(1).strip().rstrip(';')
                # Count number of column definitions
                col_count = len(re.findall(
                    r'(\d+(?:fr|px|%|em|rem)|auto|min-content|max-content)',
                    cols_str
                ))
                if col_count < pat.get("min_cols", 3):
                    continue

            if pat_key == "min_width_panel":
                val = int(m.group(1))
                if val < pat.get("min_val", 0):
                    continue

            selector = extract_selector(lines, i)
            findings.append(Finding(
                file=filepath,
                line=i + 1,
                pattern=pat["desc"],
                selector=selector,
                detail=stripped[:80],
                fix=pat["fix"],
            ))

    return findings, has_mobile_mq


def generate_css_media_block(findings: list[Finding], breakpoint: int) -> str:
    """Generate a @media block from findings."""
    if not findings:
        return ""

    # Group by selector
    selector_fixes: dict[str, list[str]] = {}
    for f in findings:
        if f.selector not in selector_fixes:
            selector_fixes[f.selector] = []
        # Avoid duplicate fixes
        if f.fix not in selector_fixes[f.selector]:
            selector_fixes[f.selector].append(f.fix)

    lines = [
        "",
        f"/* ==========================================",
        f"   MOBILE -- auto-generated by mobilize.py",
        f"   ========================================== */",
        f"@media (max-width: {breakpoint}px) {{",
    ]

    for selector, fixes in selector_fixes.items():
        # Find the pattern description for comment
        pattern_descs = set()
        for f in findings:
            if f.selector == selector:
                pattern_descs.add(f.pattern)
        comment = ", ".join(pattern_descs)
        lines.append(f"    /* {comment} */")
        lines.append(f"    {selector} {{ {' '.join(fixes)} }}")
        lines.append("")

    lines.append("}")
    lines.append("")
    return "\n".join(lines)


# ── React/JSX Analyzer ────────────────────────────────────────────────────

def is_react_file(filepath: str) -> bool:
    """Check if an HTML file uses React/Babel."""
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read(2000)
    return 'text/babel' in content or 'react' in content.lower()


def analyze_react(filepath: str) -> list[Finding]:
    """Analyze a React/JSX file for inline style patterns."""
    findings = []
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    lines = content.split('\n')

    # Check for existing useMobile hook
    has_hook = 'useMobile' in content

    # Look for inline style patterns
    for i, line in enumerate(lines):
        stripped = line.strip()

        # Fixed height in inline styles
        m = re.search(r'height\s*:\s*["\']?(\d{2,})\s*(?:px)?', stripped)
        if m and 'style' in lines[max(0, i-3):i+1].__repr__():
            val = int(m.group(1))
            if val >= 100:
                findings.append(Finding(
                    file=filepath, line=i+1,
                    pattern="Inline fixed height",
                    selector=f"line {i+1}",
                    detail=stripped[:80],
                    fix=f"height: isMobile ? 'auto' : {val}",
                ))

        # display:"flex" without flexDirection:"column"
        if re.search(r'display\s*:\s*["\']flex["\']', stripped):
            # Check if this line or nearby has flexDirection
            context = '\n'.join(lines[max(0,i-1):i+3])
            if 'flexDirection' not in context and 'flex-direction' not in context:
                findings.append(Finding(
                    file=filepath, line=i+1,
                    pattern="Inline flex row (may need column on mobile)",
                    selector=f"line {i+1}",
                    detail=stripped[:80],
                    fix="flexDirection: isMobile ? 'column' : 'row'",
                ))

        # gridTemplateColumns with multiple columns
        m = re.search(r'gridTemplateColumns\s*:\s*["\']([^"\']+)["\']', stripped)
        if m:
            cols_str = m.group(1)
            col_count = len(cols_str.split())
            if col_count >= 3:
                findings.append(Finding(
                    file=filepath, line=i+1,
                    pattern="Inline multi-column grid",
                    selector=f"line {i+1}",
                    detail=stripped[:80],
                    fix=f"gridTemplateColumns: isMobile ? '1fr' : '{cols_str}'",
                ))

        # minWidth on panels
        m = re.search(r'minWidth\s*:\s*(\d{3,})', stripped)
        if m:
            val = int(m.group(1))
            if val >= 200:
                findings.append(Finding(
                    file=filepath, line=i+1,
                    pattern="Inline min-width panel",
                    selector=f"line {i+1}",
                    detail=stripped[:80],
                    fix=f"minWidth: isMobile ? undefined : {val}",
                ))

    return findings, has_hook


# ── Report Generator ───────────────────────────────────────────────────────

def print_report(all_findings: dict[str, list[Finding]]):
    """Print a formatted analysis report."""
    total = sum(len(f) for f in all_findings.values())
    print(f"\n{'=' * 60}")
    print(f"  MOBILIZE REPORT -- {total} pattern(s) found")
    print(f"{'=' * 60}\n")

    for filepath, findings in all_findings.items():
        if not findings:
            continue
        rel = os.path.relpath(filepath)
        print(f"  {rel} ({len(findings)} findings)")
        print(f"  {'-' * 50}")
        for f in findings:
            print(f"    L{f.line:>4}  [{f.pattern}]")
            print(f"           {f.selector}")
            print(f"           Fix: {f.fix}")
            print()
    print(f"{'=' * 60}\n")


def print_summary_table(all_findings: dict[str, list[Finding]], applied: bool):
    """Print a compact summary table."""
    print(f"\n  {'File':<40} {'Findings':>8}  {'Status'}")
    print(f"  {'-'*40} {'-'*8}  {'-'*12}")
    for filepath, findings in all_findings.items():
        rel = os.path.relpath(filepath)
        status = "applied" if applied and findings else ("clean" if not findings else "report only")
        print(f"  {rel:<40} {len(findings):>8}  {status}")
    print()


# ── Main ───────────────────────────────────────────────────────────────────

USEMOBILE_HOOK = """function useMobile(bp=768){const[m,setM]=useState(()=>window.innerWidth<bp);useEffect(()=>{const h=()=>setM(window.innerWidth<bp);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[bp]);return m;}"""


def process_css(filepath: str, breakpoint: int, dry_run: bool) -> list[Finding]:
    """Process a CSS file: analyze and optionally append @media block."""
    findings, has_mq = analyze_css(filepath)
    if not findings:
        return findings

    block = generate_css_media_block(findings, breakpoint)

    if dry_run:
        print(f"\n  [DRY RUN] Would append to {os.path.relpath(filepath)}:")
        for line in block.split('\n')[:20]:
            print(f"    {line}")
        if block.count('\n') > 20:
            print(f"    ... ({block.count(chr(10)) - 20} more lines)")
    else:
        if has_mq:
            print(f"  [WARN] {os.path.relpath(filepath)} already has @media mobile block -- appending new rules")
        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(block)
        print(f"  [OK] Appended {len(findings)} mobile rules to {os.path.relpath(filepath)}")

    return findings


def process_react(filepath: str, dry_run: bool) -> list[Finding]:
    """Process a React file: analyze and report (manual apply recommended)."""
    findings, has_hook = analyze_react(filepath)
    if not findings:
        return findings

    rel = os.path.relpath(filepath)
    print(f"\n  React file: {rel}")
    if not has_hook:
        print(f"  [INFO] useMobile() hook NOT found -- add this after imports:")
        print(f"    {USEMOBILE_HOOK}")
        print(f"    Then add 'const isMobile = useMobile();' in your App component.\n")

    print(f"  Suggested changes ({len(findings)} patterns):")
    for f in findings:
        print(f"    L{f.line}: {f.fix}")

    return findings


def collect_files(target: str) -> list[str]:
    """Collect .html and .css files from a path."""
    target_path = Path(target)
    if target_path.is_file():
        return [str(target_path)]

    if target_path.is_dir():
        files = []
        for ext in ('*.css', '*.html'):
            files.extend(str(p) for p in target_path.rglob(ext))
        return sorted(files)

    print(f"  [ERROR] Not found: {target}")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Analyze web files and generate responsive mobile overrides."
    )
    parser.add_argument("target", help="File or directory to analyze")
    parser.add_argument("--breakpoint", type=int, default=BREAKPOINT,
                        help=f"Mobile breakpoint in px (default: {BREAKPOINT})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be generated without writing")
    parser.add_argument("--report-only", action="store_true",
                        help="Only print analysis report, don't generate code")
    args = parser.parse_args()

    files = collect_files(args.target)
    if not files:
        print("  No .html or .css files found.")
        sys.exit(0)

    print(f"\n  Scanning {len(files)} file(s)...")
    all_findings: dict[str, list[Finding]] = {}

    for filepath in files:
        ext = Path(filepath).suffix.lower()

        if ext == '.css':
            if args.report_only:
                findings, _ = analyze_css(filepath)
                all_findings[filepath] = findings
            else:
                findings = process_css(filepath, args.breakpoint, args.dry_run)
                all_findings[filepath] = findings

        elif ext == '.html':
            if is_react_file(filepath):
                findings = process_react(filepath, args.dry_run)
                all_findings[filepath] = findings
            else:
                # Vanilla HTML -- look for inline <style> blocks
                # For now, just report
                print(f"\n  Vanilla HTML: {os.path.relpath(filepath)}")
                print(f"  [INFO] Add @media rules to the <style> block manually,")
                print(f"  or extract CSS to a separate file for auto-processing.")
                all_findings[filepath] = []

    print_report(all_findings)
    applied = not args.dry_run and not args.report_only
    print_summary_table(all_findings, applied)

    total = sum(len(f) for f in all_findings.values())
    if total == 0:
        print("  No mobile-unfriendly patterns detected. File looks responsive!")
    elif args.report_only:
        print("  Run without --report-only to generate and apply fixes.")
    elif args.dry_run:
        print("  Run without --dry-run to apply these changes.")


if __name__ == "__main__":
    main()
