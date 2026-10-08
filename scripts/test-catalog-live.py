"""Administrative VPS smoke test: ssh opencraft python3 - < scripts/test-catalog-live.py"""
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


def api(path, method='GET', body=None):
    key = os.environ['DIET_YUK_SUPABASE_SERVICE_KEY']
    request = urllib.request.Request(os.environ['DIET_YUK_SUPABASE_URL'] + path,
        method=method, data=None if body is None else json.dumps(body).encode(),
        headers={'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


owner = next(u for u in api('/auth/v1/admin/users')['users'] if u['email'] == 'mrayandika.work@gmail.com' and u['app_metadata']['provider'] == 'google')
jobs = []


def run_job(payload):
    job_id = str(uuid4())
    jobs.append(job_id)
    started = time.monotonic()
    api('/rest/v1/ai_analysis_jobs', 'POST', {'id': job_id, 'user_id': owner['id'], **payload})
    while time.monotonic() - started < 180:
        time.sleep(2)
        job = api('/rest/v1/ai_analysis_jobs?id=eq.' + job_id + '&select=status,result,error,image_base64,profile_payload')[0]
        if job['status'] == 'failed':
            raise RuntimeError(job['error'])
        if job['status'] == 'completed':
            assert job['profile_payload'] is None and job['image_base64'] is None, 'Raw payload retained'
            print(json.dumps({'kind': payload['kind'], 'status': 'PASS', 'seconds': round(time.monotonic() - started),
                'foods': [f['name'] for f in job['result']['items']], 'questions': len(job['result'].get('questions', [])), 'payloadCleared': True}, ensure_ascii=False), flush=True)
            return job['result']
    raise TimeoutError('Live analysis timed out')

try:
    result = run_job({'kind': 'food_catalog', 'profile_payload': {'kind': 'ingredient', 'id': 'Eggs', 'preparation': 'boiled'}})
    food = result['items'][0]
    assert len(result['items']) == 1 and food['portion_g'] == 100
    assert 80 < food['calories'] < 250 and food['image_url'].endswith('/eggs-small.png')
    assert food['image_source'] == 'TheMealDB'
    print(json.dumps({'selection': 'boiled eggs', 'per100g': food['calories'], 'imageVerified': True}), flush=True)
    # The source recipe ID is obtained from the real API, never invented.
    request = urllib.request.Request('https://www.themealdb.com/api/json/v1/1/search.php?s=rendang', headers={'User-Agent': 'DietYuk/1.0'})
    with urllib.request.urlopen(request, timeout=20) as response:
        recipe = json.load(response)['meals'][0]
    result = run_job({'kind': 'food_catalog', 'profile_payload': {'kind': 'meal', 'id': recipe['idMeal'], 'preparation': 'as_listed'}})
    food = result['items'][0]
    assert len(result['items']) == 1 and food['portion_g'] == 100 and food['calories'] > 0
    assert food['image_url'] == recipe['strMealThumb'] and food['image_source'] == 'TheMealDB'
    print(json.dumps({'selection': recipe['strMeal'], 'per100g': food['calories'], 'imageVerified': True}), flush=True)
finally:
    for job_id in jobs:
        api('/rest/v1/ai_analysis_jobs?id=eq.' + job_id, 'DELETE')
    print('Temporary catalog jobs removed; saved meals and profiles unchanged', flush=True)
