import importlib.util
import json
import unittest
spec = importlib.util.spec_from_file_location('ai_worker', 'scripts/server/ai-worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

class AnalysisTests(unittest.TestCase):
    def test_accepts_fenced_json_and_non_food(self):
        self.assertEqual(worker.parse_analysis('```json\n{"items":[]}\n```'), {'items': [], 'notes': '', 'questions': []})
    def test_rejects_missing_negative_and_nonfinite_nutrients(self):
        food = {'name': 'Nasi', 'portion_g': 100, 'calories': 130, 'protein_g': 3, 'carbs_g': 28, 'fat_g': 1}
        self.assertEqual(len(worker.parse_analysis(json.dumps({'items': [food]}))['items']), 1)
        for value in [-1, True, float('nan'), float('inf'), 20001, None]:
            with self.assertRaises(ValueError):
                worker.parse_analysis(json.dumps({'items': [{**food, 'calories': value}]}))
        with self.assertRaises(ValueError):
            worker.parse_analysis('{"items":[{"name":"Nasi"}]}')
    def test_does_not_report_completed_when_ai_rejects_photo(self):
        calls = []
        original_analyze, original_rpc = worker.analyze, worker.rpc
        def fail(_): raise ValueError('not parseable')
        worker.analyze = fail
        worker.rpc = lambda name, body: calls.append((name, body))
        try:
            job = {'id': 'job', 'lease_token': 'lease', 'image': 'private photo'}
            worker.process(job)
            self.assertNotIn('image', job)
            self.assertEqual(calls[0][0], 'finish_food_analysis')
            self.assertIsNone(calls[0][1]['analysis'])
            self.assertIsNotNone(calls[0][1]['failure'])
        finally:
            worker.analyze, worker.rpc = original_analyze, original_rpc

class ConfirmationTests(unittest.TestCase):
    food = {'name': 'Telur rebus', 'portion_g': 55, 'calories': 85, 'protein_g': 7, 'carbs_g': 1, 'fat_g': 6}
    question = {'id': 'egg', 'item_index': 0, 'kind': 'egg_type', 'text': 'Telur biasa atau omega?', 'options': [{'id': 'regular', 'label': 'Telur biasa'}, {'id': 'omega', 'label': 'Telur omega'}]}

    def test_questions_are_optional_and_bad_questions_do_not_lose_foods(self):
        base = {'items': [self.food], 'questions': [self.question]}
        self.assertEqual(len(worker.parse_analysis(json.dumps(base))['questions']), 1)
        for q in [{**self.question, 'item_index': 1}, {**self.question, 'id': 1}, {**self.question, 'options': []}]:
            parsed = worker.parse_analysis(json.dumps({**base, 'questions': [q]}))
            self.assertEqual(parsed['questions'], [])
            self.assertEqual(parsed['items'][0], self.food)

    def test_omega_answer_never_invents_calories_and_unanswered_food_is_preserved(self):
        other = {**self.food, 'name': 'Nasi putih', 'calories': 260}
        base = {'items': [self.food, other], 'questions': [self.question]}
        proposed = {'items': [{**self.food, 'name': 'Telur omega rebus', 'calories': 500}, {**other, 'calories': 1}], 'notes': 'Jenis telur dikonfirmasi.'}
        result = worker.apply_refinement(base, {'egg': 'omega'}, proposed)
        self.assertEqual(result['items'][0]['calories'], 85)
        self.assertEqual(result['items'][0]['name'], 'Telur omega rebus')
        self.assertEqual(result['items'][1], other)
        self.assertEqual(result['questions'], [])

    def test_preparation_can_update_estimate_but_cannot_change_portions_or_add_food(self):
        base = {'items': [self.food], 'questions': [{**self.question, 'kind': 'preparation'}]}
        result = worker.apply_refinement(base, {'egg': 'omega'}, {'items': [{**self.food, 'calories': 108}]})
        self.assertEqual(result['items'][0]['calories'], 108)
        for proposed in [{'items': []}, {'items': [{**self.food, 'portion_g': 100}]}]:
            with self.assertRaises(ValueError):
                worker.apply_refinement(base, {'egg': 'omega'}, proposed)
        for answers in [{}, {'unknown': 'omega'}, {'egg': 'unlisted'}]:
            with self.assertRaises(ValueError):
                worker.apply_refinement(base, answers, base)

class CatalogTests(unittest.TestCase):
    def test_food_image_comes_from_api_not_model_and_portion_must_be_100(self):
        image = 'https://www.themealdb.com/images/ingredients/eggs-small.png'
        food = {'name': 'Telur rebus', 'portion_g': 100, 'calories': 155, 'protein_g': 13, 'carbs_g': 1, 'fat_g': 11, 'image_url': 'https://evil.test/image.jpg'}
        result = worker.parse_catalog_estimate(json.dumps({'items': [food]}), image)
        self.assertEqual(result['items'][0]['image_url'], image)
        self.assertEqual(result['items'][0]['image_source'], 'TheMealDB')
        for change in [{'portion_g': 55}, {'calories': 1500}, {'protein_g': 101}]:
            with self.assertRaises(ValueError):
                worker.parse_catalog_estimate(json.dumps({'items': [{**food, **change}]}), image)

    def test_recipe_id_and_image_host_are_checked_before_model_call(self):
        from unittest.mock import patch
        with patch.object(worker, 'mealdb') as api:
            for selection in [{'kind': 'meal', 'id': 'https://evil.test', 'preparation': 'as_listed'}, {'kind': 'meal', 'id': '12345', 'preparation': 'fried'}]:
                with self.assertRaises(ValueError): worker.catalog_context(selection)
            api.assert_not_called()
        meal = {'idMeal': '12345', 'strMeal': 'Rendang', 'strMealThumb': 'https://www.themealdb.com/images/media/meals/rendang.jpg', 'strIngredient1': 'Beef', 'strMeasure1': '500g'}
        with patch.object(worker, 'mealdb', return_value={'meals': [meal]}):
            context, image = worker.catalog_context({'kind': 'meal', 'id': '12345', 'preparation': 'as_listed'})
            self.assertEqual(context['ingredients'][0]['measure'], '500g')
            self.assertEqual(image, meal['strMealThumb'])
        with patch.object(worker, 'mealdb', return_value={'meals': [{**meal, 'strMealThumb': 'https://evil.test/photo.jpg'}]}):
            with self.assertRaises(ValueError): worker.catalog_context({'kind': 'meal', 'id': '12345', 'preparation': 'as_listed'})

    def test_ingredient_must_exist_in_api_directory(self):
        from unittest.mock import patch
        old_names, old_time = worker._catalog_names, worker._catalog_updated
        worker._catalog_names = []
        try:
            with patch.object(worker, 'mealdb', return_value={'meals': [{'strIngredient': 'Eggs'}]}):
                context, image = worker.catalog_context({'kind': 'ingredient', 'id': 'Eggs', 'preparation': 'boiled'})
                self.assertEqual(context['preparation'], 'direbus')
                self.assertTrue(image.endswith('/eggs-small.png'))
                with self.assertRaises(ValueError): worker.catalog_context({'kind': 'ingredient', 'id': 'Invented Food', 'preparation': 'boiled'})
        finally: worker._catalog_names, worker._catalog_updated = old_names, old_time

class CalorieTests(unittest.TestCase):
    def test_shared_calorie_vectors(self):
        with open('tests/calorie-vectors.json') as source:
            vectors = json.load(source)
        for vector in vectors:
            actual = worker.calculate_calorie_plan(vector['profile'], vector['day'])
            for key, expected in vector['expected'].items():
                self.assertEqual(actual[key], expected, key)

    def test_model_cannot_override_numbers(self):
        notes = worker.parse_plan_notes(json.dumps({'explanation': 'Mulai bertahap.', 'activityInsight': 'Rutinitas cukup ringan.',
            'needsReview': False, 'reviewReason': '', 'calorieTarget': 500}))
        self.assertNotIn('calorieTarget', notes)
        with self.assertRaises(ValueError):
            worker.parse_plan_notes('{"explanation":"Makan 500 kkal.","activityInsight":"","needsReview":false,"reviewReason":""}')

    def test_offline_model_falls_back_to_formula(self):
        from unittest.mock import patch
        profile = {'birthDate': '2000-01-01', 'sex': 'male', 'height': 170, 'weight': 70, 'targetWeight': 65, 'activity': 1.375, 'bio': 'Kerja duduk, jalan sore.'}
        with patch.object(worker.urllib.request, 'urlopen', side_effect=RuntimeError('offline')):
            plan = worker.plan_calories(profile)
        self.assertEqual(plan['explanationSource'], 'formula')
        self.assertEqual(plan['calorieTarget'], worker.calculate_calorie_plan(profile)['calorieTarget'])
        self.assertFalse(plan['needsReview'])
        with patch.object(worker.urllib.request, 'urlopen', side_effect=RuntimeError('offline')):
            self.assertFalse(worker.plan_calories({**profile, 'bio': 'Tidak sedang hamil.'})['needsReview'])
        self.assertTrue(worker.plan_calories({**profile, 'bio': 'Saya sedang hamil.'})['needsReview'])

    def test_rejects_special_requirements_and_unsafe_targets(self):
        profile = {'birthDate': '2000-01-01', 'sex': 'male', 'height': 170, 'weight': 70, 'targetWeight': 65, 'activity': 1.375}
        for changes in [{'weight': True}, {'birthDate': '2000-02-31'}, {'targetWeight': 40}, {'requiresClinicalPlan': True}, {'activity': 2}]:
            with self.assertRaises(ValueError):
                worker.calculate_calorie_plan({**profile, **changes})
