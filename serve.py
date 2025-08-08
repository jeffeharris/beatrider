#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
HOST = '127.0.0.1'

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow cross-origin resources for Spotify SDK
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer((HOST, PORT), MyHTTPRequestHandler) as httpd:
    print(f"🎮 Beat Shooter Server Running")
    print(f"📍 Open in browser: http://{HOST}:{PORT}")
    print(f"⚠️  Note: Spotify SDK requires 127.0.0.1 or HTTPS")
    print(f"Press Ctrl+C to stop")
    httpd.serve_forever()