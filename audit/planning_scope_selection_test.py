import copy
import unittest
from planning_scope_selection import snapshot_fingerprint, select_scope


class PlanningScopeSelectionTests(unittest.TestCase):
    def setUp(self):
        self.doc = {'htmlSha256': 'same-runtime', 'fields': {
            'F|A': {'params': {'boomWidthM': 36.48}, 'samples': [{'id': 'P1'}]},
            'F|B': {'params': {'boomWidthM': 36.48}, 'samples': [{'id': 'P1'}]},
            'Rio de Janeiro|P6': {'params': {'bearingDeg': 120.3983}}}}
        self.analysis = {'summary': {'htmlSha256': 'same-runtime', 'individualSnapshotFingerprint': snapshot_fingerprint(self.doc), 'analysisFingerprint': 'analysis1'},
                         'blocks': [{'id': 'AB', 'members': ['F|A', 'F|B'], 'status': 'sampled-geometry-pass-access-pending'}]}

    def test_individual_is_exact_copy_even_if_member_of_a_block(self):
        r = select_scope(self.doc, self.analysis, 'individual', ['F|A'])
        self.assertEqual(r['plan'], self.doc['fields']['F|A'])
        r['plan']['params']['boomWidthM'] = 40
        self.assertEqual(self.doc['fields']['F|A']['params']['boomWidthM'], 36.48)

    def test_block_selection_does_not_mutate_individuals_or_enable_execution(self):
        before = copy.deepcopy(self.doc)
        r = select_scope(self.doc, self.analysis, 'block', ['F|B', 'F|A'])
        self.assertEqual(r['status'], 'geometry-candidate-only')
        self.assertFalse(r['executionEnabled'])
        self.assertFalse(r['accessConfirmed'])
        self.assertEqual(self.doc, before)

    def test_changed_individual_params_make_old_block_stale(self):
        self.doc['fields']['F|A']['params']['boomWidthM'] = 40
        self.assertEqual(select_scope(self.doc, self.analysis, 'block', ['F|A', 'F|B'])['status'], 'stale-block-analysis')

    def test_stale_block_does_not_prevent_current_individual_use(self):
        self.doc['fields']['F|A']['params']['boomWidthM'] = 40
        self.assertEqual(select_scope(self.doc, self.analysis, 'individual', ['F|A'])['plan']['params']['boomWidthM'], 40)

    def test_p6_preserved_without_global_block(self):
        r = select_scope(self.doc, self.analysis, 'individual', ['Rio de Janeiro|P6'])
        self.assertEqual(r['plan']['params']['bearingDeg'], 120.3983)
        self.assertTrue(r['p6ReviewDeferred'])
        self.assertEqual(select_scope(self.doc, self.analysis, 'block', ['F|A', 'F|B'])['status'], 'geometry-candidate-only')

    def test_unassessed_combinations_are_not_falsely_enabled(self):
        r = select_scope(self.doc, self.analysis, 'block', ['F|A', 'Rio de Janeiro|P6'])
        self.assertEqual(r['status'], 'not-assessed')
        self.assertFalse(r['executionEnabled'])

    def test_conflicting_block_keeps_individual_options(self):
        self.analysis['blocks'][0]['status'] = 'needs-redistribution-in-restricted-search'
        r = select_scope(self.doc, self.analysis, 'block', ['F|A', 'F|B'])
        self.assertEqual(r['status'], 'needs-redistribution-in-restricted-search')
        self.assertEqual(r['individualOptions'], ['F|A', 'F|B'])

    def test_invalid_scope_or_members_are_not_converted_silently(self):
        for mode, members in [('block', ['F|A']), ('individual', ['F|A', 'F|B']), ('other', ['F|A']), ('block', ['F|A', 'F|A']), ('individual', ['F|X'])]:
            with self.subTest(mode=mode, members=members), self.assertRaises(ValueError):
                select_scope(self.doc, self.analysis, mode, members)
