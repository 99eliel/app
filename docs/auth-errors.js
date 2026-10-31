// Mensagens públicas e específicas do Firebase Authentication.
// Não registra tokens, credenciais nem dados pessoais.
const suggestions = {
  "auth/email-already-in-use": {
    title: "E-mail já cadastrado",
    message: "Já existe uma conta usando este endereço de e-mail.",
    fix: "Use Entrar ou Recuperar senha em vez de criar outra conta."
  },
  "auth/invalid-credential": {
    title: "Dados de login não conferem",
    message: "Não foi possível validar a conta com o e-mail e a senha informados.",
    fix: "Confira os dados ou utilize Recuperar senha."
  },
  "auth/wrong-password": {
    title: "Não foi possível entrar",
    message: "O Firebase não aceitou as credenciais informadas.",
    fix: "Confira seu e-mail e senha ou recupere o acesso."
  },
  "auth/weak-password": {
    title: "Senha muito fraca",
    message: "A senha informada não atende aos requisitos mínimos.",
    fix: "Utilize pelo menos 6 caracteres e prefira uma senha forte e exclusiva."
  },
  "auth/too-many-requests": {
    title: "Muitas tentativas de acesso",
    message: "O Firebase limitou temporariamente novas tentativas.",
    fix: "Aguarde um pouco e tente novamente. Evite repetir várias vezes."
  },
  "auth/user-disabled": {
    title: "Conta desativada",
    message: "Esta conta foi desativada na autenticação.",
    fix: "Contate o responsável pela organização se precisar de acesso."
  },
  "auth/unauthorized-domain": {
    title: "Domínio do site não autorizado",
    message: "O Google não pode autenticar neste endereço até você cadastrar o domínio do GitHub Pages no Firebase.",
    fix: "No Firebase Console do projeto conectesaude-1, abra Authentication → Settings → Authorized domains e adicione 99eliel.github.io (sem https:// e sem /app/)."
  },
  "auth/operation-not-allowed": {
    title: "Provedor Google desativado",
    message: "O método Google ainda não está habilitado para este projeto Firebase.",
    fix: "Abra Firebase Console → Authentication → Sign-in method e habilite Google; escolha o e-mail de suporte."
  },
  "auth/configuration-not-found": {
    title: "Autenticação não configurada",
    message: "A configuração de autenticação do projeto não foi encontrada.",
    fix: "Confirme se o Firebase Authentication foi criado e se o provedor Google foi habilitado no projeto conectesaude-1."
  },
  "auth/popup-blocked": {
    title: "Janela de login bloqueada",
    message: "O navegador bloqueou a janela que deveria abrir sua conta Google.",
    fix: "Autorize pop-ups para 99eliel.github.io, desative o bloqueio de pop-ups temporariamente e tente novamente."
  },
  "auth/popup-closed-by-user": {
    title: "Login não concluído",
    message: "A janela de autenticação foi fechada antes da conclusão.",
    fix: "Clique em Entrar com Google e aguarde até terminar o processo."
  },
  "auth/cancelled-popup-request": {
    title: "Solicitações de login simultâneas",
    message: "Uma segunda tentativa interrompeu a autenticação anterior.",
    fix: "Aguarde alguns segundos e tente novamente somente uma vez."
  },
  "auth/network-request-failed": {
    title: "Conexão indisponível",
    message: "Não foi possível completar a comunicação com o Firebase.",
    fix: "Verifique a conexão, bloqueadores de conteúdo e tente novamente."
  },
  "auth/invalid-api-key": {
    title: "Configuração do Firebase inválida",
    message: "A chave pública de configuração do projeto não foi aceita.",
    fix: "Confira a configuração Web App do projeto conectesaude-1 e as restrições da chave no Google Cloud."
  },
  "auth/internal-error": {
    title: "Erro interno na autenticação",
    message: "O Google/Firebase não conseguiu concluir a operação.",
    fix: "Tente novamente; se persistir, copie o código exibido e confira o Console do navegador."
  },
  "auth/unauthorized-continue-uri": {
    title: "Endereço de retorno não autorizado",
    message: "A URL usada para retorno do login não está autorizada pelo Firebase.",
    fix: "Verifique os domínios autorizados nas configurações do Authentication."
  },
  "permission-denied": {
    title: "Acesso negado pelo Firestore",
    message: "Sua conta pode ter feito login, mas não possui permissão para ler ou alterar estes registros.",
    fix: "Verifique se seu UID está autorizado na coleção platformAdmins e se as regras firestore.rules foram publicadas no Firebase."
  },
  "firestore/permission-denied": {
    title: "Acesso negado pelo Firestore",
    message: "Sua conta não recebeu permissão para acessar os dados solicitados.",
    fix: "Confirme o UID de Superadmin e as regras do Firestore publicadas no projeto conectesaude-1."
  }
};

export function explainFirebaseError(error) {
  const code = String(error?.code || "unknown").slice(0,100);
  const details = suggestions[code];
  return {
    code,
    title: details?.title || "Não foi possível concluir o login",
    message: details?.message || "O Firebase retornou uma falha que precisa ser identificada pelo código abaixo.",
    fix: details?.fix || "Tire um print do código do erro ou informe o código exibido para investigar."
  };
}
