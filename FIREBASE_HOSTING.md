# Publicar o ConectaSaúde no Firebase Hosting

Esta configuração usa o Firebase existente **conectesaude-1** e publica somente a interface web.
**Não** troca os dados, os usuários, os municípios, as licenças nem as regras de segurança do Firestore.

## Estrutura atual

- Projeto: `conectesaude-1` (em `.firebaserc`).
- Hosting: `firebase.json` com `hosting.public = "docs"`.
- Firebase atende `docs/index.html` em `/`, os módulos JS em `/*.js` e o SW em `/sw.js`.
- GitHub Pages continua funcionando em `https://99eliel.github.io/app/`, por meio de `/index.html` e `/sw.js` do repositório.
- O service worker da raiz do repositório é voltado ao GitHub Pages; o **`docs/sw.js`** é específico para o Firebase Hosting.
- Nada de alterar o `firebaseConfig` em `docs/firebase.js` enquanto o projeto permanecer o mesmo.

## Implantação manual no PC / VS Code

1. Faça clone ou pull da branch `main` do GitHub e entre no diretório do repositório.
2. Instale o Node.js LTS e, depois, Firebase CLI:
   ```powershell
   npm install -g firebase-tools
   firebase login
   firebase projects:list
   ```
3. Confirme no Console Firebase → **Criação → Hosting** se o site padrão já existe. Caso contrário, comece o fluxo para criá-lo (preferencialmente usando o ID `conectesaude-1` quando disponível).
4. Execute somente a implantação do Hosting:
   ```powershell
   firebase deploy --only hosting --project conectesaude-1
   ```
5. Confira **o endereço retornado pela CLI**. O esperado, caso o ID do site padrão corresponda ao ID do projeto, é `https://conectesaude-1.web.app`. Se o Firebase tiver usado outro ID, utilize o endereço retornado pelo Console.
6. Abra `https://SEU-SITE.web.app/#teste-android`, teste login Google, Firestore, versão, instalação PWA e formulários. Se o login acusar domínio não autorizado, verifique **Authentication → Configurações → Domínios autorizados** e adicione o hostname exato do Hosting (sem `https://`).
7. No celular, **instale uma nova cópia** a partir do endereço `.web.app`. O PWA antigo do GitHub Pages tem outra origem e não muda automaticamente.

**Atenção:** execute `firebase deploy --only hosting`, **não** apenas `firebase deploy`, porque o repositório também possui `firestore.rules` e isso não deve alterar as regras de produção sem revisão.

## Preparação da TWA para Google Play

O Firebase Hosting serve arquivos no caminho `/.well-known/assetlinks.json`, que é o local exigido para a verificação do domínio Android. Quando o ID definitivo do pacote e o SHA-256 **do certificado de assinatura do aplicativo na Google Play** estiverem disponíveis:

1. Crie `docs/.well-known/assetlinks.json` com o JSON real dos Digital Asset Links.
2. Faça deploy somente do Hosting e verifique que `https://SEU-SITE.web.app/.well-known/assetlinks.json` retorna HTTP 200, `application/json` e não redireciona.
3. Configure a Trusted Web Activity com o mesmo host e o mesmo pacote; assine o `.aab` e teste com a Play Console.
4. Não inclua certificados, arquivos `.keystore` ou senhas no repositório.

**Não incluímos um `assetlinks.json` fictício** porque um pacote ou fingerprint inventado impediria a verificação.

Referências:
- https://firebase.google.com/docs/hosting/quickstart
- https://firebase.google.com/docs/hosting/default-site
- https://firebase.google.com/support/guides/app-links-universal-links
- https://developer.android.com/training/app-links/configure-assetlinks
