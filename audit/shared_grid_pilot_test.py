import copy
import unittest
from shapely.geometry import Polygon, box, LineString
from shapely.affinity import translate
import shared_grid_pilot as pilot

class SharedGridPilotTests(unittest.TestCase):
    def test_common_axes_are_recropped_separately_without_filling_gap(self):
        fields = {'A': box(0, 0, 100, 100), 'B': box(0, 103, 100, 203)}
        g = pilot.common_grid(fields, [0, 1], 20, 10)
        for s in g['segments']:
            self.assertTrue(fields[s['field']].covers(LineString(s['line'])))
        a = {s['gridId'] for s in g['segments'] if s['field'] == 'A'}
        b = {s['gridId'] for s in g['segments'] if s['field'] == 'B'}
        self.assertEqual(a, b)
        self.assertEqual(len(a), 5)

    def test_hole_splits_line_instead_of_creating_false_sampling_segment(self):
        outer = [(0, 0), (100, 0), (100, 100), (0, 100)]
        hole = [(40, 40), (60, 40), (60, 60), (40, 60)]
        geom = Polygon(outer, [hole])
        g = pilot.common_grid({'A': geom}, [0, 1], 100, 50)
        self.assertEqual(len(g['segments']), 2)
        for s in g['segments']:
            self.assertFalse(LineString(s['line']).intersects(box(41, 41, 59, 59)))

    def test_points_keep_count_and_do_not_mutate_originals(self):
        fields = {'A': box(0, 0, 100, 100)}
        points = {'A': [{'id': 'P1', 'x': 28, 'y': 50}]}
        before = copy.deepcopy(points)
        g = pilot.common_grid(fields, [0, 1], 20, 10)
        p = pilot.project_existing_samples(fields, g, points, 10)['A'][0]
        self.assertAlmostEqual(p['x'], 30)
        self.assertAlmostEqual(p['y'], 50)
        self.assertNotEqual(p['id'], 'P1')
        self.assertEqual(points, before)

    def test_point_cannot_jump_to_a_grid_line_outside_own_polygon(self):
        fields = {'A': box(0, 0, 10, 100)}
        g = pilot.common_grid(fields, [0, 1], 50, 25)
        with self.assertRaises(ValueError):
            pilot.project_existing_samples(fields, g, {'A': [{'id': 'P1', 'x': 5, 'y': 50}]}, 0)

    def test_clearance_is_enforced_after_projection(self):
        fields = {'A': box(0, 0, 100, 100)}
        g = pilot.common_grid(fields, [0, 1], 20, 10)
        with self.assertRaises(ValueError):
            pilot.project_existing_samples(fields, g, {'A': [{'id': 'P1', 'x': 8, 'y': 50}]}, 15)

    def test_zero_direction_and_excessive_line_count_fail(self):
        for direction, step in [([0, 0], 20), ([0, 1], 0), ([0, 1], .001)]:
            with self.assertRaises(ValueError):
                pilot.common_grid({'A': box(0, 0, 100, 100)}, direction, step, 0)

    def test_translation_with_corresponding_phase_keeps_same_physical_grid(self):
        geom = box(0, 0, 100, 100)
        a = pilot.common_grid({'A': geom}, [0, 1], 20, 10)
        # Normal aponta para -x: translação +7 em x muda fase para 10-7.
        b = pilot.common_grid({'A': translate(geom, 7, 13)}, [0, 1], 20, 3)
        expected = [translate(LineString(s['line']), 7, 13) for s in a['segments']]
        self.assertEqual(len(expected), len(b['segments']))
        for line in expected:
            self.assertTrue(any(line.hausdorff_distance(LineString(s['line'])) < 1e-8 for s in b['segments']))

    def test_booleans_and_nonfinite_values_are_not_metric_parameters(self):
        geom = {'A': box(0, 0, 100, 100)}
        for value in [True, float('inf'), float('nan')]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                pilot.common_grid(geom, [0, 1], value, 0)


if __name__ == '__main__':
    unittest.main()
