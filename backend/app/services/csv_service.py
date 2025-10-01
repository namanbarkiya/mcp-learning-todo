import csv
from pathlib import Path
from typing import List

from ..schemas.todo import Todo


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
CSV_FILE = DATA_DIR / "todos.csv"


def _ensure_file() -> None:
    if not CSV_FILE.exists():
        with CSV_FILE.open("w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "title", "completed"])  # header


def load_todos() -> List[Todo]:
    _ensure_file()
    todos: List[Todo] = []
    with CSV_FILE.open("r", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            todos.append(
                Todo(
                    id=int(row["id"]),
                    title=row["title"],
                    completed=row["completed"].lower() == "true",
                )
            )
    return todos


def save_todos(todos: List[Todo]) -> None:
    _ensure_file()
    with CSV_FILE.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "title", "completed"])
        writer.writeheader()
        for t in todos:
            writer.writerow({"id": t.id, "title": t.title, "completed": str(t.completed)})


def generate_next_id(todos: List[Todo]) -> int:
    if not todos:
        return 1
    return max(t.id for t in todos) + 1


