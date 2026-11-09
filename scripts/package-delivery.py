"""Empacota somente arquivos versionados; sem publicação, chaves ou dados locais."""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parent / 'entregas-schmidt' / '1.31.0-r1'
BASELINE = 'a1ad502c315b4b3d484444f9e2734400abd0b72a'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def blob(ref, name):
    return git('show', f'{ref}:{name}')


def archive(entries):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(entries.items()):
            if Path(name).is_absolute() or '..' in Path(name).parts:
                raise ValueError('Caminho não permitido')
            if Path(name).suffix.lower() in {'.keystore', '.jks', '.apk', '.aab', '.pem', '.key'}:
                raise ValueError('Arquivo de assinatura/distribuição não permitido')
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            z.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    result = stream.getvalue()
    with zipfile.ZipFile(io.BytesIO(result)) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == set(entries)
        for name, data in entries.items():
            assert z.read(name) == data
    return result


def main():
    if git('status', '--porcelain').strip():
        raise SystemExit('Commitar primeiro: o pacote representa um snapshot versionado limpo.')
    commit = git('rev-parse', 'HEAD').decode().strip()
    version = json.loads(blob('HEAD', 'VERSAO.json'))
    assert version['entrega'] == '1.31.0-r1'
    web_names = ['index.html', 'sw.js', 'manifest.webmanifest', 'icone.svg',
                 'icone-180.png', 'icone-192.png', 'icone-512.png']
    web = {name: blob('HEAD', name) for name in web_names}
    assert hashlib.sha256(web['index.html']).hexdigest() == version['htmlSha256']
    assert hashlib.sha256(web['sw.js']).hexdigest() == version['workerSha256']
    web['VERSAO.json'] = blob('HEAD', 'VERSAO.json')
    web['docs/VERSOES_E_ENTREGAS.md'] = blob('HEAD', 'docs/VERSOES_E_ENTREGAS.md')
    web['LEIA-ME.txt'] = (
        'SCHMIDT Campo — entrega de arquivos 1.31.0-r1\n'
        f'Snapshot Git: {commit}\n'
        'Pacote web local; publicação do link ainda bloqueada pela revisão automática.\n'
        'GPS exige HTTPS/ambiente permitido; abrir o HTML local não substitui o site.\n'
        'Modo bloco, recuo obrigatório e validação estrita continuam em estudo.\n'
        'Não apague dados do site nem desinstale o APK atual.\n'
    ).encode()
    source = {}
    for entry in git('ls-tree', '-r', '-z', 'HEAD').split(b'\0'):
        if not entry:
            continue
        meta, name = entry.split(b'\t', 1)
        mode, kind, _ = meta.decode().split()
        if kind != 'blob' or mode not in {'100644', '100755'}:
            raise ValueError('Snapshot deve conter somente arquivos regulares')
        path = name.decode()
        if any(part in {'results', 'node_modules', '.venv', '.git', '.aws', 'chave'} for part in Path(path).parts):
            raise ValueError('Diretório local/privado inesperado no snapshot')
        source[path] = blob('HEAD', path)
    source['ORIGEM-DO-SNAPSHOT.txt'] = (
        'SCHMIDT Campo — fonte recuperada/reconstruída, testes e documentação\n'
        f'Entrega 1.31.0-r1; commit {commit}\n'
        'O projeto-fonte gerador original completo continua ausente.\n'
        'Este ZIP não inclui .git; testes/gerador que leem commits de referência\n'
        'exigem o repositório Git com seu histórico. Sem dependências/SDK/chaves.\n'
        'Publicação web bloqueada; estudos não integrados ao runtime.\n'
    ).encode()
    original = {name: blob(BASELINE, name) for name in web_names}
    baseline = json.loads(blob('HEAD', 'audit/baseline.json'))
    for name, data in original.items():
        assert hashlib.sha256(data).hexdigest() == baseline['files'][name]['sha256']
    packages = {
        'SCHMIDT-Campo-Web-1.31.0-r1.zip': archive(web),
        'SCHMIDT-Campo-Fonte-e-Testes-1.31.0-r1.zip': archive(source),
        'SCHMIDT-Campo-Web-1.31.0-original.zip': archive(original),
    }
    # Nunca sobrescrever uma entrega com bytes diferentes sob o mesmo nome.
    for name, data in packages.items():
        destination = OUT / name
        if destination.exists() and destination.read_bytes() != data:
            raise SystemExit(f'Entrega existente difere: criar nova revisão, não sobrescrever {name}')
    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in packages.items():
        (OUT / name).write_bytes(data)
    sums = ''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name, data in sorted(packages.items()))
    (OUT / 'SHA256SUMS.txt').write_text(sums)
    print(json.dumps({'delivery': version['entrega'], 'sourceCommit': commit,
                      'directory': str(OUT), 'packages': [
                          {'name': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                          for name, data in packages.items()],
                      'zipIntegrityVerified': True, 'published': False}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
