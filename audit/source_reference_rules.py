"""Regras de identificação; não homologam fonte ou alteram cadastro."""
import math
import re
import unicodedata


def normalize(value):
    return unicodedata.normalize('NFKD', str(value)).encode('ascii', 'ignore').decode().upper().strip()


def expand_group(label, known_codes):
    text = normalize(str(label).replace('–', '-').replace('—', '-')).replace('PIVO', 'P')
    text = re.sub(r'\s+', '', text)
    prefix, result = None, []
    for token in text.split('-'):
        if re.fullmatch(r'[A-Z]+', token):
            prefix = token
            continue
        match = re.fullmatch(r'([A-Z]+)?(\d+)', token)
        if not match or not (match[1] or prefix):
            raise ValueError('Identificador de grupo ambíguo')
        prefix = match[1] or prefix
        code = prefix + str(int(match[2]))
        if code not in known_codes or code in result:
            raise ValueError('Membro desconhecido ou repetido')
        result.append(code)
    if not result:
        raise ValueError('Grupo sem membros')
    return result


def axis_difference_degrees(a, b):
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in [a, b]):
        raise ValueError('Ângulo inválido')
    delta = abs((a - b) % 180)
    return min(delta, 180 - delta)


def br_number(text):
    if not re.fullmatch(r'\d{1,3}(?:\.\d{3})*,\d+|\d+,\d+', text):
        raise ValueError('Número brasileiro inesperado')
    return float(text.replace('.', '').replace(',', '.'))
