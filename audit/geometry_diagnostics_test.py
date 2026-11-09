import unittest
from shapely.geometry import Polygon, box
from shapely.affinity import translate
from geometry_diagnostics import compare_boundaries


class BoundaryDiagnosticsTest(unittest.TestCase):
    def test_translation_is_detected_without_mutating_input(self):
        current = box(0, 0, 10, 10)
        source = translate(current, xoff=0.4, yoff=-0.3)
        original = source.wkb
        result = compare_boundaries(current, source)
        self.assertAlmostEqual(result['centroidOffsetM'], 0.5)
        self.assertAlmostEqual(result['translationResidualM'], 0)
        self.assertAlmostEqual(result['absoluteAreaDifferenceM2'], 0)
        self.assertEqual(source.wkb, original)

    def test_shape_difference_is_not_explained_by_translation(self):
        result = compare_boundaries(box(0, 0, 10, 10), box(0, 0, 12, 10))
        self.assertGreater(result['translationResidualM'], 0.5)
        self.assertEqual(result['absoluteAreaDifferenceM2'], 20)

    def test_missing_hole_remains_visible_after_alignment(self):
        current = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)], [[(4, 4), (6, 4), (6, 6), (4, 6)]])
        result = compare_boundaries(current, box(0, 0, 10, 10))
        self.assertGreater(result['translationResidualM'], 0)
        self.assertEqual(result['absoluteAreaDifferenceM2'], 4)

    def test_empty_and_invalid_are_not_repaired(self):
        for source in [Polygon(), Polygon([(0, 0), (2, 2), (0, 2), (2, 0), (0, 0)])]:
            with self.assertRaises(ValueError):
                compare_boundaries(box(0, 0, 10, 10), source)


if __name__ == '__main__':
    unittest.main()
