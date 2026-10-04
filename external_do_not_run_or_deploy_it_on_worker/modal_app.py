import modal
import os
import signal
import subprocess
import time
import shutil


APP_NAME = "omniroute-server"
PORT = 20128

# Persistent OmniRoute data
volume = modal.Volume.from_name(
    "omniroute-data",
    create_if_missing=True,
)

# Your OmniRoute secrets/environment variables
secret = modal.Secret.from_name("omniroute-env")

# Official OmniRoute image.
# IMPORTANT:
# add_python is ONLY for Modal's Python runtime wrapper.
# OmniRoute itself still runs on Node.js.
image = modal.Image.from_registry(
    "diegosouzapw/omniroute:latest-web",
    add_python="3.12",
).entrypoint([])

app = modal.App(APP_NAME)


@app.function(
    image=image,
    cpu=1.0,
    memory=1024,
    timeout=60 * 60 * 24,
    startup_timeout=180,
    max_containers=1,
    volumes={
        "/app/data": volume,
    },
    secrets=[secret],
    env={
        "HOSTNAME": "0.0.0.0",
        "PORT": str(PORT),
        "DATA_DIR": "/app/data",

        # Keep OmniRoute within your 1 GB container.
        "OMNIROUTE_MEMORY_MB": "768",
        "NODE_OPTIONS": "--max-old-space-size=768",

        "NODE_ENV": "production",
    },
)
@modal.web_server(
    PORT,
    startup_timeout=180,
)
def omniroute_server():

    print("Starting OmniRoute...")
    print(f"Port: {PORT}")
    print("Data directory: /app/data")

    print("cwd:", os.getcwd())

    node_path = shutil.which("node")
    print("node:", node_path)
    if not node_path:
        raise RuntimeError("Node.js not found in PATH.")

    print("/app exists:", os.path.exists("/app"))
    print("/app/dev/run-standalone.mjs exists:",
          os.path.exists("/app/dev/run-standalone.mjs"))
    print("/app/check-permissions.sh exists:",
          os.path.exists("/app/check-permissions.sh"))

    data_dir = "/app/data"
    print(f"Checking writability of {data_dir}...")
    if not os.path.exists(data_dir):
        print(f"Creating {data_dir}...")
        os.makedirs(data_dir)
    if not os.access(data_dir, os.W_OK):
        raise RuntimeError(f"Volume mounted at {data_dir} is not writable.")
    print(f"Volume mounted at {data_dir} is writable.")

    process = subprocess.Popen(
        ["node", "/app/dev/run-standalone.mjs"],
        cwd="/app",
        env=os.environ.copy(),
    )

    def shutdown(signum, frame):
        print("Stopping OmniRoute...")

        try:
            # Give OmniRoute a chance to shut down cleanly.
            process.terminate()
            process.wait(timeout=20)
        except subprocess.TimeoutExpired:
            process.kill()

        # Persist OmniRoute data.
        try:
            volume.commit()
            print("OmniRoute volume committed.")
        except Exception as exc:
            print(f"Volume commit failed: {exc}")

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    # Keep the Modal container alive while OmniRoute is running.
    while process.poll() is None:
        time.sleep(2)

    exit_code = process.returncode
    print(f"OmniRoute exited with code: {exit_code}")

    # Persist any final changes.
    try:
        volume.commit()
    except Exception as exc:
        print(f"Final volume commit failed: {exc}")

    if exit_code != 0:
        raise RuntimeError(
            f"OmniRoute exited unexpectedly with code {exit_code}"
        )


@app.local_entrypoint()
def main():
    print("Deploy with:")
    print("  modal deploy modal_app.py")