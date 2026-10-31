# ConecteBR → ConectaSaúde: migração de funcionalidades

A base funcional foi inspirada no repositório público
[99eliel/upa-pontalina](https://github.com/99eliel/upa-pontalina).
**Não foram copiados os dados de Pontalina, os IDs de ESF, os cursos padrão, as
contas, as escalas nem a configuração Firebase do aplicativo antigo.**

## Módulos configuráveis

| Módulo no ConectaSaúde | Origem no ConecteBR | Implementação inicial |
|---|---|---|
| UPA 24h | Fila, sala vermelha, plantão e escala da semana | Painel informativo e formulário de atualização, sem contagem ou nomes padrão |
| ESF | Postos e equipes | Cadastro de unidades/escala como informações publicáveis |
| Solicitações de consultas | Formulário e pedidos com confirmação | Solicitações vinculadas ao UID sem coletar motivo clínico, confirmação/cancelamento |
| Orientação de atendimento | Auto triagem simples | Apenas orientação informativa; **não** reproduz algoritmo de classificação de risco |
| Laboratório | Informações e horário de coleta | Cadastro de locais, contatos e horários |
| Farmácia | Informações básicas | Cadastro de locais, contatos e horários |
| Escalas e equipes | Plantão e escala ESF | Cadastro genérico de escalas, horários e equipes |
| Campanhas | Avisos e mensagens | Cadastro de conteúdo com publicação |
| CETEC | Cursos e inscrições | Cadastro de cursos e interesse com status |
| Serviços municipais | Portal de serviços | Catálogo opcional |
| Engenharia | Serviço municipal | Catálogo opcional |
| Meio ambiente | Serviço municipal | Catálogo opcional |
| Educação | Serviço municipal | Catálogo opcional |
| Esportes | Serviço municipal | Catálogo opcional |
| Infraestrutura | Serviço municipal | Catálogo opcional |

O conteúdo inicial de cada módulo é **vazio**. Os nomes acima são somente a
estrutura do software; não há documentos criados automaticamente no Firestore.

## Como configurar o primeiro município

1. Faça login como Superadmin e acesse **Administração**.
2. Cadastre o município, que começará inativo.
3. Configure a **Licença**, que autoriza as gravações municipais.
4. Entre em **Gerenciar módulos** e selecione o município.
5. Ative os módulos que deseja oferecer. O cidadão vê apenas módulos ativados.
6. Abra um módulo e cadastre os dados institucionais, marcando para publicar.
7. Confira os registros no **Portal municipal** (`/#rede`).
8. Ative a visibilidade do município quando estiver pronto.

## Local de armazenamento

```text
municipalities/{cityId}
  moduleSettings/{moduleId}
    enabled: boolean
    updatedAt: timestamp
  moduleEntries/{moduleId}/items/{entryId}
    moduleKey: string
    title: string
    description: string
    details: string
    hours, phone, address, link: string
    published: boolean
    createdAt, updatedAt: timestamp
  moduleStatus/upa
    queue: int|null
    roomStatus: unknown|available|occupied
    clinician, pediatrician: string
    week: {segunda, terca, quarta, quinta, sexta, sabado, domingo}
    published: boolean
    updatedAt: timestamp
  appointmentRequests/{requestId}
    ownerUid: string
    targetId: string
    status: pending|confirmed|completed|canceled
    createdAt, updatedAt: timestamp
  courseRegistrations/{requestId}
    (mesma estrutura acima)
```

O Firestore possui regras específicas por município e exige login,
publicação prévia de informações, ativação do módulo e licença vigente para
novas solicitações. O usuário pode ler somente as próprias solicitações,
e os administradores autorizados do município podem acompanhar as suas.

## Não foram transferidos integralmente

- Dados pessoais de usuários do ConecteBR, observações médicas e arquivos de pacientes.
- Regras de triagem/classificação de risco: o questionário antigo não substitui um protocolo validado.
- Pop-ups de aviso com upload de imagem e envio de notificações push: essas partes
  dependem de armazenamento, consentimento e regras adicionais e ainda serão refeitas.
- Capacidade de curso, fila de atendimento real e tempo estimado de espera:
  o sistema não cria esses valores sem validação.
- Gestão completa de contas e relatórios detalhados: o Superadmin já gerencia
  membros e licenças, mas precisamos definir permissões por módulo e relatórios.

O fluxo inicial de solicitações foi limitado a **UID da conta e opção escolhida**.
Não inclui sintomas, CPF, telefone ou documentos. Ainda assim, o UID é um dado pessoal:
antes de oferecer esses fluxos ao público real, definir finalidade, retenção,
transparência, direitos dos titulares, normas municipais e teste de segurança.

## Implantação das regras (não ocorre via GitHub Pages)

```bash
firebase login
firebase use conectesaude-1
firebase deploy --only firestore:rules
```

**Revise e teste `firestore.rules` no Firebase Emulator Suite antes do deploy.**
Somente o proprietário do projeto pode configurar e publicar essas regras.

O sistema continua independente e não deve ser anunciado como portal oficial
de prefeitura sem autorização formal.
