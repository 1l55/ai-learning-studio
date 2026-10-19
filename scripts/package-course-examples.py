"""Package only authored standalone sources; never include local task databases."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1] / "ai-learning-mvp" / "examples"
with ZipFile(root / "08-09-backend-lab.zip", "w", ZIP_DEFLATED) as archive:
    for name in ["server.cjs", "store.cjs", "transactions.cjs", "README.md"]:
        archive.write(root / "backend-lab" / name, "backend-lab/" + name)
print("Packaged four standalone backend sources, no database files")
