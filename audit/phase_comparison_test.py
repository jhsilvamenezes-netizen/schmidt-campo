import unittest
from phase_comparison import compare_coverage


class PhaseComparisonTests(unittest.TestCase):
    def setUp(self):
        self.base = {'A': {'p95M': 100, 'maximumAtCellCentresM': 150},
                     'B': {'p95M': 100, 'maximumAtCellCentresM': 150}}

    def test_no_worse_requires_both_metrics_in_each_field(self):
        r = compare_coverage(self.base, {'A': {'p95M': 99, 'maximumAtCellCentresM': 149},
                                        'B': {'p95M': 100, 'maximumAtCellCentresM': 150}})
        self.assertTrue(r['notWorseOnFixedGrid'])
        self.assertFalse(r['operationalRecommendation'])

    def test_big_improvement_in_one_field_does_not_hide_loss_in_other(self):
        r = compare_coverage(self.base, {'A': {'p95M': 10, 'maximumAtCellCentresM': 100},
                                        'B': {'p95M': 101, 'maximumAtCellCentresM': 150}})
        self.assertFalse(r['notWorseOnFixedGrid'])

    def test_p95_alone_cannot_hide_worse_corner(self):
        other = {**self.base, 'A': {'p95M': 90, 'maximumAtCellCentresM': 151}}
        self.assertFalse(compare_coverage(self.base, other)['notWorseOnFixedGrid'])

    def test_missing_field_is_rejected(self):
        with self.assertRaises(ValueError):
            compare_coverage(self.base, {'A': self.base['A']})

    def test_tolerance_is_only_numeric_not_agronomic_allowance(self):
        other = {**self.base, 'A': {'p95M': 100.001, 'maximumAtCellCentresM': 150}}
        self.assertFalse(compare_coverage(self.base, other)['notWorseOnFixedGrid'])

    def test_invalid_values_are_rejected(self):
        for value in [True, float('nan'), float('inf'), -1]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                compare_coverage(self.base, {**self.base, 'A': {'p95M': value, 'maximumAtCellCentresM': 150}})


if __name__ == '__main__':
    unittest.main()
