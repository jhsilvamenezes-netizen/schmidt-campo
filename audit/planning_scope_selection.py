"""Seleção de escopo do protótipo. Não grava nem ativa execução no aplicativo."""
import copy
import hashlib
import json


def snapshot_fingerprint(document):
    return hashlib.sha256(json.dumps(document, sort_keys=True).encode()).hexdigest()


def select_scope(individual_document, analysis, mode, members):
    if mode not in ('individual', 'block') or not isinstance(members, list) or not members or len(set(members)) != len(members):
        raise ValueError('Escopo ou seleção inválidos')
    fields = individual_document['fields']
    if not set(members) <= set(fields):
        raise ValueError('Lote desconhecido')
    if mode == 'individual':
        if len(members) != 1:
            raise ValueError('Individual exige um lote')
        return {'scope': mode, 'status': 'individual-reference', 'plan': copy.deepcopy(fields[members[0]]),
                'savedPlanChanged': False, 'p6ReviewDeferred': members[0] == 'Rio de Janeiro|P6'}
    if len(members) < 2:
        raise ValueError('Bloco exige ao menos dois lotes')
    result = {'scope': mode, 'individualOptions': sorted(members), 'executionEnabled': False,
              'savedPlanChanged': False}
    if (snapshot_fingerprint(individual_document) != analysis['summary']['individualSnapshotFingerprint'] or
            individual_document['htmlSha256'] != analysis['summary']['htmlSha256']):
        return {**result, 'status': 'stale-block-analysis'}
    assessment = next((b for b in analysis['blocks'] if set(b['members']) == set(members)), None)
    if assessment is None:
        return {**result, 'status': 'not-assessed'}
    if assessment['status'] != 'sampled-geometry-pass-access-pending':
        return {**result, 'status': assessment['status'], 'assessment': copy.deepcopy(assessment)}
    return {**result, 'status': 'geometry-candidate-only', 'candidateId': assessment['id'],
            'analysisFingerprint': analysis['summary']['analysisFingerprint'],
            'assessment': copy.deepcopy(assessment), 'accessConfirmed': False, 'routeValidated': False}
