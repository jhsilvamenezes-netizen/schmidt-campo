"""Catálogo de ensaio; proximidade/rumo não confirmam acesso operacional."""
import hashlib
import itertools
import json


def build_catalog(groups, near_pairs, known_fields):
    known = set(known_fields)
    proposals = {}

    def add(members, reason, source=None):
        keys = tuple(sorted(members))
        if len(keys) < 2 or len(set(keys)) != len(keys) or not set(keys) <= known:
            raise ValueError('Membros de bloco inválidos')
        farms = {k.split('|')[0] for k in keys}
        if len(farms) != 1:
            raise ValueError('Não agrupar fazendas distintas')
        entry = proposals.setdefault(keys, {'members': list(keys), 'origins': set(), 'sourceGroups': set()})
        entry['origins'].add(reason)
        if source:
            entry['sourceGroups'].add(source)

    for group in groups:
        members = group['members']
        if not members or len(set(members)) != len(members) or not set(members) <= known:
            raise ValueError('Grupo de referência inválido')
        for size in range(2, len(members) + 1):
            for subset in itertools.combinations(members, size):
                add(subset, 'source-group' if len(subset) == len(members) else 'source-subset', group['group'])
    graph = {k: set() for k in known}
    for a, b in near_pairs:
        add([a, b], 'nearby-axis-pair')
        graph[a].add(b); graph[b].add(a)
    seen = set()
    for start in sorted(graph):
        if start in seen:
            continue
        queue = [start]; seen.add(start)
        for node in queue:
            for neighbor in sorted(graph[node]):
                if neighbor not in seen:
                    seen.add(neighbor); queue.append(neighbor)
        if len(queue) > 1:
            add(queue, 'nearby-axis-component')
            if len(queue) > 10:
                raise ValueError('Componente acima do orçamento de enumeração; ampliar escopo explicitamente')
            # Todos os subconjuntos conectados do componente, não só pares e conjunto total.
            for size in range(2, len(queue) + 1):
                for subset in itertools.combinations(sorted(queue), size):
                    allowed = set(subset); reached = {subset[0]}; pending = [subset[0]]
                    for node in pending:
                        for neighbor in graph[node] & allowed:
                            if neighbor not in reached:
                                reached.add(neighbor); pending.append(neighbor)
                    if reached == allowed:
                        add(subset, 'nearby-connected-subset')
    result = []
    for keys, item in sorted(proposals.items()):
        result.append({'id': hashlib.sha256(json.dumps(keys).encode()).hexdigest()[:16],
                       'members': item['members'], 'origins': sorted(item['origins']),
                       'sourceGroups': sorted(item['sourceGroups']), 'accessConfirmed': False,
                       'operationallyApproved': False})
    return result
