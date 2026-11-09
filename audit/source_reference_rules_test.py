import unittest
from source_reference_rules import expand_group, axis_difference_degrees, br_number


class SourceReferenceRulesTests(unittest.TestCase):
    def test_inherited_prefix_and_explicit_mixed_groups(self):
        known = {'BA1', 'BA2', 'BA3', 'BB1', 'BC1', 'BC3', 'BC4'}
        self.assertEqual(expand_group('BA-1-2-3', known), ['BA1', 'BA2', 'BA3'])
        self.assertEqual(expand_group('BA–1–2–3', known), ['BA1', 'BA2', 'BA3'])
        self.assertEqual(expand_group('BB1-BC1', known), ['BB1', 'BC1'])
        self.assertEqual(expand_group('BC3-4', known), ['BC3', 'BC4'])

    def test_pivot_is_explicit_alias_not_fuzzy_matching(self):
        self.assertEqual(expand_group('Pivô-6', {'P6'}), ['P6'])
        with self.assertRaises(ValueError):
            expand_group('Pivô-8', {'P6'})

    def test_ambiguous_and_duplicate_members_are_not_guessed(self):
        for label in ['1-2', 'RA1/RA2', 'RA1-1', 'RA9']:
            with self.subTest(label=label), self.assertRaises(ValueError):
                expand_group(label, {'RA1', 'RA2'})

    def test_axis_has_no_travel_direction(self):
        self.assertAlmostEqual(axis_difference_degrees(333.1691, 153.1691), 0)
        self.assertAlmostEqual(axis_difference_degrees(179, 1), 2)
        self.assertAlmostEqual(axis_difference_degrees(10, 100), 90)

    def test_invalid_angle_is_not_coerced(self):
        for v in [True, '333', float('nan')]:
            with self.assertRaises(ValueError):
                axis_difference_degrees(v, 333)

    def test_locale_numbers_preserve_decimal_meaning(self):
        self.assertEqual(br_number('500,46'), 500.46)
        self.assertEqual(br_number('1.017,87'), 1017.87)
        with self.assertRaises(ValueError):
            br_number('500.46')


if __name__ == '__main__':
    unittest.main()
