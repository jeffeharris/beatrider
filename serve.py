#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
HOST = '127.0.0.1'

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer((HOST, PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"🎮 Beatrider Server Running")
    print(f"📍 Open in browser: http://{HOST}:{PORT}")
    print(f"Press Ctrl+C to stop")
    httpd.serve_forever()