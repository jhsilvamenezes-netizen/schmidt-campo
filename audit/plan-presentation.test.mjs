import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operationalAlternativeLabel, operationalComparisonNote, operationalParameterHint } from '../src/ui/plan-presentation.mjs';
test('nome de exibição reconhece NBSP sem renomear identificadores ou outras alternativas',()=>{
 assert.equal(operationalAlternativeLabel('Tiros a 300\u00a0m (padrão antigo)'),'Distribuição alternativa');
 assert.equal(operationalAlternativeLabel('1 tiros, mesmo número por pessoa'),'1 tiro, mesmo número por pessoa');
 for(const text of ['antigo','Plano recomendado','3 tiros, mesmo número por pessoa'])assert.equal(operationalAlternativeLabel(text),text);
});
test('retira histórico da nota mantendo o excedente de amostras e outras advertências',()=>{
 assert.equal(operationalComparisonNote('2 pontos acima do mínimo. Como o app fazia até a v0.10.'),'2 pontos acima do mínimo.');
 const warning='Faltam pontos para cumprir o mínimo.';assert.equal(operationalComparisonNote(warning),warning);
});
test('metadados de referência mantêm os limites de entrada; mensagens não relacionadas permanecem intactas',()=>{
 assert.equal(operationalParameterHint('Padrão: 36,48 m · aceita 1 a 80 m'),'Aceita 1 a 80 m');
 assert.equal(operationalParameterHint('Padrão: sim '),'');
 assert.equal(operationalParameterHint('Erro: valor inválido'),'Erro: valor inválido');
 assert.equal(operationalParameterHint('Aceita 1 a 80 m'),'Aceita 1 a 80 m');
});
import { operationalSchematicMarkup } from '../src/ui/plan-presentation.mjs';
test('esquema das distâncias: padrão idêntico ao aprovado e sem medida que o plano não tem', () => {
  const approved = '<path d="M20 24H280M20 68H280" stroke="currentColor" stroke-width="2"/><g fill="var(--sx-map-point)"><circle cx="20" cy="24" r="5"/><circle cx="150" cy="24" r="5"/><circle cx="280" cy="24" r="5"/><circle cx="20" cy="68" r="5"/><circle cx="150" cy="68" r="5"/><circle cx="280" cy="68" r="5"/></g><path d="M37 32V60M33 36L37 32L41 36M33 56L37 60L41 56M165 12H265M169 8L165 12L169 16M261 8L265 12L261 16" fill="none" stroke="currentColor" stroke-width="1.5"/><g fill="currentColor" font-size="13" font-family="system-ui,sans-serif"><text x="46" y="49">De lado</text><text x="186" y="9">Ao longo</text></g>';
  assert.equal(operationalSchematicMarkup(), approved);
  assert.equal(operationalSchematicMarkup({ lines: 2, perLine: 3 }), approved);
  const onePerTrack = operationalSchematicMarkup({ lines: 2, perLine: 1 });
  assert.equal((onePerTrack.match(/<circle/g) || []).length, 2);
  assert.ok(onePerTrack.includes('De lado') && !onePerTrack.includes('Ao longo'));
  const singleTrack = operationalSchematicMarkup({ lines: 1, perLine: 3 });
  assert.equal((singleTrack.match(/<circle/g) || []).length, 3);
  assert.ok(!singleTrack.includes('De lado') && singleTrack.includes('Ao longo'));
  const single = operationalSchematicMarkup({ lines: 1, perLine: 1 });
  assert.equal((single.match(/<circle/g) || []).length, 1);
  assert.ok(!/De lado|Ao longo|stroke-width="1.5"/.test(single));
});
