# ConectaBR 2.0 — arquitetura e plano de migração

**Status:** proposta técnica para implementação incremental. **Sem deploy, sem migração de dados, sem alteração de Firebase/produção.**

## 1. Direção de produto

- **ConectaBR:** aplicativo único do cidadão e painel para múltiplas secretarias municipais.
- **ConectaSaúde:** módulo de Saúde, não o nome do aplicativo geral.
- Outros módulos: Educação, Defesa Civil, Obras, Eventos, Assistência Social e serviços configuráveis por município.
- Multi-município: dados, usuários, módulos, permissões, audiências, tokens e notificações isolados por município.
- **Não trocar agora** o ID do projeto Firebase `conectesaude-1`, o package name Android, nem apagar coleções existentes. Nome de produto e identificadores técnicos podem evoluir separadamente; mudança de package na Play Store exige planejamento específico.
- Não usar conteúdo, marca oficial ou alegar endosso municipal sem acordo.

## 2. Situação conhecida e bloqueio de sincronização

A branch `main` de `99eliel/app` ainda contém regras de membros limitadas a `admin/editor` com `moduleIds`. **Não contém** no momento consultado os aprimoramentos locais `pushTokens`, `notificationFeed`, funções, painel de notificações e Flutter 1.5 testados no aparelho. O ambiente atual de produção é mais recente que a branch consultada.

**Pré-requisito absoluto:** recuperar e sincronizar a pasta local funcional (`Documentos/ConectaSaude/{mobile,web}`) com o GitHub em uma branch separada. Fazer inventário por hashes/diffs e registrar backup. Não aplicar um deploy do GitHub desatualizado sobre Firebase Hosting, regras ou Functions em produção.

## 3. Modelo de autorização (RBAC + escopos / ABAC)

Definir capacidades granulares, não apenas cargos fixos. Exemplo de catálogo versionado:

| Capacidade | Descrição |
| --- | --- |
| `municipality.read` | Ver dados administrativos não sensíveis da cidade |
| `department.manage` | Administrar secretarias atribuídas |
| `staff.invite` | Convidar funcionários no próprio escopo |
| `role.manage` | Administrar funções delegadas, sem escalar privilégios |
| `content.publish` | Criar/publicar avisos no escopo |
| `notifications.send.individual` | Solicitar envio individual permitido |
| `notifications.send.group` | Solicitar envio para grupo aprovado |
| `notifications.send.unit` | Solicitar envio na unidade atribuída |
| `notifications.send.city` | Solicitar envio municipal |
| `notifications.send.all_cities` | Apenas administração da plataforma, com confirmação reforçada |
| `notifications.schedule` | Agendar disparos |
| `notifications.approve` | Aprovar mensagens que exigem revisão |
| `notifications.audit.read` | Consultar auditoria dentro do escopo |

O catálogo de capacidades deve ser mantido **no código do servidor**, com IDs estáveis. O painel pode criar cargos e selecionar capacidades de um catálogo autorizado; não pode inventar permissões que o servidor interprete como execução arbitrária.

Escopos: `platform`, `municipality`, `department`, `orgUnit` e, para indivíduos, uma relação verificável de atendimento/matrícula. Um cargo sempre traz escopo e limites; permissões não são globais por acidente.

Regras de segurança: negar por padrão, verificar usuário ativo e licença quando aplicável, cruzar município/unidade e acesso ao alvo; exigir autenticação recente para gestão sensível; trilha de auditoria imutável; limites de taxa e idempotência.

### Esquema sugerido (novo, coexistindo com legado)

```
platformAdmins/{uid}                      // bootstrap atual permanece
municipalities/{cityId}
  departments/{departmentId}             // Saúde, Educação, Obras...
  orgUnits/{unitId}                      // ESF, escola, setor (não conflitar com units legado)
  roleDefinitions/{roleId}               // nome, version, capabilities, maxScope, active
  staffGrants/{uid}/assignments/{grantId} // roleId, departmentId?, unitId?, enabled, grantedBy
  notificationCampaigns/{campaignId}     // status, audience, title, body, category, createdBy
  notificationDispatches/{dispatchId}    // status, counts, errorStats, approvedBy
  notificationFeed/{notificationId}     // somente material público não sensível
  pushTokens/{tokenId}                   // somente dono/serviço (já existe localmente)
  auditEvents/{eventId}                  // escrita exclusiva do servidor, acesso limitado
```

A implementação deve **adaptar as regras já publicadas**, e não substituir a cópia vigente por esta proposta. A coleção legada `members` continua válida na transição; migrar via função administrativa supervisionada, sem gerar elevação implícita.

## 4. Gestão de funções e delegação

Painel: Administração → Secretarias → Unidades → Equipe → Cargos e permissões.
Criar/editar/desativar função; atribuir funcionário por cidade, secretaria ou unidade; visualizar **permissões efetivas**; revogar imediatamente; impedir autoconcessão e delegação acima do escopo de quem concede.

Política server-side na função:
1. Validar autenticação/App Check conforme suporte.
2. Resolver atribuições ativas e licença/município habilitados.
3. Exigir capacidade solicitada e escopo estritamente compatível.
4. Para ações sobre terceiros, verificar vínculo institucional e base de autorização.
5. Revalidar no momento do disparo agendado (permissões podem ser revogadas).
6. Auditar autorização, decisão, alvo e ação; nunca registrar dados sensíveis ou tokens em logs públicos.

**Nunca confiar apenas em menu oculto, parâmetros fornecidos pelo cliente ou gravações diretas no Firestore.** Operações privilegiadas via Cloud Functions com Admin SDK e autorização explícita. Serviços de terceiros, se houver, não recebem acesso administrativo irrestrito.

## 5. Motor único de notificações

Fluxo: usuário autorizado → composição / prévia → validação e aprovação opcional → agendamento ou execução → segmentação server-side → FCM → auditoria e leitura no app.

Tipos:
- individual: somente a destinatário vinculado/autorizado;
- grupo: grupo institucional aprovado, nunca inferido automaticamente por doença;
- unidade / secretaria / município;
- emergência: canal e procedimento separados, com confirmação reforçada;
- automático: consulta confirmada, inscrição aprovada, eventos, etc., com gatilhos limitados e rastreáveis.

Campos mínimos da campanha: `cityId`, `departmentId`, `scope`, `audienceType`, `audienceRef`, `category`, `title`, `body`, `imageRef?`, `createdBy`, `createdAt`, `sendAt?`, `approvalState`, `idempotencyKey`.

Proteger contra envio acidental: teste próprio (self-test) como padrão, prévia da quantidade aproximada de dispositivos, confirmação explícita em mensagens coletivas, segundo aprovador para disparos amplos quando configurado, quotas por usuário/município, revalidação na execução e proteção contra duplicidades.

Mensagens com imagem: validar formato e tamanho no servidor; armazenamento privado com URLs temporárias para conteúdo restrito (FCM pode exigir URL acessível ao sistema de entrega); nunca usar mídia com dados médicos pessoais em campanhas públicas. Público e privado devem seguir caminhos separados.

## 6. Privacidade e dados sensíveis (LGPD)

Gestante, diabetes, hipertensão, consultas e outros atributos de saúde são **dados pessoais sensíveis**. Não criar uma base de segmentação clínica apenas reaproveitando `notificationFeed` público ou tópicos FCM abertos. Necessário definir controlador/operador, finalidade e base legal adequadas, minimização, prazo de retenção, autorização profissional e direitos do titular antes de importar qualquer cadastro real.

Na tela bloqueada usar mensagem genérica: **"Você tem um lembrete de atendimento. Abra o ConectaBR para consultar."** Nome do paciente, gravidez, doença, exame ou diagnóstico ficam em área autenticada, com revalidação de acesso. No app, preferências de notificação por categoria e revogação quando aplicável. Procedimento de exclusão de conta, política de privacidade e incidentes definidos antes da publicação.

Cidadãos não devem poder descobrir composição de grupos clínicos ou consultar tokens de outros usuários. Não usar tópicos genéricos para grupos sensíveis. Saúde e educação precisam de governança própria.

## 7. Navegação do aplicativo

**Cidadão:** Início, Serviços, Avisos, Conta. Serviços agrupados por secretaria com busca e ícones; somente módulos publicados no município. A mesma instalação serve para diferentes cidades.

**Funcionário autorizado:** Administração dentro do app, com capacidades efetivas: criar avisos, selecionar destinatários autorizados, agenda, aprovações, histórico. Acesso web mais amplo para gestão de cargos, equipes e unidades. Mesmo modelo de autorização no app e web.

**Superadmin:** municípios, licenças, secretarias, modelos, funções globais, auditoria de operação, sem acesso clínico irrestrito por padrão.

## 8. Etapas de entrega

- **Etapa 0 — recuperação:** consolidar Flutter 1.5 e web/Functions/regras da produção no repositório sem deploy; validar checksums, backup e testes básicos.
- **Etapa 1 — identidade:** alterar nome exibido para ConectaBR, descrição, onboarding e categorias; preservar identificadores técnicos e a compatibilidade do projeto.
- **Etapa 2 — autorização:** catálogo de capacidades, definição/atribuição de cargos e escopos; emulador de Firestore + testes de negativas e escalonamento.
- **Etapa 3 — painel:** criar/editar cargos, convidar/revogar equipe, atribuir departamento/unidade, visualizar permissões efetivas e trilha de auditoria.
- **Etapa 4 — notificações:** individual, grupos institucionais, unidade e cidade; imagem, self-test, aprovações, agendamento, histórico, conteúdo seguro no app.
- **Etapa 5 — secretarias:** Educação, Obras, Defesa Civil, eventos e outros módulos, cada um habilitável por cidade.
- **Etapa 6 — publicação:** testes em Android, push/tap/deep links, regras em emulador, recuperação offline, acessibilidade, política de privacidade, exclusão de conta, Play Integrity/App Check quando aplicável, assinatura definitiva e ficha da Play Store.

Critérios de aceite da autorização: uma enfermeira não lê pacientes de outra unidade; coordenador não envia a outra cidade; usuário comum não acessa envio; revogação bloqueia no servidor; Superadmin não acessa prontuários por padrão; disparo sem destinatário real não envia; logs permitem investigar quem fez o quê sem expor dados clínicos.

## 9. Regras de trabalho

1. Branch/PR em cada alteração; nunca sobrescrever versão funcional sem backup.
2. Testes de regressão e diff antes de deploy; snapshots das regras atuais antes de substituição.
3. Primeiro ambiente de teste; produção apenas após checklist.
4. Usar uma pasta consolidada `Documentos/ConectaSaude` e tratar GitHub como repositório versionado **depois** da sincronização da versão local.
5. Este documento não autoriza ativar coleta de dados clínicos; precisa de análise própria de privacidade e governança.
