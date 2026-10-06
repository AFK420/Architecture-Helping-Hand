"""Compatibility launcher for the current registry-driven Node browser QA."""
import os
import subprocess
from pathlib import Path

raise SystemExit(subprocess.call([os.environ.get("AHH_NODE", "node"), str(Path(__file__).with_name("qa-responsive.mjs"))]))
