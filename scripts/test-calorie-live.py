"""Administrative smoke test on the VPS: temporary job, no saved profile changes."""
import importlib.util
import json
import os
from pathlib import Path
import time
import urllib.request
from uuid import uuid4

for line in (Path.home() / '.config/diet-yuk/ai-worker.env').read_text().splitlines():
    if '=' in line:
        key, value = line.split('=', 1)
        os.environ[key] = value
spec = importlib.util.spec_from_file_location('worker', Path.home() / '.local/share/diet-yuk/ai-worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def api(path, method='GET', body=None):
    key = os.environ['DIET_YUK_SUPABASE_SERVICE_KEY']
    request = urllib.request.Request(os.environ['DIET_YUK_SUPABASE_URL'] + path,
        method=method, data=None if body is None else json.dumps(body).encode(),
        headers={'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read()
        return json.loads(raw) if raw else None

users = api('/auth/v1/admin/users')['users']
owner = next(u for u in users if u['email'] == 'mrayandika.work@gmail.com' and u['app_metadata']['provider'] == 'google')
profile = {'birthDate': '2000-01-01', 'sex': 'male', 'height': 170, 'weight': 70,
           'targetWeight': 65, 'activity': 1.375, 'bio': 'Kerja duduk, jalan sore. Ingin turun berat bertahap.'}
expected = worker.calculate_calorie_plan(profile)
job_id = str(uuid4())
started = time.monotonic()
try:
    api('/rest/v1/ai_analysis_jobs', 'POST', {'id': job_id, 'user_id': owner['id'],
        'kind': 'calorie_plan', 'profile_payload': profile})
    print('Temporary calorie plan queued', flush=True)
    while time.monotonic() - started < 180:
        time.sleep(2)
        job = api('/rest/v1/ai_analysis_jobs?id=eq.' + job_id + '&select=status,result,error,profile_payload')[0]
        if job['status'] == 'failed':
            raise RuntimeError(job['error'])
        if job['status'] == 'completed':
            assert job['profile_payload'] is None, 'Raw profile was not cleared'
            for field in ['age', 'bmr', 'maintenance', 'adjustment', 'calorieTarget', 'goal']:
                assert job['result'][field] == expected[field], field
            assert job['result']['explanationSource'] == 'ai', 'Live AI explanation unavailable'
            assert not job['result']['needsReview'], 'Ordinary profile unexpectedly rejected'
            print(json.dumps({'status': 'PASS', 'seconds': round(time.monotonic() - started),
                'target': job['result']['calorieTarget'], 'explanationSource': job['result']['explanationSource'],
                'explanation': job['result']['explanation'], 'profileCleared': True}, ensure_ascii=False), flush=True)
            break
    else:
        raise TimeoutError('Calorie plan timed out')
finally:
    api('/rest/v1/ai_analysis_jobs?id=eq.' + job_id, 'DELETE')
    print('Temporary calorie plan removed; user profile unchanged', flush=True)
