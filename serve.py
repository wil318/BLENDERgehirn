#!/usr/bin/env python3
"""Minimaler statischer Server für die lokale Vorschau von web/ (nur Python-Bordmittel).
Aufruf: python3 serve.py [port]   →  http://127.0.0.1:5173
"""
import http.server, mimetypes, os, sys, functools

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


handler = functools.partial(Handler, directory=ROOT)
with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as srv:
    print(f"Gehirn-Viewer: http://127.0.0.1:{PORT}", flush=True)
    srv.serve_forever()
