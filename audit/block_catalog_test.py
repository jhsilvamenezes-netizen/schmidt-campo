import unittest
from block_catalog import build_catalog


class BlockCatalogTests(unittest.TestCase):
    def test_triple_has_full_group_and_all_pairs(self):
        group = {'group': 'A1-2-3', 'members': ['F|A1', 'F|A2', 'F|A3']}
        result = build_catalog([group], [], group['members'])
        self.assertEqual(len(result), 4)
        self.assertEqual(sum('source-group' in r['origins'] for r in result), 1)

    def test_duplicate_proposals_merge_origins_instead_of_duplication(self):
        group = {'group': 'A1-2', 'members': ['F|A1', 'F|A2']}
        r = build_catalog([group], [('F|A2', 'F|A1')], group['members'])
        self.assertEqual(len(r), 1)
        self.assertIn('nearby-axis-pair', r[0]['origins'])
        self.assertFalse(r[0]['accessConfirmed'])
        self.assertFalse(r[0]['operationallyApproved'])

    def test_chain_adds_component_without_claiming_whole_axis_compatibility(self):
        r = build_catalog([], [('F|A', 'F|B'), ('F|B', 'F|C')], ['F|A', 'F|B', 'F|C'])
        component = next(x for x in r if len(x['members']) == 3)
        self.assertIn('nearby-axis-component', component['origins'])
        self.assertFalse(component['operationallyApproved'])

    def test_different_farms_and_unknown_keys_are_rejected(self):
        for pair in [('F|A', 'G|B'), ('F|A', 'F|X')]:
            with self.subTest(pair=pair), self.assertRaises(ValueError):
                build_catalog([], [pair], ['F|A', 'G|B'])

    def test_singletons_remain_individual_without_creating_fake_block(self):
        self.assertEqual(build_catalog([{'group': 'P6', 'members': ['F|P6']}], [], ['F|P6']), [])

    def test_input_order_does_not_change_catalog_ids(self):
        a = build_catalog([], [('F|A', 'F|B')], ['F|A', 'F|B'])
        b = build_catalog([], [('F|B', 'F|A')], ['F|B', 'F|A'])
        self.assertEqual(a, b)

    def test_all_connected_subsets_include_intermediate_blocks(self):
        keys = ['F|A', 'F|B', 'F|C', 'F|D']
        r = build_catalog([], [('F|A', 'F|B'), ('F|B', 'F|C'), ('F|C', 'F|D')], keys)
        members = {tuple(x['members']) for x in r}
        self.assertIn(('F|A', 'F|B', 'F|C'), members)
        self.assertIn(('F|B', 'F|C', 'F|D'), members)
        self.assertNotIn(('F|A', 'F|C'), members)
        self.assertEqual(len(r), 6)

    def test_large_component_fails_explicitly_instead_of_silent_partial_result(self):
        keys = [f'F|A{i}' for i in range(11)]
        with self.assertRaises(ValueError):
            build_catalog([], list(zip(keys, keys[1:])), keys)


if __name__ == '__main__':
    unittest.main()
