# Protocolo pendente — Android e validação em campo

**Nenhum resultado físico foi executado ou homologado nesta etapa.** Usar cópia
descartável de teste e candidata aprovada para ensaio; não instalar sobre o app
operacional, desinstalar, limpar armazenamento ou distribuir APK implicitamente.
Guardar evidências com coordenadas/identificação operacional em ambiente privado.

1. Registrar aparelho, Android, WebView/Chrome, versão/hash do aplicativo,
   assinatura instalada, bateria e condição térmica. Conferir suporte a Web Locks
   separadamente em PWA e WebView; não presumir que compartilham dados.
2. Exportar a cópia do app operacional e guardá-la fora do aparelho. Conferir
   manifesto/integridade. Restaurar somente em perfil de teste, reabrir e comparar
   planos, registros, imagens e histórico. Não testar destruição na cópia única.
3. Medir cinco aberturas, distinguir processo frio de retorno ao app, gerar os
   51 cenários e registrar travamentos/tempo/RAM com ferramentas do aparelho.
   Comparar as mesmas configurações, sem outros apps pesados ou superaquecimento.
4. Em origem HTTPS/aplicativo local apropriado, testar GPS exato, aproximado,
   negado, revogado durante uso, sem sinal e timeout. Verificar retomada após
   permitir novamente. Conferir também compartilhamento e permissões do Android.
5. Em céu aberto, coletar pelo menos 30 observações num ponto de controle com
   coordenadas, datum/CRS, método e precisão de referência conhecidos. Registrar
   horário de aquisição e entrega, precisão reportada, dispersão e erro observado.
   Quantidade é roteiro de ensaio, não critério de homologação. O responsável deve
   definir antes do ensaio o erro aceitável para a operação; GPS de telefone não
   substitui referência topográfica ou limite oficial.
6. Percorrer roteiro conhecido e conferir aquisição de posição, seta/bússola,
   aviso de fora do lote, tiro errado e passagem de ponto. Manter indicação de
   simulação e registro oficial no Cropwise. Não ajustar os seis alertas ou as
   áreas divergentes sem identificar a fonte oficial e o método operacional.
7. Deixar o app em segundo plano por 30 segundos e cinco minutos, bloquear a tela,
   retornar, interromper o sinal e retomá-lo. Conferir que posição antiga não
   aparece como aquisição recente. Verificar tela acesa, callbacks e consumo.
8. No PWA, abrir duas abas com a candidata: editar na proprietária, tentar gravar
   na outra, fechar a proprietária e recarregar a segunda. Conferir disco/backup,
   não apenas o estado visível. Testar sair/voltar pelo histórico e descarte da aba
   pelo SO; não confundir eventos simulados com BFCache real.
9. Reabrir sem conexão e conferir preservação dos registros na mesma instalação.
   Atualização do service worker tem etapa própria; não foi alterada neste pacote.
10. Registrar resultado por cenário: versão/hash, esperado, observado, aprovado/
    reprovado, evidência privada e responsável. Reportar separadamente diferenças
    de origem do KML, sensor, parâmetro operacional, projeção ou implementação.

Só depois da revisão dos resultados tratar de migração/assinatura e solicitar
aprovação específica para merge ou publicação. Nenhuma assinatura nova garante
atualização sobre instalações existentes; usar `MIGRACAO_ASSINATURA.md`.
