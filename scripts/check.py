"""Checks estáticos del proyecto; no ejecuta la app ni consulta datos externos."""

import ast
import json
import shutil
import subprocess
import tempfile
import tokenize
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.local_scripts = []
        self.parts = []
        self.kind = None

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            attrs = dict(attrs)
            kind = attrs.get("type", "text/javascript")
            src = attrs.get("src", "")
            if src and not src.startswith(("http:", "https:", "//")):
                self.local_scripts.append(src)
            self.kind = (
                kind
                if "src" not in attrs
                and kind in {"text/javascript", "application/javascript", "module"}
                else None
            )
            self.parts = []

    def handle_data(self, data):
        if self.kind is not None:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "script":
            if self.kind is not None:
                self.scripts.append((self.kind, "".join(self.parts)))
            self.kind = None


def main():
    python_files = sorted((ROOT / "api").rglob("*.py")) + [
        ROOT / "server.py",
        ROOT / "app_inflacion.py",
        Path(__file__).resolve(),
    ]
    for path in python_files:
        with tokenize.open(path) as source:
            ast.parse(source.read(), filename=str(path))
    print(f"OK: sintaxis de {len(python_files)} archivos Python.")

    json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    for name in (
        "public/index.html",
        "public/styles.css",
        "public/app.js",
        "public/Helvetica-Bold.ttf",
        "ponderaciones.xlsx",
    ):
        path = ROOT / name
        if not path.is_file() or path.stat().st_size == 0:
            raise ValueError(f"Input/asset ausente o vacío: {name}")
    print("OK: JSON de Vercel y presencia de inputs/assets principales.")

    parser = InlineScripts()
    parser.feed((ROOT / "public/index.html").read_text(encoding="utf-8"))
    node = shutil.which("node")
    if node is None:
        print("OMITIDO: JavaScript sin comprobar; Node no está disponible.")
    else:
        with tempfile.TemporaryDirectory(prefix="ganamos-check-") as directory:
            for index, (kind, source) in enumerate(parser.scripts):
                extension = ".mjs" if kind == "module" else ".js"
                path = Path(directory) / f"inline-{index}{extension}"
                path.write_text(source, encoding="utf-8")
                subprocess.run([node, "--check", str(path)], check=True)
        for src in parser.local_scripts:
            path = (ROOT / "public" / src.lstrip("/")).resolve()
            if not path.is_relative_to((ROOT / "public").resolve()):
                raise ValueError(f"Script fuera de public/: {src}")
            subprocess.run([node, "--check", str(path)], check=True)
        print(
            f"OK: sintaxis de {len(parser.scripts)} scripts JavaScript inline "
            f"y {len(parser.local_scripts)} scripts locales."
        )
    print(
        "Check estático terminado; no verifica tests funcionales, lint ni build Vercel."
    )


if __name__ == "__main__":
    main()
