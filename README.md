# ConectaSaúde — protótipo web

Plataforma independente de serviços e orientação em saúde, em desenvolvimento. Esta é uma demonstração de interface, **sem dados reais de pacientes e sem integração com sistemas da prefeitura**.

## Estrutura

- `public/`: site estático responsivo, pronto para Firebase Hosting.
- `public/app.js`: interface, navegação, buscas e dados **demonstrativos**.
- `public/firebase.js`: configuração do Firebase e Analytics sob consentimento.
- `firebase.json` / `.firebaserc`: deploy no projeto Firebase `conectesaude-1`.
- `firestore.rules`: acesso negado até definirmos autenticação e regras por organização.

## Rodar localmente

É necessário usar um servidor HTTP local (não `file://`) para carregar módulos JavaScript.

```bash
npx serve public
```

Ou use a extensão Live Server do VS Code apontando para `public/index.html`.

## Publicar no Firebase Hosting

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
