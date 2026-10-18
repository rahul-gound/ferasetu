import subprocess
import os

try:
    subprocess.run(["git", "push", "-f", "origin", "HEAD:bolt-analytics-json-optimization-14402450009095275062"], check=True)
except subprocess.CalledProcessError as e:
    print(f"Error: {e}")
