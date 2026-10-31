# ConectaSaúde — plataforma independente de serviços de saúde

Protótipo público em **GitHub Pages** e início do núcleo multi-município com **Firebase Authentication + Cloud Firestore**. O ConectaSaúde é uma iniciativa independente, não um sistema oficial de prefeitura. **Não cadastrar pacientes, prontuários, diagnósticos, CPF ou outros dados clínicos/pessoais de saúde.**

## Entrada do GitHub Pages

O repositório está atualmente publicado a partir da raiz da branch `main`. O arquivo `/index.html` abre a interface do ConectaSaúde diretamente, carregando os arquivos compartilhados da pasta `/docs/` pela tag HTML `<base href="./docs/">`. O arquivo `/.nojekyll` evita que o GitHub Pages gere a página inicial a partir do README.

Assim, basta abrir **https://99eliel.github.io/app/**. A pasta `docs/` continua contendo toda a aplicação, sem duplicação de arquivos.

## Acesso ao site

- Repositório: https://github.com/99eliel/app
- GitHub Pages (após ativação em Settings → Pages, main, /docs): https://99eliel.github.io/app/
- Todos os arquivos do site estão em `docs/`. Alterações em `main` serão disponibilizadas pelo Pages após o build.
- Para rodar localmente: `npx serve docs` ou Live Server. Não abrir módulos diretamente via file://.

## Recursos existentes

- Página inicial, guia de serviços e orientações;
- Favoritos e checklist **somente no navegador local**;
- Exemplos locais de unidades, avisos e calendário (demonstração);
- Painel visual profissional com números fictícios;
- **Rede municipal**: consulta dados publicados de municípios ativos, com filtros e pesquisa;
- **Administração**: login Google, cadastro de municípios, ativação/desativação, CRUD (criar/editar/publicar/despublicar) de unidades, avisos e ações; concessão, revogação e reativação de acesso por UID ao município para administradores da plataforma;
- Layout responsivo, tema escuro e acessibilidade inicial.

Os três primeiros módulos locais são separados do conteúdo real: visitantes conseguem simular cadastros apenas no próprio aparelho; os registros públicos autenticados ficam no Firestore.

## Configuração necessária no Firebase `conectesaude-1`

**As etapas abaixo precisam ser executadas por quem administra o Firebase. O GitHub Pages NÃO publica Firestore Rules nem configura Auth.** Até essa configuração, a aba Rede municipal pode exibir uma mensagem informando que não foi possível consultar o banco.

### 1. Habilitar autenticação

No Firebase Console → Authentication → Sign-in method:

- Ative o provedor **Google**.
- Em Settings → Authorized domains, cadastre `99eliel.github.io` (não a URL com /app).
- Considere usar domínio personalizado de sua titularidade antes do uso real.

### 2. Criar Firestore e publicar regras

No Firebase Console → Firestore Database, crie o banco no modo de produção (não habilite regras públicas irrestritas).

No diretório local do repositório:

```bash
npm install -g firebase-tools
firebase login
firebase use conectesaude-1
firebase deploy --only firestore:rules
```

O arquivo `firestore.rules` protege por município, separa conteúdo publicado e privado, não permite criação de administradores pelo navegador e bloqueia todas as outras coleções.

**Não deployar regras sem revisar** em conjunto com a configuração do seu Firebase. Para uso operacional, criar testes automatizados de regras e passar por revisão de segurança. O modelo atual destina-se a conteúdo institucional público, não a informações de saúde individuais.

### 3. Primeiro administrador (provisionamento manual obrigatório)

1. Acesse `https://99eliel.github.io/app/#administracao`.
2. Entre com Google; se o login funcionar, a página mostrará o seu **UID**.
3. No Console do Firestore, crie a coleção `platformAdmins`.
4. Crie um documento cujo **ID seja exatamente o seu UID do Firebase Authentication**.
5. Adicione o campo booleano `enabled` com valor `true`.
6. Atualize o navegador ou saia e entre novamente.

O acesso administrativo nunca é concedido apenas por ter uma conta Google. **NÃO criar `platformAdmins` em código público nem flexibilizar as regras para realizar o primeiro acesso.**

### 4. Primeiro município e publicações

- Acesse Administração e cadastre um município (inicialmente inativo).
- Selecione a cidade e cadastre unidades, avisos e ações.
- Marque **Publicar para os cidadãos** no registro ou use o botão **Publicar**.
- Quando estiver pronto, clique em **Ativar município**.
- Confira o conteúdo na aba **Rede municipal**, de preferência em uma janela anônima.
- Para outra pessoa administrar essa cidade, ela deve primeiro entrar com Google e lhe passar seu UID; então você pode conceder permissão como editor ou administrador municipal.

### 5. Testes de segurança antes de qualquer piloto real

- Usuário deslogado lê apenas municípios ativos e registros publicados.
- Visitante não escreve em nenhuma coleção.
- Um usuário autenticado sem permissão não escreve.
- Editor da cidade A não altera cidade B.
- Rascunhos não são visíveis ao público.
- Não é possível criar a própria função de superadministrador.
- Verificar permissões com Firebase Emulator Suite e testes automatizados, antes de divulgar o sistema como funcional em produção.

## Organização técnica

- `docs/app.js`: navegação e páginas informativas;
- `docs/modules.js`: blocos com armazenamento local, somente demonstração;
- `docs/network.js`: catálogo público por município, lendo Firestore;
- `docs/admin.js`: interface administrativa protegida por Auth + regras de Firestore;
- `docs/firebase.js`: inicialização do SDK Firebase, Auth, Firestore e Analytics opcional;
- `firestore.rules`: autorização no servidor; `firebase.json` referencia essas regras.

A configuração `firebaseConfig` é pública por natureza e não é uma chave de administração. Nunca adicionar tokens secretos ou credenciais de service accounts neste repositório.

## Próximas etapas

1. Testar a autenticação, a criação de uma cidade e as regras no Emulator Suite.
2. Criar perfis de acesso e gestão de membros mais completos, com possibilidade de revogação.
3. Criar política de privacidade, processos de suporte, logs e monitoramento.
4. Integrar serviços de municípios com autorização formal e sem dados pessoais no protótipo.
5. Empacotar, compilar e testar Android/iOS com Capacitor quando a plataforma estiver definida.

## Central comercial e assinaturas (nova)

Agora existe a rota [Assinaturas e licenças](https://99eliel.github.io/app/#assinaturas), visível na navegação. O conteúdo é restrito ao **Superadmin** autenticado.

Depois de criar o município na área Administração, abra a central comercial para definir sua licença, plano, valor mensal em reais, validade, situação de teste/atividade/carência ou suspensão. Os registros comerciais ficam em `licenses/{cityId}`, separados dos dados públicos.

**Cobranças são externas e o painel NÃO valida pagamentos automaticamente.** A reativação depende de ajuste manual. Suspender ou deixar vencer bloqueia a **escrita municipal** no servidor quando as regras novas estiverem implantadas. O conteúdo publicado e os dados já armazenados não são apagados.

A conta Superadmin precisa estar provisionada manualmente em `platformAdmins/{uid}`; o login Google, por si só, não dá acesso.

### Antes de usar o controle comercial

- No projeto Firebase **conectesaude-1**, publique `firestore.rules` (GitHub Pages não publica regras do Firestore).
- Verifique primeiro o procedimento de segurança e autorização no documento [ARCHITECTURE.md](ARCHITECTURE.md).
- Rode testes com Firebase Emulator Suite para confirmar isolamento por município, licença vencida, leitura preservada e escrita bloqueada.
- Não cadastre dados clínicos/pacientes durante o protótipo.

**Importante:** os editores municipais só poderão gravar com uma licença configurada e válida quando as novas regras forem publicadas. O Superadmin mantém controle administrativo.

## Diagnóstico de erro no login Google

Ao clicar em **Entrar com Google**, a interface agora mostra o código de erro do Firebase com uma explicação e passos de resolução. O login com Google e as permissões de Superadmin são etapas distintas: um usuário pode autenticar e ainda receber `permission-denied` se não estiver cadastrado.

Para o GitHub Pages, confirme em **Firebase Console → Authentication → Settings → Authorized domains** a presença de **`99eliel.github.io`** (sem `https://` e sem `/app/`). Em **Sign-in method**, habilite o provedor Google no projeto **`conectesaude-1`**. Essas configurações são feitas pelo proprietário do Firebase e não podem ser aplicadas por um commit no GitHub Pages.

## Funcionalidades adaptadas do ConecteBR — sem pré-cadastro

O menu **Gerenciar módulos** permite ativar ou desativar os módulos de cada
município e cadastrar seu conteúdo do zero. O menu **Rede municipal** exibe
apenas módulos ativados e conteúdos publicados. Também há formulário para
atualização da UPA, solicitações simples de consultas e inscrições em cursos,
com identificação pelo UID da conta Google e sem campo para dados clínicos.

Módulos incluídos: UPA, ESF, agendamentos, orientação ao paciente, laboratório,
farmácia, escalas, campanhas, cursos/CETEC, serviços municipais, engenharia,
meio ambiente, educação, esportes e infraestrutura.

Não foram importadas as escalas, os cursos, as unidades e as contas de
Pontalina. Todos os módulos começam vazios e desativados, aguardando que
um administrador os configure e publique conteúdo.

**Lembre-se:** os módulos exigem novas regras em `firestore.rules`,
que precisam de revisão e publicação no Firebase. A publicação do GitHub
Pages, por si só, não libera a escrita no banco. A nova interface não deve
ser considerada homologada para dados reais de pacientes.

Leia o [plano de migração](CONECTEBR_MIGRATION.md) para consultar a
relação exata de funcionalidades aproveitadas e ainda pendentes.


## Operação municipal — UPA, ESF e relatórios

A próxima etapa do ConecteBR já foi adaptada ao ConectaSaúde:

- **UPA 24h**: situação inicial em branco, cadastro da fila, escalas semanais e plantões. A equipe pode registrar **+ Entrada** e **− Saída**, com atualização transacional do Firestore. A informação é agregada, não contém identificação de pacientes e não representa tempo estimado de espera.
- **ESF**: cada unidade é cadastrada manualmente pelo administrador. Nome, endereço, horário, telefone e equipe podem ser preenchidos e publicados. Inclui busca por nome, endereço e equipe.
- **Atualização ao vivo**: cadastros municipais e situação da UPA passam a ser acompanhados por listeners do Firestore enquanto o módulo estiver aberto.
- **Solicitações/inscrições**: o painel administrativo mostra totais por situação (pendente, confirmado, concluído, cancelado).
- **Relatórios**: `/#gestao` mostra indicadores agregados do município autorizado (módulos ativos, ESF cadastradas/publicadas, campanhas publicadas, solicitações e inscrições pendentes, fila informada) e permite exportação CSV.

Não há números ou cadastros fictícios. O aplicativo exibe ausência de dados até você cadastrar.

**Atenção às regras:** a versão de `firestore.rules` atualmente salva no repositório passou por uma migração incompleta e **não deve ser implantada sem correção e validação**. As regras devem ser conferidas com a versão que você publicou manualmente no console; GitHub Pages não altera as regras existentes. Antes de usar em operação, faça testes completos no Firebase Emulator Suite, incluindo duas cidades e perfis distintos.

## Ampliação do ConecteBR: contas, cartazes e PWA

Foram adaptados novos fluxos da plataforma antiga:

- **Minha conta** (`/#conta`): login Google, cadastro e acesso por e-mail e senha, recuperação de senha, solicitação de verificação de e-mail e consulta das próprias solicitações e inscrições. O login com e-mail exige habilitar **E-mail/senha** em Firebase Authentication → Sign-in method. Não há cadastro de prontuários.
- **Campanhas e avisos**: cada município publica avisos, com cartaz opcional informado por **URL pública HTTPS diretamente para arquivo JPG/PNG/WEBP**. O cidadão visualiza cartazes em pop-up e marca como visto no navegador. A gestão pode retirar os avisos publicados do ar sem excluí-los. **O upload de imagem ainda não está implementado**: para subir um arquivo, será necessário integrar Storage com regras próprias.
- **Pedidos e cursos**: filtros por andamento (pendente, confirmado, concluído e cancelado); prevenção de pedidos simultâneos no mesmo formulário e tentativa de evitar duplicidade de inscrições num curso por conta.
- **PWA**: `sw.js` usa cache somente de arquivos locais do site e tenta atualizar o conteúdo da interface ao reconectar. Dados de pacientes, dados do Firestore e credenciais **não são armazenados pelo service worker**. Operações autenticadas exigem internet.

A aplicação continua multi-município: nenhum dado do ConecteBR foi copiado. Cada área começa vazia, e precisa de configuração e publicação pela administração.

### Atenção: regras do Firestore

O arquivo `firestore.rules` salvo no repositório contém um trecho duplicado de uma atualização anterior e **não está pronto para deploy**. Use as regras corrigidas que foram revisadas manualmente no Firebase Console até que o arquivo seja sincronizado e compilado por meio do Firebase Emulator Suite. **Não execute `firebase deploy --only firestore:rules` a partir deste checkout enquanto esse problema persistir.**

Os testes automáticos de JS não substituem os testes das regras de segurança. Antes de uso com cidadãos reais, revisar isolamento por município, permissões, privacidade, coleta e retenção de dados, aviso de finalidade e os processos assistenciais.
