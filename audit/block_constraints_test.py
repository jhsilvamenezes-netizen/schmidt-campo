import copy
import unittest
from block_constraints import validate_snapshot


class BlockConstraintsTests(unittest.TestCase):
    def setUp(self):
        ring = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]
        self.fields = {'A': {'geom': [[ring]], 'centroidUTM': [0, 0], 'farm': 'same'},
                       'B': {'geom': [[ring]], 'centroidUTM': [103, 0], 'farm': 'same'}}
        self.samples = {k: [{'id': 'P1', 'x': 50, 'y': 50}] for k in self.fields}
        self.minimums = {'A': 1, 'B': 1}

    def check(self, margin=20, **kwargs):
        return validate_snapshot(self.fields, self.samples, self.minimums, margin,
                                 access_confirmed=True, operation_confirmed=True, **kwargs)

    def test_valid_snapshot_is_not_a_verified_route(self):
        r = self.check()
        self.assertEqual(r['status'], 'snapshot-valid')
        self.assertFalse(r['routeGenerated'])
        self.assertFalse(r['uniformCoverageVerified'])
        self.assertFalse(r['timeSavingVerified'])

    def test_access_and_operation_are_not_inferred_from_proximity(self):
        r = validate_snapshot(self.fields, self.samples, self.minimums, 20)
        self.assertIn('access-not-confirmed', r['issues'])
        self.assertIn('operation-not-confirmed', r['issues'])

    def test_unknown_clearance_blocks_without_defaulting_to_half_boom(self):
        self.assertIn('clearance-not-defined', self.check(None)['issues'])

    def test_moved_point_is_checked_against_own_field(self):
        self.samples['A'][0]['x'] = 10
        self.assertIn('clearance-conflict', self.check()['issues'])

    def test_outside_is_rejected_even_for_zero_recuo(self):
        self.samples['A'][0]['x'] = -1e-8
        self.assertIn('outside-own-field', self.check(0)['issues'])

    def test_internal_division_is_not_removed_by_block(self):
        self.fields['B']['centroidUTM'] = [100, 0]
        self.samples['A'][0]['x'] = 99
        self.assertIn('clearance-conflict', self.check()['issues'])

    def test_holes_are_respected(self):
        self.fields['A']['geom'][0].append([[40, 40], [60, 40], [60, 60], [40, 60], [40, 40]])
        self.assertIn('outside-own-field', self.check()['issues'])

    def test_infeasible_margin_is_not_relaxed(self):
        before = copy.deepcopy(self.samples)
        self.assertIn('clearance-conflict', self.check(51)['issues'])
        self.assertEqual(before, self.samples)

    def test_empty_field_fails_its_minimum(self):
        self.samples['B'] = []
        r = self.check()
        self.assertIn('field-below-minimum', r['issues'])
        self.assertIsNone(r['fields'][1]['minimumBoundaryDistanceM'])

    def test_total_count_cannot_compensate_missing_points_in_one_field(self):
        self.samples['A'].append({'id': 'P2', 'x': 40, 'y': 40})
        self.samples['B'] = []
        self.assertIn('field-below-minimum', self.check()['issues'])

    def test_duplicate_id_only_disallowed_within_same_field(self):
        self.samples['A'].append(dict(self.samples['A'][0]))
        with self.assertRaises(ValueError):
            self.check()

    def test_invalid_coordinates_and_margin_fail_closed(self):
        for value in [float('nan'), float('inf'), True, '20', -1]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.check(value)
        self.samples['A'][0]['x'] = float('nan')
        with self.assertRaises(ValueError):
            self.check()

    def test_mismatched_data_sets_are_rejected(self):
        del self.minimums['B']
        with self.assertRaises(ValueError):
            self.check()

    def test_overlap_is_not_counted_as_extra_coverage(self):
        self.fields['B']['centroidUTM'] = [50, 0]
        self.assertIn('overlap-requires-review', self.check()['issues'])

    def test_directed_samples_do_not_claim_uniform_coverage(self):
        r = self.check(sampling_mode='directed')
        self.assertEqual(r['samplingMode'], 'directed')
        self.assertFalse(r['uniformCoverageVerified'])

    def test_same_farm_must_be_known(self):
        self.fields['B']['farm'] = 'other'
        self.assertIn('farm-mismatch-or-unknown', self.check()['issues'])

    def test_boolean_confirmation_cannot_be_string(self):
        with self.assertRaises(ValueError):
            validate_snapshot(self.fields, self.samples, self.minimums, 20,
                              access_confirmed='false', operation_confirmed=True)


if __name__ == '__main__':
    unittest.main()
