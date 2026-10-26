# ConectaSaúde — protótipo web

Plataforma independente de serviços e orientação em saúde, em desenvolvimento. Esta é uma demonstração de interface, **sem dados reais de pacientes e sem integração com sistemas da prefeitura**.

## Estrutura

- `docs/`: site estático responsivo, pronto para Firebase Hosting.
- `docs/app.js`: interface, navegação, buscas e dados **demonstrativos**.
- `docs/firebase.js`: configuração do Firebase e Analytics sob consentimento.
- `firebase.json` / `.firebaserc`: deploy no projeto Firebase `conectesaude-1`.
- `firestore.rules`: acesso negado até definirmos autenticação e regras por organização.

## Rodar localmente

É necessário usar um servidor HTTP local (não `file://`) para carregar módulos JavaScript.

```bash
npx serve docs
```

Ou use a extensão Live Server do VS Code apontando para `docs/index.html`.

## GitHub Pages (publicação temporária)

O site está na pasta `docs/` para funcionar como GitHub Pages sem processo de compilação.

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**.
3. Selecione branch **main** e diretório **/docs**, depois **Save**.
4. Aguarde a publicação em `https://99eliel.github.io/app/` (apenas depois da ativação do Pages).

As próximas alterações em `docs/` são publicadas automaticamente após o commit em `main`.

## Blocos de funcionalidades disponíveis

- **Unidades de Saúde**: cadastrar, buscar, editar e excluir informações públicas e fictícias.
- **Avisos e Campanhas**: criar e gerenciar comunicados demonstrativos.
- **Calendário de Ações**: registrar e organizar ações comunitárias fictícias.
- **Guia de serviços, favoritos e painel**: funções da versão inicial.

Os formulários demonstrativos utilizam `localStorage`: **não compartilham registros entre dispositivos e não podem ser usados operacionalmente**. Não registre dados de pacientes. A próxima fase incluirá autenticação, administração multi-município e dados persistidos com regras seguras.

## Publicar no Firebase Hosting (alternativa futura)

```bash
npm install -g firebase-tools
firebase login
firebase use conectesaude-1
firebase deploy --only hosting
```

**Atenção:** o comando publica o site, mas não cria banco de dados ou libera dados médicos. O Firebase Analytics é opcional e iniciado apenas após consentimento do usuário.

## Próximas etapas

1. Validar nome/marca e conteúdo do site.
2. Cadastrar municípios/unidades de forma configurável (multi-tenant).
3. Definir responsáveis pelo tratamento de dados, LGPD, autenticação e autorização por função.
4. Criar serviços reais por município; integrar apenas quando autorizado.
5. Empacotar e testar com Capacitor para Android e iOS.

**Não cadastre dados pessoais ou clínicos neste protótipo.** Os números, campanhas e atividades apresentados na gestão são fictícios e estão marcados como simulação.
