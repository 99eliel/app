# Preparação para Google Play — ConectaSaúde

> Status: **planejamento e testes Android**. Nenhum AAB foi compilado, assinado ou enviado ao Google Play. A conta de desenvolvedor está aguardando verificação, segundo o proprietário.

## Estratégia proposta

- Web/PWA oficial: uma única aplicação hospedada em um **domínio próprio e controlado pelo desenvolvedor**, com Firebase Authentication e Firestore.
- Android: **Trusted Web Activity (TWA)** gerada com Bubblewrap, instalada/distribuída via Android App Bundle (`.aab`).
- Modelo multi-município: um aplicativo ConectaSaúde para todos os municípios, com seus dados segregados, **não** uma aplicação individual por cidade.
- A identidade visual, login e publicação dos conteúdos continuarão a ser administrados pelo portal web.
- Instalação para testes imediatos: Chrome Android → Instalar app, dispensando a Play Store.

## Atenção ao endereço atual do site

Hoje o protótipo está em `https://99eliel.github.io/app/`.
Uma TWA precisa publicar a relação com a assinatura do app em:
`https://DOMINIO-PRÓPRIO/.well-known/assetlinks.json`.

**Importante:** `https://99eliel.github.io/app/.well-known/assetlinks.json`
não substitui `https://99eliel.github.io/.well-known/assetlinks.json`.
Como o endereço GitHub Pages é compartilhado entre projetos e o repositório
`99eliel/app` controla somente o caminho `/app`, recomendamos um domínio próprio
para a versão da loja. Não configure `assetlinks.json` com SHA-256 inventado.

## Passos para gerar o projeto Android (quando domínio estiver definido)

1. Usar um domínio ou subdomínio HTTPS controlado pelo proprietário, apontando para o PWA; garantir a instalação e login Google nesse novo endereço.
2. No Firebase Authentication → Configurações → Domínios autorizados, autorizar exatamente o novo hostname.
3. Confirmar que `https://DOMINIO/manifest.webmanifest` resolve corretamente (o manifest pode estar em `/docs/`, desde que as URLs de scope e start_url estejam adequadas).
4. Instalar Node.js LTS, Java 17+/compatível, Android Studio/SDK e Bubblewrap CLI na máquina de desenvolvimento.
5. Inicializar o projeto a partir do manifesto **HTTPS publicado**:
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest https://DOMINIO/docs/manifest.webmanifest
   ```
   Configure nome, cores, ícones, package ID definitivo e chave de assinatura.
6. Configure o projeto Android com **targetSdkVersion 36 ou superior**, conforme as regras vigentes para submissão de apps em 2026.
7. Assine e gere um `.aab` com Bubblewrap/Gradle e configure **Play App Signing** no Play Console.
8. Copie a **impressão digital SHA-256 do certificado de assinatura do app disponibilizado pelo Play Console** (pode diferir da chave de upload).
9. Publique o arquivo `/.well-known/assetlinks.json` na **raiz do domínio validado**, usando o nome de pacote e a impressão digital verdadeira.
10. Instale e verifique a TWA no dispositivo. Se o Android abrir uma guia de navegador com a barra de URL, revise `assetlinks.json`, assinatura, domínio e caminho.

Não inclua no GitHub keystore, senhas, contas de serviço, certificados privados ou credenciais.

## Modelo do arquivo assetlinks.json

Substituir os dois placeholders **apenas depois** de conhecer o nome de pacote definitivo e a SHA-256 de assinatura:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "BR.COM.SUAEMPRESA.CONECTASAUDE",
      "sha256_cert_fingerprints": [
        "AA:BB:...:ASSINATURA_REAL_DO_GOOGLE_PLAY"
      ]
    }
  }
]
```

**Não publique o modelo acima literalmente:** contém identificadores e certificado inválidos.

## Exigências para publicação (verificar novamente antes do envio)

- Conta Google Play verificada, perfil de desenvolvedor concluído.
- Bundle Android `.aab` com `targetSdkVersion >= 36` para novos envios desde 31/08/2026.
- App e site realmente funcionais, sem links quebrados ou descrição exagerada de serviços de saúde.
- Política de privacidade pública e acessível **no app e no Play Console**, com responsável e contato verdadeiros, finalidade e retenção dos dados.
- Página web independente para **solicitar exclusão da conta**, além da opção dentro do aplicativo; implementar remoção efetiva dos dados correspondentes no Firebase, respeitando eventuais exigências legais de retenção.
- Formulários de Segurança dos dados, público-alvo, acesso ao app para revisão, publicidade e categoria do aplicativo preenchidos conforme o funcionamento real.
- Verificar as declarações específicas para apps de saúde e informações médicas que se apliquem à classificação e às funções divulgadas.
- Se a conta for **pessoal** e criada após 13/11/2023: teste fechado com **pelo menos 12 testadores por 14 dias consecutivos**, seguido de solicitação de acesso à produção.
- Iniciar por teste interno quando a conta for liberada; capturar bugs em Android real antes de enviar ao público.
- Separar notas de versão Android (`versionCode` sempre crescente e `versionName`) da versão da interface PWA; mesmo que o site se atualize, alterações de manifest ou Android exigem novo AAB.
- Para login Google, testar cuidadosamente no navegador escolhido pela TWA e garantir domínio autorizado no Firebase.

## Limites atuais

Esta etapa não cria o bundle Android nem publica o aplicativo. Serviços clínicos e dados de pacientes estão **fora do escopo** até validação de segurança, LGPD, titularidade e autorização institucional.

## Fontes oficiais

- Android API alvo: https://developer.android.com/google/play/requirements/target-sdk
- Testes de contas pessoais novas: https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR
- Exclusão de contas: https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR
- TWA e Digital Asset Links: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start

## Exigências adicionais para aplicativo de saúde

No Play Console, preencher **Política → Conteúdo do app → Apps de saúde**, inclusive em testes fechados. Para o ConectaSaúde, avaliar as categorias que realmente aparecerem na versão enviada, como **Serviços e administração de saúde**, **Prevenção de doenças e saúde pública** e, se aplicável, **Educação e referências médicas**.

Se não for enquadrado como dispositivo médico, a descrição do app deve deixar claro que ele **não é dispositivo médico e não diagnostica, trata, cura nem previne doenças**, além de recomendar a orientação de profissionais de saúde para decisões clínicas. Isso deve refletir o uso real do aplicativo.

O ConectaSaúde é uma plataforma independente: **não se apresentar como aplicativo oficial de prefeitura, SUS ou governo sem autorização documental formal**. Caso a distribuição venha a ser feita sob afiliação governamental, pode ser exigida comprovação e um formulário de aviso prévio.

Fonte: https://support.google.com/googleplay/android-developer/answer/14738291?hl=pt-BR
