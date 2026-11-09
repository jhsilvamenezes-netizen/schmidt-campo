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
