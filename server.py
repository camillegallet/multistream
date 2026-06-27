#!/usr/bin/env python3
"""Dev server with SPA fallback — serves index.html for unknown paths."""

import http.server
import os
import sys


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # If the file exists, serve it normally
        translated = self.translate_path(self.path)
        if os.path.isfile(translated):
            return super().do_GET()

        # Otherwise serve index.html (SPA fallback)
        self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    host = "0.0.0.0"

    server = http.server.HTTPServer((host, port), SPAHandler)
    print(f"→ Serving at http://{host}:{port}")
    print(f"→ Try  http://{host}:{port}/niniste/isayaya")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()
