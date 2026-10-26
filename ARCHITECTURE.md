# ConectaSaúde — arquitetura e isolamento dos clientes

## Objetivo
Uma plataforma independente, com municípios separados e cobrança feita externamente. Nenhum dado de saúde individual é armazenado nesta etapa. O código do site é público.

## Perfis de acesso
| Papel | Função |
|---|---|
| Visitante | Consulta somente municípios ativos e registros publicados |
| Editor municipal | Consulta os dados do próprio município; edita quando a licença comercial está válida |
| Administrador municipal | Atualmente tem as mesmas permissões do editor, até definirmos mais regras |
| Superadmin | Gerencia clientes, licenças e acessos; único perfil com informações comerciais |

## Estrutura no Firestore
```text
platformAdmins/{uid}
  enabled: boolean

municipalities/{cityId}
  name: string; state: string; active: boolean
  createdAt: timestamp; updatedAt: timestamp
  members/{uid}
    role: "admin" | "editor"
    enabled: boolean; updatedAt: timestamp
  units/{id}, notices/{id}, events/{id}
    ... campos de conteúdo público
    published: boolean
    createdAt: timestamp; updatedAt: timestamp

licenses/{cityId}         # somente Superadmin
  status: trial | active | grace | suspended | canceled
  planCode: string
  validUntil: timestamp
  monthlyPriceCents: integer
  notes: string
  createdAt: timestamp; updatedAt: timestamp
  history/{eventId}
    action: "save" | "suspend"
    actorUid: string
    previousStatus: string
    nextStatus: string
    changedAt: timestamp
```

## Licença mensal

A cobrança ocorre fora do sistema (contrato, boleto ou Pix). O proprietário atualiza manualmente o estado contratual e a data de validade.

O status **vencida** é calculado em tempo real quando `validUntil` deixa de ser futuro, mesmo que o campo salvo ainda diga `active`.

Em `firestore.rules`, escrita municipal é permitida apenas se:
- a conta for membro habilitado do município (ou Superadmin), e
- existir uma licença não vencida com estado `trial`, `active` ou `grace`.

Para Superadmin há exceção administrativa, permitindo reativar e manter o sistema. A suspensão NÃO remove dados: uma equipe municipal autorizada continua podendo consultar documentos; conteúdos já publicados continuam consultáveis pelo público enquanto o município estiver ativo.

O campo `municipalities.active` controla somente a visibilidade pública e não substitui o controle comercial `licenses/{cityId}`.

## Segurança e limitações atuais

- Login com Google não significa permissão de administração: o UID precisa estar cadastrado nas regras.
- A interface e o GitHub Pages nunca são a barreira de segurança; as regras do Firestore são.
- O histórico de licença é gravado junto com a alteração num mesmo lote, mas por cliente autorizado. Para auditoria juridicamente confiável, precisaremos de backend com registro imutável.
- Os testes atuais cobrem funções locais de prazo/estados/preços e sintaxe. **Ainda é obrigatório** testar regras em Firebase Emulator Suite e revisar o tratamento de dados antes de usar a plataforma com prefeituras.
- Este módulo NÃO faz cobrança automática, não bloqueia leitura e não utiliza informações clínicas.

## Evolução planejada

1. Configuração real do Firestore, testes no emulador e autorização segura do primeiro Superadmin.
2. Ajustar identidade da plataforma, papéis e planos com regras de negócio definidas.
3. Rotina contratual, exportação e continuidade de dados na rescisão.
4. Autenticação e fluxos de cidadãos, se forem necessários.
5. Sistemas clínicos somente depois de avaliação jurídica e técnica.
