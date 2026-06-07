from pathlib import Path
import zipfile
import shutil

base = Path(r"C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX")
out = base / "_extracted_docs"
out.mkdir(exist_ok=True)

targets = []
for p in base.glob("*.zip"):
    name = p.name.lower()
    if p.name == "Developer Handover Guide.zip" or name.startswith("hươ") or name.startswith("huo"):
        targets.append(p)

print(f"COUNT {len(targets)}")
for i, src in enumerate(sorted(targets, key=lambda x: x.name), 1):
    safe_name = f"doc_{i:02d}_{src.stem}"
    dest = out / safe_name
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(src) as zf:
        zf.extractall(dest)
    print(f"EXTRACTED {i}: {src.name} -> {dest}")
