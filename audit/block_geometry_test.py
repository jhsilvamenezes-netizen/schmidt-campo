import unittest
from shapely.geometry import Polygon, box
from block_geometry import common_frame, relation, sample_clearance, lateral_clearance


class BlockGeometryTests(unittest.TestCase):
    def test_distinct_local_origins_are_translated_before_comparison(self):
        ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        a = {'geom': [[ring]], 'centroidUTM': [100, 200]}
        b = {'geom': [[ring]], 'centroidUTM': [113, 200]}
        result = relation(common_frame(a, [100, 200]), common_frame(b, [100, 200]))
        self.assertEqual(result['gapM'], 3)
        self.assertEqual(result['components'], 2)
        self.assertFalse(result['automaticCrossingAllowed'])

    def test_shared_edge_does_not_authorize_crossing(self):
        result = relation(box(0, 0, 10, 10), box(10, 0, 20, 10))
        self.assertEqual(result['sharedBoundaryM'], 10)
        self.assertEqual(result['relation'], 'shared-edge-review')
        self.assertFalse(result['automaticCrossingAllowed'])

    def test_point_contact_is_not_a_corridor(self):
        result = relation(box(0, 0, 10, 10), box(10, 10, 20, 20))
        self.assertEqual(result['relation'], 'point-contact-review')
        self.assertEqual(result['components'], 2)

    def test_overlap_is_reported_without_changing_originals(self):
        a, b = box(0, 0, 10, 10), box(5, 0, 15, 10)
        before = [a.wkb, b.wkb]
        self.assertEqual(relation(a, b)['overlapM2'], 50)
        self.assertEqual(before, [a.wkb, b.wkb])

    def test_distance_along_track_differs_from_shortest_distance(self):
        # O ponto (100, 50) está a 50 m da entrada (50, 50) no tiro horizontal,
        # porém a apenas 50/sqrt(2) da borda inclinada x=y.
        triangle = Polygon([(0, 0), (200, 0), (200, 200)])
        row = sample_clearance(triangle, [[100, 50]])
        self.assertAlmostEqual(row['minimumPointToBoundaryM'], 50 / 2**0.5)
        self.assertEqual(row['outside'], 0)

    def test_hole_counts_as_boundary_and_outside(self):
        geom = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)],
                       [[(40, 40), (60, 40), (60, 60), (40, 60)]])
        self.assertEqual(sample_clearance(geom, [[35, 50]])['minimumPointToBoundaryM'], 5)
        self.assertEqual(sample_clearance(geom, [[50, 50]])['outside'], 1)

    def test_boom_width_is_full_width_not_edge_margin(self):
        self.assertAlmostEqual(lateral_clearance(20, 36.48), 1.76)
        self.assertAlmostEqual(lateral_clearance(18.24, 36.48), 0)
        self.assertLess(lateral_clearance(10, 36.48), 0)
        with self.assertRaises(ValueError):
            lateral_clearance(20, float('nan'))

    def test_invalid_geometry_requires_review(self):
        with self.assertRaises(ValueError):
            relation(Polygon([(0, 0), (10, 10), (0, 10), (10, 0)]), box(0, 0, 1, 1))

    def test_malformed_origins_are_rejected_explicitly(self):
        field = {'geom': [[[[0, 0], [10, 0], [10, 10], [0, 0]]]], 'centroidUTM': [0, 0]}
        for origin in [[0], [0, 0, 0], [True, 0], ['0', 0], [float('inf'), 0], None]:
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                common_frame(field, origin)

    def test_ring_is_not_automatically_closed(self):
        field = {'geom': [[[[0, 0], [10, 0], [10, 10], [0, 10]]]], 'centroidUTM': [0, 0]}
        with self.assertRaises(ValueError):
            common_frame(field, [0, 0])

    def test_nonfinite_or_three_dimensional_ring_is_rejected(self):
        for point in [[float('nan'), 0], [10, 10, 3]]:
            field = {'geom': [[[[0, 0], [10, 0], point, [0, 0]]]], 'centroidUTM': [0, 0]}
            with self.subTest(point=point), self.assertRaises(ValueError):
                common_frame(field, [0, 0])


if __name__ == '__main__':
    unittest.main()
