"""
app_desktop.py — Sazon Native Desktop Application Window
Launches Sazon as a standalone native Desktop App window using pywebview.
"""

import sys
import os
import time
import threading
import logging
import webview

from config import DEFAULT_HOST, DEFAULT_PORT
from server import start_server

logger = logging.getLogger("sazon.desktop")


def launch_desktop_app(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
    """
    Launches Sazon in a dedicated native Desktop App window.
    """
    url = f"http://{host}:{port}"

    # 1. Start FastAPI server in a background thread
    server_thread = threading.Thread(
        target=start_server,
        kwargs={"host": host, "port": port},
        daemon=True
    )
    server_thread.start()

    # Give server 0.8s to bind socket
    time.sleep(0.8)

    print("=" * 65)
    print(" 🖥️ Launching Sazon Native Desktop Application Window")
    print(f" 🌐 Embedded Engine URL: {url}")
    print("=" * 65)

    # 2. Create PyWebView Native Desktop Window
    window = webview.create_window(
        title="Sazon — Autonomous AI Laptop Assistant",
        url=url,
        width=1320,
        height=860,
        min_size=(900, 600),
        resizable=True,
        text_select=True,
        confirm_close=False,
        background_color="#060911"
    )

    # Start native window loop (blocks until window is closed)
    webview.start(private_mode=False)


if __name__ == "__main__":
    launch_desktop_app()
