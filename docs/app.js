import { modules } from "./modules.js";
const services = [
  {id:"consultas",title:"Consultas na atenção básica",cat:"Atendimentos",icon:"🩺",tone:"mint",summary:"Saiba por onde começar para buscar atendimento e acompanhamento de rotina.",info:"A Unidade Básica de Saúde (UBS) é uma porta de entrada para cuidados de rotina, prevenção e acompanhamento.",steps:["Identifique sua UBS de referência.","Confirme na unidade os horários e como funcionam os atendimentos.","Leve a documentação solicitada pela equipe."]},
  {id:"vacinas",title:"Vacinação",cat:"Prevenção",icon:"💉",tone:"blue",summary:"Consulte orientações sobre vacinação e saiba onde buscar informações oficiais.",info:"A vacinação segue calendários e orientações definidos pelas autoridades de saúde.",steps:["Consulte o calendário de vacinação atualizado.","Separe o cartão de vacina, se disponível.","Confirme os locais e horários oficiais do município."]},
  {id:"farmacia",title:"Assistência farmacêutica",cat:"Assistência",icon:"💊",tone:"peach",summary:"Informações gerais sobre medicamentos disponibilizados pela rede pública.",info:"O acesso a medicamentos no SUS depende das listas, protocolos e fluxos de cada rede.",steps:["Procure a farmácia municipal ou unidade de referência.","Confirme quais documentos e receitas são necessários.","Verifique a disponibilidade nos canais oficiais."]},
  {id:"exames",title:"Exames e encaminhamentos",cat:"Atendimentos",icon:"🧪",tone:"violet",summary:"Entenda como buscar informações sobre pedidos de exames e encaminhamentos.",info:"Exames e encaminhamentos podem depender de avaliação profissional e processos de regulação.",steps:["Siga as orientações da equipe que solicitou o exame.","Confira os documentos necessários.","Use os canais oficiais para informações sobre solicitações."]},
  {id:"mulher",title:"Saúde da mulher",cat:"Prevenção",icon:"🌷",tone:"peach",summary:"Orientações gerais sobre cuidado, prevenção e acompanhamento.",info:"A atenção à saúde da mulher inclui ações de prevenção, acompanhamento e orientação.",steps:["Busque sua UBS de referência.","Pergunte quais programas estão disponíveis.","Converse com a equipe sobre o acompanhamento recomendado."]},
  {id:"bucal",title:"Saúde bucal",cat:"Atendimentos",icon:"🦷",tone:"blue",summary:"Conheça caminhos para buscar cuidado odontológico na rede de atenção básica.",info:"As equipes de saúde bucal podem oferecer ações educativas, preventivas e atendimento, conforme a organização local.",steps:["Pergunte à UBS sobre oferta de saúde bucal.","Confirme as orientações de acolhimento.","Em urgências, procure a rede indicada pelo município."]},
  {id:"mental",title:"Saúde mental",cat:"Assistência",icon:"🧠",tone:"violet",summary:"Informações sobre acolhimento e os pontos de cuidado na rede de saúde.",info:"A rede de atenção psicossocial envolve diferentes serviços; a UBS pode orientar sobre os fluxos locais.",steps:["Procure sua UBS ou serviço municipal de referência.","Pergunte sobre acolhimento e serviços disponíveis.","Em risco imediato, procure atendimento de urgência."]},
  {id:"urgencia",title:"Urgências e emergências",cat:"Urgência",icon:"🚑",tone:"peach",summary:"Saiba como pedir ajuda quando alguém precisa de atendimento imediato.",info:"Em situações de risco imediato à vida, procure atendimento de urgência. No Brasil, o SAMU pode ser acionado pelo número 192.",steps:["Em uma emergência, ligue 192.","Informe sua localização ao atendente.","Siga as orientações do serviço de emergência."]},
  {id:"territorio",title:"Cuidados no território",cat:"Prevenção",icon:"🏡",tone:"mint",summary:"Conheça o trabalho das equipes de saúde da família junto à comunidade.",info:"Equipes da atenção primária promovem cuidado, educação em saúde e acompanhamento no território.",steps:["Conheça sua equipe de referência.","Procure informações oficiais sobre ações disponíveis.","Utilize os canais de atendimento do município."]}
];

const tips = [
  {icon:"🩺",title:"Quando procurar a UBS?",description:"Atendimento de rotina, prevenção e acompanhamento na atenção primária.",url:"https://www.gov.br/saude/pt-br"},
  {icon:"📱",title:"Meu SUS Digital",description:"Conheça os recursos disponíveis no serviço oficial do Governo Federal.",url:"https://meususdigital.saude.gov.br/"},
  {icon:"💉",title:"Vacinação e prevenção",description:"Consulte informações de saúde em fontes oficiais atualizadas.",url:"https://www.gov.br/saude/pt-br"},
  {icon:"☎️",title:"Disque Saúde 136",description:"Canal oficial de informações do Ministério da Saúde.",url:"https://www.gov.br/saude/pt-br"},
  {icon:"🚑",title:"Emergências",description:"Em situação de emergência, ligue 192 (SAMU).",url:"https://www.gov.br/saude/pt-br"},
  {icon:"🔎",title:"Fontes confiáveis",description:"Prefira os canais oficiais para verificar orientações de saúde.",url:"https://www.gov.br/saude/pt-br"}
];

const checklist = [
  {id:"documentos",label:"Conferir os documentos necessários antes da visita à unidade"},
  {id:"horarios",label:"Confirmar o endereço e o horário nos canais oficiais"},
  {id:"vacinas",label:"Consultar o calendário de vacinação atualizado"}
];

const routes = {"inicio":"Visão geral","servicos":"Serviços de saúde","rede":"Rede municipal","administracao":"Administração","assinaturas":"Licenças e assinaturas","modulos":"Módulos da plataforma","unidades":"Unidades de saúde","avisos":"Avisos e campanhas","calendario":"Calendário de ações","meu-espaco":"Meu espaço","orientacoes":"Orientações","gestao":"Painel profissional","sobre":"Sobre o projeto"};
const $ = selector => document.querySelector(selector);
const safeGet = key => {try{return localStorage.getItem(key)}catch{return null}};
const safeSet = (key,value) => {try{localStorage.setItem(key,value)}catch{console.info("Armazenamento indisponível.")}};
const getJson = (key,fallback) => {try{let v=safeGet(key);return v===null?fallback:JSON.parse(v)}catch{return fallback}};
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state = {
  filter:"Todos",
  query:"",
  favorites:getJson("cs_favorites",[]),
  checks:getJson("cs_checks",{}),
  theme:safeGet("cs_theme")||"light",
  largeText:safeGet("cs_large_text")==="true",
  consent:safeGet("cs_analytics_consent")
};
if(!Array.isArray(state.favorites))state.favorites=[];
if(!state.checks||Array.isArray(state.checks)||typeof state.checks!=="object")state.checks={};
document.body.classList.toggle("dark",state.theme==="dark");
document.body.classList.toggle("large-text",state.largeText);
$("#year").textContent=String(new Date().getFullYear());
const route = () => {const key=decodeURIComponent(location.hash.replace(/^#/,"")).split("?")[0]||"inicio";return Object.prototype.hasOwnProperty.call(routes,key)?key:"inicio"};
const notice = detail => `<div class="notice" role="note"><span class="notice-icon" aria-hidden="true">ⓘ</span><div><strong>Ambiente demonstrativo.</strong> ${detail||"Os serviços são ilustrativos e não representam os horários, agendamentos ou disponibilidade de nenhum município."}</div></div>`;
const favoriteTotal = () => services.filter(s=>state.favorites.includes(s.id)).length;
function card(s){
 const favorite=state.favorites.includes(s.id);
 return `<article class="service-card">
  <div class="service-top"><span class="service-icon" data-tone="${s.tone}" aria-hidden="true">${s.icon}</span><button type="button" class="favorite-btn ${favorite?"is-favorite":""}" data-action="favorite" data-id="${s.id}" aria-label="${favorite?"Remover dos":"Adicionar aos"} favoritos: ${escapeHtml(s.title)}" aria-pressed="${favorite}">${favorite?"♥":"♡"}</button></div>
  <span class="category">${escapeHtml(s.cat)}</span><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.summary)}</p>
  <div class="service-bottom"><small>Guia informativo</small><button type="button" data-action="details" data-id="${s.id}">Ver detalhes ↗</button></div></article>`;
}
function home(){
return `<section class="hero"><div class="hero-copy"><span class="eyebrow">✦ CUIDADO QUE CONECTA</span><h1>Uma saúde mais próxima. <span>Uma vida mais simples.</span></h1><p>Informações, orientações e serviços de saúde reunidos em um só lugar. Um novo jeito de aproximar pessoas e cuidado.</p><div class="hero-actions"><a href="#servicos" class="btn btn-primary">Explorar serviços ↗</a><a href="#sobre" class="btn btn-light">Conheça o projeto</a></div></div><div class="hero-visual" aria-hidden="true"><div class="hero-orbit"><span class="hero-heart">✚</span></div><div class="float-pill float-pill--one">✦ Informação acessível</div><div class="float-pill float-pill--two">♡ Cuidado para todos</div></div></section>
${notice()}
<section class="network-promo"><div><span class="section-kicker">INFORMAÇÕES POR MUNICÍPIO</span><h2>Encontre os serviços da sua cidade</h2><p>Conheça os municípios cadastrados e consulte unidades, campanhas e ações publicadas pelas equipes autorizadas.</p></div><a href="#rede" class="btn btn-solid">Explorar rede municipal ↗</a></section>
<div class="section-head"><div><span class="section-kicker">NOVOS BLOCOS</span><h2>Explore as funcionalidades</h2><p>Comece por três áreas que você já pode experimentar.</p></div><a href="#modulos" class="text-link">Todos os módulos ↗</a></div>
<section class="module-grid module-grid--compact" aria-label="Novos módulos de demonstração">
 <a href="#unidades" class="module-card"><span class="module-bubble" aria-hidden="true">🏥</span><strong class="module-card-title">Unidades de saúde</strong><span class="module-card-description">Cadastre e encontre locais de atendimento.</span><span class="module-card-foot">Explorar <span aria-hidden="true">↗</span></span></a>
 <a href="#avisos" class="module-card"><span class="module-bubble" aria-hidden="true">📣</span><strong class="module-card-title">Avisos e campanhas</strong><span class="module-card-description">Organize comunicados e campanhas.</span><span class="module-card-foot">Explorar <span aria-hidden="true">↗</span></span></a>
 <a href="#calendario" class="module-card"><span class="module-bubble" aria-hidden="true">🗓️</span><strong class="module-card-title">Calendário de ações</strong><span class="module-card-description">Crie datas de atividades comunitárias.</span><span class="module-card-foot">Explorar <span aria-hidden="true">↗</span></span></a>
</section>
<section class="stats-grid" aria-label="Áreas da plataforma">
<div class="stat-card"><span class="stat-icon stat-icon--mint">▦</span><h3>Serviços</h3><p>Explore orientações de atendimento.</p></div>
<div class="stat-card"><span class="stat-icon stat-icon--blue">♧</span><h3>Prevenção</h3><p>Informação para o cuidado diário.</p></div>
<div class="stat-card"><span class="stat-icon stat-icon--peach">♡</span><h3>Meu espaço</h3><p>Salve seus serviços de interesse.</p></div>
<div class="stat-card"><span class="stat-icon stat-icon--violet">▤</span><h3>Gestão</h3><p>Veja o conceito de painel profissional.</p></div>
</section>
<div class="section-head"><div><span class="section-kicker">DESCUBRA</span><h2>Como podemos ajudar?</h2><p>Informações práticas para seu dia a dia.</p></div><a href="#servicos" class="text-link">Ver todos os serviços ↗</a></div>
<section class="service-grid" aria-label="Serviços em destaque">${services.slice(0,6).map(card).join("")}</section>
<div class="section-head"><div><span class="section-kicker">FEITO PARA FACILITAR</span><h2>Uma experiência mais simples</h2></div></div>
<section class="split-grid">
<div class="panel"><h3>Informação em poucos passos</h3>
<div class="step-row"><span class="step-number">01</span><div><strong>Encontre o que procura</strong><small>Explore orientações divididas por assunto.</small></div></div>
<div class="step-row"><span class="step-number">02</span><div><strong>Salve o que é importante</strong><small>Adicione serviços aos favoritos.</small></div></div>
<div class="step-row"><span class="step-number">03</span><div><strong>Confirme com a rede oficial</strong><small>Consulte os canais municipais antes de se deslocar.</small></div></div>
</div>
<div class="feature-panel"><span class="feature-icon" aria-hidden="true">✳</span><div class="section-kicker">NOSSO PROPÓSITO</div><h3>Tecnologia mais humana, cuidado mais acessível.</h3><p>O ConectaSaúde está nascendo para aproximar cidadãos e serviços, complementar os sistemas oficiais e apoiar uma gestão melhor.</p><a href="#sobre" class="btn btn-outline">Entenda nossa visão ↗</a></div>
</section>`;
}
function matches(){
 const query=state.query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 return services.filter(s=>(state.filter==="Todos"||state.filter===s.cat)&&`${s.title} ${s.summary} ${s.cat}`.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(query));
}
function serviceResults(){
 const result=matches();
 return `<p style="font-size:11px;color:var(--muted);margin:0 0 13px">${result.length} ${result.length===1?"serviço encontrado":"serviços encontrados"}</p>${result.length?`<div class="service-grid">${result.map(card).join("")}</div>`:`<div class="empty-state"><span style="font-size:35px">⌕</span><strong>Nenhum serviço encontrado</strong><p>Tente outra pesquisa ou categoria.</p><button type="button" class="btn btn-solid" data-action="reset-search">Limpar pesquisa</button></div>`}`;
}
function catalog(){
 return `<div class="page-heading"><div><span class="section-kicker">GUIA DE SERVIÇOS</span><h1>Como podemos ajudar você?</h1><p>Explore informações gerais de saúde. Nas próximas versões, o conteúdo poderá ser personalizado por município.</p></div><span class="pill">✦ ${services.length} temas</span></div>
 ${notice("Esta versão não realiza agendamentos nem consultas de estoques. Confirme sempre o atendimento nos canais oficiais.")}
 <label class="search-inline"><span aria-hidden="true">⌕</span><input id="serviceSearch" type="search" placeholder="Pesquise por consultas, vacinas, exames..." aria-label="Filtrar serviços" autocomplete="off" value="${escapeHtml(state.query)}"></label>
 <div class="filter-bar" role="group" aria-label="Filtrar categorias">${["Todos","Atendimentos","Prevenção","Assistência","Urgência"].map(cat=>`<button type="button" class="filter-btn ${state.filter===cat?"active":""}" data-action="filter" data-filter="${cat}" aria-pressed="${state.filter===cat}">${cat}</button>`).join("")}</div>
 <section id="results" aria-label="Resultados">${serviceResults()}</section>`;
}
function mySpace(){
 const favorites=services.filter(s=>state.favorites.includes(s.id));
 return `<div class="page-heading"><div><span class="section-kicker">SEU ESPAÇO</span><h1>O que importa, em um só lugar.</h1><p>Salve links úteis e use um checklist simples. Estas preferências ficam somente no navegador deste dispositivo.</p></div><span class="pill">♡ ${favoriteTotal()} favoritos</span></div>
 ${notice("Não criamos cadastro nem guardamos dados clínicos neste protótipo. Seus favoritos e marcações ficam apenas neste dispositivo.")}
 <div class="section-head"><div><h2>Seus serviços favoritos</h2><p>Toque no coração dos serviços que deseja guardar.</p></div><a href="#servicos" class="text-link">Explorar serviços ↗</a></div>
 ${favorites.length?`<div class="service-grid">${favorites.map(card).join("")}</div>`:`<div class="empty-state"><span style="font-size:35px">♡</span><strong>Seus favoritos aparecerão aqui</strong><p>Explore o catálogo e marque o coração de um serviço.</p><a href="#servicos" class="btn btn-solid">Conhecer serviços ↗</a></div>`}
 <div class="section-head"><div><h2>Checklist prático</h2><p>Lembretes gerais antes de procurar um serviço.</p></div><button type="button" class="btn btn-outline" data-action="clear-checks">Limpar marcações</button></div>
 <div class="panel"><div class="mini-list">${checklist.map(item=>`<label class="check-row ${state.checks[item.id]?"checked":""}"><input type="checkbox" data-check="${item.id}" ${state.checks[item.id]?"checked":""}><span>${escapeHtml(item.label)}</span></label>`).join("")}</div></div>`;
}
function guidance(){
 return `<div class="page-heading"><div><span class="section-kicker">CONHECIMENTO QUE CUIDA</span><h1>Informação confiável faz diferença.</h1><p>Orientações gerais com referências a serviços oficiais. Não oferecemos diagnóstico ou recomendações de tratamento.</p></div></div>
 <section class="resources-grid">${tips.map(t=>`<article class="resource-card"><span class="resource-emoji" aria-hidden="true">${t.icon}</span><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.description)}</p><a href="${t.url}" target="_blank" rel="noopener noreferrer">Acessar canal oficial ↗</a></article>`).join("")}</section>
 <div class="section-head"><div><h2>Em caso de urgência</h2></div></div>
 <div class="panel"><h3>Não espere por uma resposta do aplicativo.</h3><p>Se houver perigo imediato, ligue <strong>192 (SAMU)</strong> ou procure o serviço de urgência disponível na sua região.</p></div>`;
}
function management(){
 const chart=[["Jan",55],["Fev",66],["Mar",61],["Abr",79],["Mai",74],["Jun",91]];
 return `<div class="page-heading"><div><span class="section-kicker">VISÃO PROFISSIONAL</span><h1>Mais clareza para cuidar melhor.</h1><p>Uma prévia de como indicadores podem apoiar o trabalho de gestores e equipes.</p></div><span class="pill">▤ PAINEL DEMONSTRATIVO</span></div>
 <div class="disclaimer"><strong>⚠ Simulação com dados inteiramente fictícios.</strong> Todos os números, gráficos e atividades são exemplos de interface. Nenhum dado foi extraído de Pontalina ou de sistemas públicos.</div>
 <section class="metrics-grid"><div class="metric"><span>Atendimentos acompanhados</span><strong>1.284</strong><small>↗ +12% fictício</small></div><div class="metric"><span>Demandas organizadas</span><strong>96%</strong><small>↗ +4% fictício</small></div><div class="metric"><span>Ações preventivas</span><strong>342</strong><small>↗ +8% fictício</small></div></section>
 <div class="section-head"><div><h2>Visão integrada</h2><p>Indicadores meramente ilustrativos.</p></div></div>
 <section class="split-grid"><div class="panel"><h3>Acompanhamentos fictícios</h3><p>Gráfico de exemplo, sem qualquer dado real.</p><div class="bar-chart" role="img" aria-label="Gráfico fictício de janeiro a junho">${chart.map(([m,v])=>`<div class="bar-column"><div class="bar-shape" style="height:${v}%"></div><small>${m}</small></div>`).join("")}</div></div>
 <div class="panel"><h3>Próximas possibilidades</h3>
 <div class="step-row"><span class="step-number">✦</span><div><strong>Informações em um lugar só</strong><small>Painéis claros e fáceis de interpretar.</small></div></div>
 <div class="step-row"><span class="step-number">✦</span><div><strong>Alertas inteligentes</strong><small>Funcionalidade futura sujeita a validação.</small></div></div>
 <div class="step-row"><span class="step-number">✦</span><div><strong>Municípios independentes</strong><small>Indicadores e perfis específicos por cidade.</small></div></div></div></section>
 <div class="section-head"><div><h2>Organização de demandas</h2></div></div>
 <div class="panel" style="overflow-x:auto"><table class="table-like"><thead><tr><th>Área fictícia</th><th>Exemplo de atividade</th><th style="text-align:right">Situação</th></tr></thead><tbody><tr><td>Atenção básica</td><td>Revisão de indicadores</td><td><span class="tag">Simulado</span></td></tr><tr><td>Campanhas</td><td>Planejamento de divulgação</td><td><span class="tag">Simulado</span></td></tr><tr><td>Serviços</td><td>Atualização de informações</td><td><span class="tag warn">Pendente fictício</span></td></tr></tbody></table></div>
 <div class="section-head"><div><h2>Segurança antes de dados reais</h2></div></div><div class="feature-panel"><h3>Evolução responsável.</h3><p>Antes de conectar dados municipais, será necessário implementar autenticação, isolamento entre municípios, auditoria e regras de acesso compatíveis com a LGPD.</p><a href="#sobre" class="btn btn-outline">Conheça a proposta ↗</a></div>`;
}
function about(){
 return `<div class="page-heading"><div><span class="section-kicker">SOBRE O PROJETO</span><h1>Uma plataforma independente, feita para aproximar.</h1><p>O ConectaSaúde é um produto em construção, pensado para servir diferentes municípios com identidade própria.</p></div></div>
 <section class="hero" style="min-height:210px"><div class="hero-copy"><span class="eyebrow">✦ NOSSA VISÃO</span><h1>Menos barreiras. <span>Mais conexão.</span></h1><p>Usar tecnologia para tornar informações de saúde acessíveis e apoiar o trabalho de quem cuida.</p></div><div class="hero-visual" aria-hidden="true"><div class="hero-orbit"><span class="hero-heart">✚</span></div></div></section>
 <div class="section-head"><div><h2>Como estamos construindo</h2></div></div>
 <section class="split-grid"><div class="panel"><h3>O que existe hoje</h3><p>Um protótipo com busca de serviços, favoritos locais, orientações e painel de gestão com dados fictícios. Ainda não há integração com secretarias municipais ou prontuários.</p><h3>O próximo passo</h3><p>Criar módulos configuráveis, autenticação e integrações autorizadas, com acesso por perfil e isolamento entre municípios.</p></div>
 <div class="panel"><h3>Privacidade por princípio</h3><p>Não coletamos informações clínicas. Favoritos, checklist e preferências ficam somente no navegador. O Analytics é opcional e requer sua autorização.</p><div class="button-row"><button type="button" class="btn btn-outline" data-action="consent-settings">Preferências do Analytics</button><button type="button" class="btn btn-outline" data-action="clear-local">Apagar dados locais</button></div></div></section>
 ${notice("Esta iniciativa é independente e não representa um canal oficial de atendimento de prefeitura. O uso de dados reais exige autorizações e cuidados legais específicos.")}`;
}
const views={"inicio":home,"servicos":catalog,"rede":()=>'<div class="loading">Carregando rede municipal...</div>',"administracao":()=>'<div class="loading">Carregando acesso administrativo...</div>',"assinaturas":()=>'<div class="loading">Preparando área comercial...</div>',"modulos":modules.overview,"unidades":modules.units,"avisos":modules.notices,"calendario":modules.calendar,"meu-espaco":mySpace,"orientacoes":guidance,"gestao":management,"sobre":about};
let renderVersion=0;
let routeController;
function render(){
 routeController?.abort();
 const currentController=new AbortController();
 routeController=currentController;
 const version=++renderVersion;
 const current=route();
 const container=$("#view");
 container.innerHTML=views[current]();
 $("#pageTitle").textContent=routes[current];
 document.title=`${routes[current]} | ConectaSaúde`;
 document.querySelectorAll("[data-nav]").forEach(el=>{
  const active=el.dataset.nav===current;
  el.classList.toggle("active",active);
  if(active)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
 });
 const valid=()=>!currentController.signal.aborted&&version===renderVersion&&container.isConnected;
 if(current==="rede"){
  void import("./network.js").then(({mountNetwork})=>{
   if(valid())void mountNetwork(container,currentController.signal).catch(error=>showModuleError(error,currentController.signal));
  }).catch(error=>showModuleError(error,currentController.signal));
 }
 if(current==="administracao"){
  void import("./admin.js").then(({mountAdmin})=>{
   if(valid())mountAdmin(container,toast,currentController.signal);
  }).catch(error=>showModuleError(error,currentController.signal));
 }
 if(current==="assinaturas"){
  void import("./billing.js").then(({mountBilling})=>{
   if(valid())mountBilling(container,toast,currentController.signal);
  }).catch(error=>showModuleError(error,currentController.signal));
 }
}
function showModuleError(error,signal){
 if(signal?.aborted)return;
 console.error("Falha ao carregar módulo:",error);
 if(["rede","administracao","assinaturas"].includes(route())){
  $("#view").innerHTML='<div class="disclaimer"><strong>Não foi possível carregar esta área.</strong> Verifique a conexão, as configurações do Firebase e atualize a página.</div>';
 }
}
let toastTimer;
function toast(message){
 const element=$("#toast");
 element.textContent=message;element.classList.add("show");
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove("show"),3200);
}
function detail(id){
 const s=services.find(s=>s.id===id);if(!s)return;
 const favorite=state.favorites.includes(s.id);
 $("#dialogContent").innerHTML=`<button type="button" class="dialog-close" data-action="close-dialog" aria-label="Fechar">×</button><div class="dialog-emoji" aria-hidden="true">${s.icon}</div><span class="section-kicker">${s.cat}</span><h2 id="dialogTitle">${escapeHtml(s.title)}</h2><p>${escapeHtml(s.info)}</p><h3 style="font-size:14px;margin:17px 0 6px">Por onde começar?</h3><ul>${s.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join("")}</ul><p><strong>Importante:</strong> Confirme a disponibilidade e os fluxos nos canais oficiais do município. Esta tela é apenas informativa.</p><button type="button" class="btn btn-solid" data-action="favorite" data-id="${s.id}">${favorite?"♥ Remover dos favoritos":"♡ Salvar nos favoritos"}</button>`;
 $("#serviceDialog").showModal();
}
function toggleFavorite(id){
 if(!services.some(s=>s.id===id))return;
 const included=state.favorites.includes(id);
 state.favorites=included?state.favorites.filter(value=>value!==id):[...state.favorites,id];
 safeSet("cs_favorites",JSON.stringify(state.favorites));
 if($("#serviceDialog").open){
  $("#serviceDialog").close();
  detail(id);
 }
 const y=scrollY;render();scrollTo(0,y);
 toast(included?"Removido dos favoritos.":"Salvo nos seus favoritos!");
}
function showConsent(){
 $("#analyticsBanner").innerHTML=`<p><strong>Respeitamos sua privacidade.</strong> Permite estatísticas opcionais de uso para melhorar o protótipo? Não registramos informações de saúde no Analytics. <a href="#sobre" style="text-decoration:underline;font-weight:700">Saiba mais</a>.</p><div class="button-row"><button type="button" class="btn btn-outline" data-action="decline">Não permitir</button><button type="button" class="btn btn-solid" data-action="accept">Permitir</button></div>`;
 $("#analyticsBanner").hidden=false;
}
async function enableAnalyticsIfConsented(){
 try{const {enableAnalytics}=await import("./firebase.js");await enableAnalytics()}
 catch(error){console.warn("Analytics indisponível.",error)}
}
document.addEventListener("click",event=>{
 const el=event.target.closest("[data-action]");if(!el)return;
 const action=el.dataset.action;
 if(action==="favorite")toggleFavorite(el.dataset.id);
 if(action==="details")detail(el.dataset.id);
 if(action==="close-dialog")$("#serviceDialog").close();
 if(action==="filter"){state.filter=el.dataset.filter;render()}
 if(action==="reset-search"){state.filter="Todos";state.query="";render();$("#serviceSearch")?.focus()}
 if(action==="clear-checks"){state.checks={};safeSet("cs_checks","{}");render();toast("Marcações limpas.")}
 if(action==="consent-settings")showConsent();
 if(action==="decline"){state.consent="declined";safeSet("cs_analytics_consent","declined");$("#analyticsBanner").hidden=true;toast("Analytics opcional desativado.")}
 if(action==="accept"){state.consent="accepted";safeSet("cs_analytics_consent","accepted");$("#analyticsBanner").hidden=true;void enableAnalyticsIfConsented();toast("Preferência registrada.")}
 if(action==="clear-local"){
  state.favorites=[];state.checks={};safeSet("cs_favorites","[]");safeSet("cs_checks","{}");render();toast("Favoritos e marcações locais apagados.");
 }
});
document.addEventListener("change",event=>{
 const el=event.target.closest("[data-check]");if(!el)return;
 state.checks[el.dataset.check]=el.checked;safeSet("cs_checks",JSON.stringify(state.checks));
 el.closest(".check-row")?.classList.toggle("checked",el.checked);
});
document.addEventListener("input",event=>{
 if(event.target.id!=="serviceSearch")return;
 state.query=event.target.value;
 $("#results").innerHTML=serviceResults();
});
$("#globalSearchForm").addEventListener("submit",event=>{
 event.preventDefault();state.query=$("#globalSearch").value;state.filter="Todos";
 if(route()==="servicos")render();else location.hash="#servicos";
});
$("#themeButton").addEventListener("click",()=>{
 state.theme=state.theme==="dark"?"light":"dark";
 document.body.classList.toggle("dark",state.theme==="dark");
 safeSet("cs_theme",state.theme);
 $("#themeButton").textContent=state.theme==="dark"?"☀":"☾";
});
$("#textSizeButton").addEventListener("click",()=>{
 state.largeText=!state.largeText;
 document.body.classList.toggle("large-text",state.largeText);
 safeSet("cs_large_text",String(state.largeText));
 toast(state.largeText?"Fonte ampliada.":"Fonte normal.");
});
$("#serviceDialog").addEventListener("click",event=>{
 if(event.target===$("#serviceDialog"))$("#serviceDialog").close();
});
window.addEventListener("hashchange",()=>{render();window.scrollTo(0,0)});
$("#themeButton").textContent=state.theme==="dark"?"☀":"☾";
modules.setup({refresh:render,toast});
render();
if(!state.consent)showConsent();
else if(state.consent==="accepted")void enableAnalyticsIfConsented();