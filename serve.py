#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
HOST = '127.0.0.1'

# Load environment variables from .env file if it exists
def load_env():
    env_vars = {}
    env_file = '.env' if os.path.exists('.env') else '.env.example' if os.path.exists('.env.example') else None
    
    if env_file:
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
            print(f"📝 Loaded settings from {env_file}")
        except Exception as e:
            print(f"⚠️  Could not read {env_file}: {e}")
    else:
        print("⚠️  No .env or .env.example file found")
    
    return env_vars

ENV_VARS = load_env()

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            # Serve the index.html with injected environment variables
            try:
                with open('index.html', 'r') as f:
                    content = f.read()
                
                # Inject environment variables into the HTML
                inject_script = f"""<script>
// Injected environment variables from .env file
window.ENV = {{
    SPOTIFY_CLIENT_ID: '{ENV_VARS.get('SPOTIFY_CLIENT_ID', '')}',
    SPOTIFY_DEFAULT_URL: '{ENV_VARS.get('SPOTIFY_DEFAULT_URL', '')}'
}};
</script>
"""
                # Insert right after <head> tag
                content = content.replace('<head>', '<head>\n' + inject_script)
                
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
                self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
                self.end_headers()
                self.wfile.write(content.encode())
                return
            except Exception as e:
                print(f"Error serving index.html: {e}")
        
        # For all other files, use the default handler
        super().do_GET()
    
    def end_headers(self):
        # Add CORS headers if needed for Spotify SDK
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer((HOST, PORT), MyHTTPRequestHandler) as httpd:
    print(f"🎮 Beatrider Server Running")
    print(f"📍 Open in browser: http://{HOST}:{PORT}")
    if ENV_VARS.get('SPOTIFY_CLIENT_ID'):
        print(f"✅ Spotify Client ID loaded from {'.env' if os.path.exists('.env') else '.env.example'}")
    else:
        print(f"⚠️  No Spotify Client ID found - copy .env.example to .env and add your ID")
    print(f"⚠️  Note: Spotify SDK requires 127.0.0.1 or HTTPS")
    print(f"Press Ctrl+C to stop")
    httpd.serve_forever()