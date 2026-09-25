#!/usr/bin/env python
"""
Launcher script for Sazon — Autonomous AI Laptop Assistant.

Usage:
  python run.py           -> Launches Native Desktop App Window (Sazon App)
  python run.py --app     -> Launches Native Desktop App Window
  python run.py --web     -> Launches Web Version in Browser (http://127.0.0.1:8000)
  python run.py --gui     -> Launches Legacy Tkinter Window
"""

import sys
import os
import time
import webbrowser
import threading

from config import DEFAULT_HOST, DEFAULT_PORT


def main():
    args = [a.lower() for a in sys.argv[1:]]

    # Legacy Tkinter GUI
    if "--gui" in args or "--tkinter" in args or "--legacy" in args:
        print("Launching Sazon Legacy Tkinter GUI...")
        from gui import launch_gui
        launch_gui()
        return

    # Web Dashboard Mode
    if "--web" in args or "--browser" in args:
        url = f"http://{DEFAULT_HOST}:{DEFAULT_PORT}"
        print("=" * 65)
        print(" 🌐 Launching Sazon Web Version in Browser")
        print(f" 🔗 URL: {url}")
        print("=" * 65)

        def open_browser():
            time.sleep(1.2)
            webbrowser.open(url)

        threading.Thread(target=open_browser, daemon=True).start()
        from server import start_server
        start_server(host=DEFAULT_HOST, port=DEFAULT_PORT)
        return

    # Default / App Mode: Native Desktop App Window
    print("=" * 65)
    print(" 🖥️ Launching Sazon Native Desktop Application Window")
    print(" (Tip: Run 'python run.py --web' to launch Web version in browser)")
    print("=" * 65)

    try:
        from app_desktop import launch_desktop_app
        launch_desktop_app(host=DEFAULT_HOST, port=DEFAULT_PORT)
    except Exception as e:
        print(f"Native window launch note: {e}. Falling back to Web Dashboard...")
        url = f"http://{DEFAULT_HOST}:{DEFAULT_PORT}"
        webbrowser.open(url)
        from server import start_server
        start_server(host=DEFAULT_HOST, port=DEFAULT_PORT)


if __name__ == "__main__":
    main()
