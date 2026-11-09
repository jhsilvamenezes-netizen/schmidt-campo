"""Fonte alternativa de teste, copiada só para results/ ignorado pelo Git."""
from pathlib import Path
from xml.sax.saxutils import escape
import shutil

output = Path(__file__).resolve().parent / 'results' / 'font-variant'
fonts = output / 'fonts'
fonts.mkdir(parents=True, exist_ok=True)
source = Path('/usr/share/fonts/truetype/dejavu')
for name in ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'DejaVuSans-Oblique.ttf', 'DejaVuSans-BoldOblique.ttf']:
    shutil.copyfile(source / name, fonts / name)
(output / 'fonts.conf').write_text(
    '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">'
    f'<fontconfig><dir>{escape(str(fonts))}</dir>'
    f'<cachedir>{escape(str(output / "cache"))}</cachedir></fontconfig>')
print('DejaVu Sans isolada para ensaio do Plano; nenhuma fonte do app foi alterada.')
