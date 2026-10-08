"""Run on VPS after copying the public TheMealDB rendition to /tmp/diet-yuk-food-test.jpg.
Administrative fixtures only; no saved meals or profiles are changed.
ssh opencraft python3 - < scripts/test-food-confirmation-live.py
"""
import base64
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
    result = run_job({'kind': 'food', 'image_base64': base64.b64encode(Path('/tmp/diet-yuk-food-test.jpg').read_bytes()).decode()})
    assert result['items'], 'Public food photo not recognized'
    egg = {'name': 'Telur rebus', 'portion_g': 55, 'calories': 85, 'protein_g': 7, 'carbs_g': 1, 'fat_g': 6}
    rice = {'name': 'Nasi putih', 'portion_g': 200, 'calories': 260, 'protein_g': 5, 'carbs_g': 56, 'fat_g': 1}
    question = {'id': 'egg', 'item_index': 0, 'kind': 'egg_type', 'text': 'Jenis telurnya?', 'options': [{'id': 'omega', 'label': 'Telur omega'}, {'id': 'regular', 'label': 'Telur biasa'}]}
    original = {'items': [egg, rice], 'questions': [question], 'notes': 'Estimasi awal foto.'}
    result = run_job({'kind': 'food_refinement', 'profile_payload': {'original': original, 'answers': {'egg': 'omega'}}})
    assert result['items'][0]['calories'] == 85 and result['items'][1] == rice
    assert 'omega' in result['items'][0]['name'].lower() and result['questions'] == []
    question = {**question, 'kind': 'preparation', 'text': 'Telur dimasak bagaimana?', 'options': [{'id': 'fried', 'label': 'Diceplok dengan minyak'}, {'id': 'boiled', 'label': 'Direbus'}]}
    result = run_job({'kind': 'food_refinement', 'profile_payload': {'original': {**original, 'questions': [question]}, 'answers': {'egg': 'fried'}}})
    assert result['items'][0]['calories'] > 85 and result['items'][0]['portion_g'] == 55
    assert result['items'][1] == rice and result['questions'] == []
    print('PASS: omega preserves calories; cooking answer updates estimate; unanswered foods unchanged', flush=True)
finally:
    for job_id in jobs:
        api('/rest/v1/ai_analysis_jobs?id=eq.' + job_id, 'DELETE')
    Path('/tmp/diet-yuk-food-test.jpg').unlink(missing_ok=True)
    print('Temporary photo/jobs removed; saved meals and profiles unchanged', flush=True)
