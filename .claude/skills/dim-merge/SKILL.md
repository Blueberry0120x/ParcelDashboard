---
name: dim-merge
description: How the dimension merge system works — combining adjacent chain dim segments into one measurement, removing intermediate witness lines. Use when dims are too dissected or when modifying merge behavior.
---

Reference for the dimension merge feature — combining adjacent chain dim segments.

## Arguments

- `$ARGUMENTS` — what's happening (e.g., "merged dim shows wrong total", "witness lines still showing", "merge not persisting")

## Owner

**SetbackEngine** (`engine-setback.js`) — `updateBldgDimLabels()` → `drawChain()` inner function.

## How It Works

### Data Structure
- `MapEngine.mergedDimKeys` — a `Set<string>` of dim segment keys that are merged into their predecessor
- Key format: `chain_w_3` (width chain, segment 3) or `chain_d_1` (depth chain, segment 1)
- Same format as `hiddenDimKeys`

### Merge Logic (in drawChain)
1. Build **segment runs** — consecutive segments where merged keys extend the previous run
2. Each run has `startIdx`, `endIdx`, and `keys[]`
3. A merged run draws ONE dim line spanning from `chain[startIdx]` to `chain[endIdx]`
4. The label shows the **total distance** across all merged segments
5. Merged labels show a blue `↔` indicator and use the `.dim-merged` CSS class

### Witness Lines
- Witness lines are drawn ONLY at run start/end boundaries
- Intermediate merge points (where segments were combined) get NO witness line
- This is the key visual cleanup — merged dims look like one continuous measurement

### User Interaction
- **Merge button** (blue, below drag button on right side of map): toggles `dimMergeMode`
- When merge mode is active:
  - Clicking a segment adds its first key to `mergedDimKeys` (merges it into predecessor)
  - Clicking an already-merged segment unmerges all keys in that run
  - Chain dims turn blue and cursor becomes pointer (`.dim-merge-mode-on`)
- When merge mode is off:
  - Clicking a segment hides it (adds to `hiddenDimKeys`) — existing behavior

### Persistence
- `mergedDimKeys` saved as array in `_payload().saved.mergedDimKeys`
- Restored in `SetbackEngine.initBuildingConfig()` on page load
- Cleared when "Show Dims" / "Hide Dims" toggle is clicked (fresh slate)

## CSS Classes
- `.dim-merge-active` — on the control button when merge mode is on (blue background)
- `.dim-merge-mode-on` — on map container when merge mode is active (blue chain lines)
- `.dim-merged` — on merged dim labels (blue bold text)

## Debug

| Symptom | Check |
|---|---|
| Merge not working | Is `dimMergeMode` true? Check button state |
| Witness lines still showing | Check `witnessIndices` Set — should only have run start/end |
| Wrong total distance | Check `chain[run.startIdx].v` and `chain[run.endIdx].v` |
| Merge not persisting | Is `mergedDimKeys` in `_payload()`? Is it restored in `initBuildingConfig()`? |
| Merged dim disappears | Check if key is also in `hiddenDimKeys` — hidden takes priority |
