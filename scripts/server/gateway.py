"""Minimal authenticated public facade for the private Hermes profile.
Run behind HTTPS (Cloudflare Tunnel/Caddy). Never expose Hermes directly.
"""
import hmac
import json
import os
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ['API_SERVER_KEY']
UPSTREAM = os.environ.get('HERMES_URL', 'http://127.0.0.1:8642')
SLOTS = threading.BoundedSemaphore(2)
MAX_BODY = 8 * 1024 * 1024

class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self.proxy()

    def do_POST(self):
        self.proxy()

    def proxy(self):
        if (self.command, self.path) not in [('GET', '/v1/models'), ('POST', '/v1/chat/completions')]:
            return self.reply(404, b'{"error":"Not found"}')
        if not hmac.compare_digest(self.headers.get('Authorization', '').encode(), ('Bearer ' + KEY).encode()):
            return self.reply(401, b'{"error":"Unauthorized"}')
        try:
            size = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.reply(400, b'{"error":"Invalid length"}')
        if size < 0 or size > MAX_BODY:
            return self.reply(413, b'{"error":"Image too large"}')
        if not SLOTS.acquire(blocking=False):
            return self.reply(429, b'{"error":"Busy, retry shortly"}')
        try:
            data = None
            if self.command == 'POST':
                body = json.loads(self.rfile.read(size))
                if not isinstance(body, dict) or not isinstance(body.get('messages'), list) or not body['messages']:
                    return self.reply(400, b'{"error":"Missing messages"}')
                # Allow only the fixed profile, no tool execution or streaming override.
                data = json.dumps({'model': 'diet-yuk', 'messages': body['messages'],
                    'stream': False, 'temperature': 0.2,
                    'response_format': {'type': 'json_object'}}).encode()
            req = urllib.request.Request(UPSTREAM + self.path, data=data,
                headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'}, method=self.command)
            with urllib.request.urlopen(req, timeout=110) as response:
                self.reply(response.status, response.read())
        except (ValueError, TypeError):
            self.reply(400, b'{"error":"Invalid JSON"}')
        except urllib.error.HTTPError as error:
            self.reply(error.code, b'{"error":"AI request rejected"}')
        except Exception:
            self.reply(502, b'{"error":"AI temporarily unavailable"}')
        finally:
            SLOTS.release()

    def log_message(self, fmt, *args):
        # Never log request bodies, photos or authorization headers.
        print('%s %s' % (self.command, self.path), flush=True)

if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8643), Handler).serve_forever()
