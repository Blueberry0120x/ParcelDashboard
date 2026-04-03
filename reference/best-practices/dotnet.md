# .NET / C# Best Practices

**Applies to:** VS_C3D, VS_ORD, and any future C# repos
**Source:** .NET conventions + AutoCAD/Civil3D plugin patterns
**Synced by:** CTRL-004 Baseline Push

---

## How .NET Projects Are Organized

Unlike Python (one folder, one `__init__.py`), .NET uses a **solution/project**
hierarchy. Think of it like this:

```
Python world:              .NET world:
─────────────              ─────────────
repo/                      repo/
  src/                       MySolution.sln        ← "workspace" file
    module/                  MyProject/
      __init__.py              MyProject.csproj    ← "package" file (like pyproject.toml)
      code.py                  Program.cs          ← source files
  requirements.txt           MyProject.Tests/
  pyproject.toml               MyProject.Tests.csproj
                               SomeTest.cs
```

| .NET file | Python equivalent | What it does |
|-----------|------------------|--------------|
| `.sln` | workspace / monorepo root | Groups multiple projects together |
| `.csproj` | `pyproject.toml` | Defines one project: deps, target framework, build settings |
| `.cs` | `.py` | Source code file |
| `bin/` | `dist/` | Build output (compiled DLLs) — **always gitignore** |
| `obj/` | `__pycache__/` | Intermediate build files — **always gitignore** |
| `NuGet` | `pip` / PyPI | Package manager for dependencies |

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Namespaces | `PascalCase`, match folder | `VS_C3D.Commands` |
| Classes | `PascalCase` | `SharedLayerHandle` |
| Methods | `PascalCase` | `GetLayerTable()` |
| Properties | `PascalCase` | `DocumentName` |
| Private fields | `_camelCase` | `_database`, `_editor` |
| Local variables | `camelCase` | `layerName`, `blockRef` |
| Constants | `PascalCase` | `DefaultLayerColor` |
| Interfaces | `IPascalCase` | `ICommandHandler` |
| Booleans | `is/has/can` prefix | `IsValid`, `HasXref` |

**Key difference from Python:** Methods are `PascalCase` (not `snake_case`).
Private fields use `_camelCase` (not `__` dunder).

## Project Structure (AutoCAD/Civil3D Plugins)

Recommended layout for VS_C3D / VS_ORD style repos:

```
VS_C3D/
  VS_C3D.sln                    # Solution file
  VS_C3D/                       # Main project
    VS_C3D.csproj               # Project definition
    Commands/                   # AutoCAD command classes
      ReloadXref.cs
      SharedLayerHandle.cs
    Utilities/                  # Shared helpers
      LayerUtils.cs
      PathHelper.cs
    Properties/
      AssemblyInfo.cs           # Version, metadata
  VS_C3D.Tests/                 # Test project (if applicable)
    VS_C3D.Tests.csproj
  .claude/CLAUDE.md
  .gitignore
  reference/
  controller-note/
  report/
```

**Rules:**
- One `.cs` file per class (class name = file name)
- Group by feature/purpose in folders (`Commands/`, `Utilities/`)
- Keep the `.sln` at repo root
- Never nest `.csproj` more than one level deep

## .csproj Essentials

The `.csproj` file is XML that defines your project. Key elements:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net48</TargetFramework>     <!-- .NET Framework 4.8 for AutoCAD -->
    <OutputType>Library</OutputType>              <!-- DLL, not EXE -->
    <RootNamespace>VS_C3D</RootNamespace>
    <AssemblyName>VS_C3D</AssemblyName>
  </PropertyGroup>

  <!-- AutoCAD/Civil3D SDK references -->
  <ItemGroup>
    <Reference Include="accoremgd">
      <HintPath>$(AcadPath)\accoremgd.dll</HintPath>
      <Private>False</Private>                    <!-- Don't copy to output -->
    </Reference>
    <Reference Include="acdbmgd">
      <HintPath>$(AcadPath)\acdbmgd.dll</HintPath>
      <Private>False</Private>
    </Reference>
  </ItemGroup>

  <!-- NuGet packages -->
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>
</Project>
```

**Important for AutoCAD plugins:**
- Target `net48` (not `net8.0`) — AutoCAD uses .NET Framework, not .NET Core
- Set `<Private>False</Private>` on AutoCAD DLL references (they're already loaded)
- Use `<HintPath>` with environment variable for SDK path portability

## AutoCAD/Civil3D Command Pattern

```csharp
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Runtime;

namespace VS_C3D.Commands
{
    public class ReloadXref
    {
        [CommandMethod("RELOADXREF")]        // Registered command name
        public void Execute()
        {
            Document doc = Application.DocumentManager.MdiActiveDocument;
            Database db = doc.Database;
            Editor ed = doc.Editor;

            // Always use transactions for database operations
            using (Transaction tr = db.TransactionManager.StartTransaction())
            {
                try
                {
                    // ... do work ...
                    tr.Commit();
                }
                catch (System.Exception ex)
                {
                    ed.WriteMessage($"\nError: {ex.Message}");
                    tr.Abort();
                }
            }
        }
    }
}
```

**Critical patterns:**
- `using (Transaction tr = ...)` — always wrap DB ops in a transaction
- `tr.Commit()` at the end — or changes are lost
- `tr.Abort()` on error — explicitly roll back
- `[CommandMethod("NAME")]` — registers the command in AutoCAD

## Resource Management

C# uses `IDisposable` + `using` instead of Python's `with`:

```csharp
// Python:                          // C#:
// with open(f) as file:            using (var stream = File.OpenRead(f))
//     data = file.read()           {
//                                      var data = stream.ReadToEnd();
//                                  }
```

**Rules:**
- Always `using` for: `Transaction`, `StreamReader/Writer`, `Database` locks
- If a class has `.Dispose()`, wrap it in `using`
- COM objects (relevant for ORD): use `Marshal.ReleaseComObject()` in finally

## COM Interop (VS_ORD specific)

When working with COM objects (Office, AutoCAD legacy APIs):

```csharp
Excel.Application xlApp = null;
try
{
    xlApp = new Excel.Application();
    // ... work with Excel ...
}
finally
{
    if (xlApp != null)
    {
        xlApp.Quit();
        System.Runtime.InteropServices.Marshal.ReleaseComObject(xlApp);
    }
}
```

**This maps directly to GLOBAL-013** (COM lifecycle) — same rule as PowerShell
`New-Object -ComObject` requiring `try/finally`.

## Build & Output

| Command | What it does |
|---------|-------------|
| `dotnet build` | Compile — output goes to `bin/Debug/` |
| `dotnet build -c Release` | Compile release — output to `bin/Release/` |
| `dotnet clean` | Remove build artifacts |
| `dotnet restore` | Restore NuGet packages |
| `dotnet test` | Run test projects |

**For AutoCAD plugins** you may need Visual Studio or `msbuild` instead of
`dotnet` CLI (depends on whether it's SDK-style or legacy `.csproj`).

## .gitignore (Required)

```gitignore
# Build output
bin/
obj/
*.dll
*.pdb
*.exe

# IDE
.vs/
*.user
*.suo
*.cache

# NuGet
packages/

# Standard (GLOBAL-027)
.env
*.pem
*.key
```

**Never commit:** `bin/`, `obj/`, `.vs/`, `packages/`, `*.user`
**Always commit:** `.csproj`, `.sln`, source `.cs` files

## Error Handling

```csharp
// DO: Catch specific exceptions
try { /* ... */ }
catch (FileNotFoundException ex) { Log(ex.Message); }
catch (InvalidOperationException ex) { Log(ex.Message); }

// DON'T: Bare catch
try { /* ... */ }
catch { }              // Swallows everything silently

// DON'T: Catch Exception unless re-throwing
try { /* ... */ }
catch (Exception ex)
{
    Log(ex);
    throw;             // Re-throw to preserve stack trace
}
```

## Anti-Patterns to Avoid

- **Don't hardcode AutoCAD paths** — use environment variables or registry lookup
- **Don't skip `using`/`Dispose`** — leaked transactions crash AutoCAD
- **Don't put logic in `AssemblyInfo.cs`** — it's metadata only
- **Don't commit `bin/` or `obj/`** — rebuild from source
- **Don't mix .NET Framework and .NET Core** — AutoCAD plugins must target Framework
- **Don't use `var` when the type isn't obvious** — `var x = GetThing()` is unclear
- **Don't catch and swallow exceptions silently** — at minimum log them

## Quick Reference: Python → C# Translation

| Python | C# | Notes |
|--------|-----|-------|
| `def method(self):` | `public void Method()` | No `self`, use `this` (usually implicit) |
| `class Foo:` | `public class Foo` | Access modifiers required |
| `from x import y` | `using X;` | Namespaces, not files |
| `dict[str, int]` | `Dictionary<string, int>` | Generic types use `<>` |
| `list[str]` | `List<string>` | Same idea, different syntax |
| `None` | `null` | Same concept |
| `f"Hello {name}"` | `$"Hello {name}"` | String interpolation |
| `with open(f):` | `using (File.Open(f))` | Resource management |
| `try/except` | `try/catch` | Exception handling |
| `@dataclass` | `record` or `class` | C# records are similar |
| `pip install` | `dotnet add package` | Package management |
| `pytest` | `dotnet test` | Test runner |
