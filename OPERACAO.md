# Etapa de operação — ConectaSaúde

## Passo a passo para testar

1. Em **Administração**, selecione o município cadastrado e confira se está ativo.
2. Em **Assinaturas**, confira se a licença permanece vigente.
3. Em **Gerenciar módulos**, habilite UPA 24h, ESF, Campanhas e (se desejado) Agendamentos.
4. Na **UPA 24h**, preencha a situação inicial, plantões e escalas. Clique em **Salvar situação da UPA**. Depois teste os botões **+ Entrada** e **− Saída**.
5. Na **ESF**, cadastre uma unidade, com nome, localização, horário, responsável e telefone. Marque **Disponibilizar no portal público**.
6. Abra `/#rede` em outro navegador ou dispositivo e confira se os registros publicados aparecem. Com as duas telas abertas, uma atualização publicada deve ser refletida na consulta.
7. Em `/#gestao`, confira o painel de relatórios e exporte o resumo em CSV.

## Como o sistema protege os dados

- A UPA trabalha com contagem **agregada**, sem dados pessoais.
- Não existe previsão automática de espera e a situação da sala vermelha é somente informação administrativa.
- ESF não recebe dados clínicos de pacientes no cadastro de unidades.
- O relatório mostra contagens agregadas, não nomes ou contatos.
- As permissões de leitura e escrita são aplicadas no Firestore, não apenas na interface.
- A atualização da fila usa transação, para suportar dois computadores alterando simultaneamente.

## O que ainda falta do ConecteBR

- Upload de cartazes, imagens e armazenamento apropriado com Firebase Storage.
- Notificações push aos cidadãos com controles de consentimento e preferências.
- Agendamento com disponibilidade real, confirmação por unidade e regras completas de privacidade.
- Perfis separados de recepção, UPA, ESF e outros setores.
- Gestão municipal avançada de usuários e auditoria confiável no backend.
- Relatórios completos com filtros por período e por unidade.

Esta fase ainda é um **protótipo em evolução**. Não usar dados pessoais de saúde ou processos assistenciais críticos sem avaliação técnica, jurídica e validação das regras no emulador.
