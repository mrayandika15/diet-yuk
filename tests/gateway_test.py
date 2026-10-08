import importlib.util
import json
import os
import threading
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
os.environ['API_SERVER_KEY']='test-token-not-a-secret'
spec=importlib.util.spec_from_file_location('gateway','scripts/server/gateway.py')
gateway=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)
class Upstream(BaseHTTPRequestHandler):
    received=None
    def do_GET(self):
        self.send_response(200); self.end_headers(); self.wfile.write(b'{"data":[]}')
    def do_POST(self):
        Upstream.received=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        self.send_response(200);self.end_headers();self.wfile.write(b'{"choices":[]}')
    def log_message(self,*args): pass
class GatewayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upstream=ThreadingHTTPServer(('127.0.0.1',0),Upstream)
        gateway.UPSTREAM='http://127.0.0.1:'+str(cls.upstream.server_port)
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),gateway.Handler)
        for server in [cls.server,cls.upstream]: threading.Thread(target=server.serve_forever,daemon=True).start()
    @classmethod
    def tearDownClass(cls):
        for server in [cls.server,cls.upstream]: server.shutdown();server.server_close()
    def request(self,path,token=None,body=None):
        headers={'Content-Type':'application/json'}
        if token:headers['Authorization']='Bearer '+token
        req=urllib.request.Request('http://127.0.0.1:'+str(self.server.server_port)+path,headers=headers,data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(req) as response:return response.status,response.read()
        except urllib.error.HTTPError as error:return error.code,error.read()
    def test_auth_required(self):self.assertEqual(self.request('/v1/models')[0],401)
    def test_tools_endpoint_never_exposed(self):self.assertEqual(self.request('/v1/toolsets','test-token-not-a-secret')[0],404)
    def test_authorized_models(self):self.assertEqual(self.request('/v1/models','test-token-not-a-secret')[0],200)
    def test_strips_tool_and_model_overrides(self):
        status,_=self.request('/v1/chat/completions','test-token-not-a-secret',{'messages':[{'role':'user','content':'nasi'}],'tools':['terminal'],'model':'other','stream':True})
        self.assertEqual(status,200);self.assertNotIn('tools',Upstream.received);self.assertEqual(Upstream.received['model'],'diet-yuk');self.assertFalse(Upstream.received['stream'])
    def test_empty_messages_rejected(self):self.assertEqual(self.request('/v1/chat/completions','test-token-not-a-secret',{'messages':[]})[0],400)
if __name__=='__main__':unittest.main()
