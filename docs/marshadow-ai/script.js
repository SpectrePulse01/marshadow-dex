// =========================================================================
// 1. IMPORTS E CONFIGURAÇÃO DO FIREBASE (Sintaxe Modular v12)
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, writeBatch } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9w9JM_QWc4PJeH5U2WiF84Fv8EmPA2rY",
  authDomain: "marshadow-ai.firebaseapp.com",
  projectId: "marshadow-ai",
  storageBucket: "marshadow-ai.firebasestorage.app",
  messagingSenderId: "873129582429",
  appId: "1:873129582429:web:06e41f621bb77c46a452b4",
  measurementId: "G-65WRX8680K"
};

// Inicializando os serviços
const app = initializeApp(firebaseConfig);
void analyticsIsSupported().then((supported) => {
    if (supported) getAnalytics(app);
}).catch(() => undefined);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({ prompt: 'select_account' });

const haunterCursor = document.getElementById("haunter-cursor");
if (haunterCursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let cursorFrame = 0;
    window.addEventListener("pointermove", (event) => {
        cancelAnimationFrame(cursorFrame);
        cursorFrame = requestAnimationFrame(() => {
            haunterCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
            haunterCursor.classList.add("is-visible");
        });
    }, { passive: true });
    window.addEventListener("pointerover", (event) => {
        const target = event.target;
        haunterCursor.classList.toggle("is-hovering", Boolean(target?.closest?.("button, a, textarea, input, .chat-item")));
    }, { passive: true });
    window.addEventListener("pointerout", (event) => {
        if (!event.relatedTarget) haunterCursor.classList.remove("is-visible");
    }, { passive: true });
}

// Variáveis de controle globais
let usuarioAtual = null;
let chatHistory = [];
let mensagensSalvas = [];
let conversaAtivaId = null;
let perguntaEmAndamento = false;
const CONVERSA_LEGADA_ID = "historico-anterior";
const GEMINI_ENDPOINT = "https://pokemon-eclipse-nexus.grand-finch-8395.chatgpt.site/api/marshadow";
const titulosEmGeracao = new Set();
const titulosEditadosManualmente = new Set();
const conversasExcluidas = new Set();

// Elementos da interface
const loginModal = document.getElementById("login-modal");
const btnCloseLogin = document.getElementById("btn-close-login");
const btnOpenLogin = document.getElementById("btn-open-login");
const btnGoogleLogin = document.getElementById("btn-google-login");
const btnGuestLogin = document.getElementById("btn-guest-login");
const loginStatus = document.getElementById("login-status");
const btnNewChat = document.querySelector(".new-chat-btn");
const chatsList = document.querySelector(".chats-list");
const deleteDialog = document.getElementById("delete-dialog");
const deleteDialogBackdrop = document.getElementById("delete-dialog-backdrop");
const deleteDialogConversation = document.getElementById("delete-dialog-conversation");
const deleteDialogCancel = document.getElementById("delete-dialog-cancel");
const deleteDialogConfirm = document.getElementById("delete-dialog-confirm");
let resolverConfirmacaoExclusao = null;
let focoAntesDaConfirmacao = null;

function mostrarSidebarVazia(texto) {
    if (chatsList) chatsList.innerHTML = `<p class="no-chats">${texto}</p>`;
}

function fecharConfirmacaoExclusao(confirmado = false) {
    if (!deleteDialog || deleteDialog.hidden) return;
    deleteDialog.classList.add("is-closing");
    const resolver = resolverConfirmacaoExclusao;
    resolverConfirmacaoExclusao = null;

    window.setTimeout(() => {
        deleteDialog.hidden = true;
        deleteDialog.classList.remove("is-visible", "is-closing");
        deleteDialog.setAttribute("aria-hidden", "true");
        document.body.classList.remove("has-delete-dialog");
        if (focoAntesDaConfirmacao?.isConnected) focoAntesDaConfirmacao.focus();
        focoAntesDaConfirmacao = null;
        resolver?.(confirmado);
    }, 220);
}

function solicitarConfirmacaoExclusao(titulo) {
    if (!deleteDialog || !deleteDialogConversation || !deleteDialogConfirm) return Promise.resolve(false);
    if (resolverConfirmacaoExclusao) fecharConfirmacaoExclusao(false);

    focoAntesDaConfirmacao = document.activeElement;
    deleteDialogConversation.textContent = `“${titulo}”`;
    deleteDialog.hidden = false;
    deleteDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-delete-dialog");

    requestAnimationFrame(() => {
        deleteDialog.classList.add("is-visible");
        deleteDialogConfirm.focus();
    });

    return new Promise((resolve) => { resolverConfirmacaoExclusao = resolve; });
}

deleteDialogCancel?.addEventListener("click", () => fecharConfirmacaoExclusao(false));
deleteDialogBackdrop?.addEventListener("click", () => fecharConfirmacaoExclusao(false));
deleteDialogConfirm?.addEventListener("click", () => fecharConfirmacaoExclusao(true));
document.addEventListener("keydown", (event) => {
    if (!deleteDialog || deleteDialog.hidden) return;
    if (event.key === "Escape") {
        event.preventDefault();
        fecharConfirmacaoExclusao(false);
        return;
    }
    if (event.key !== "Tab" || !deleteDialogCancel || !deleteDialogConfirm) return;
    const limiteInicial = deleteDialogCancel;
    const limiteFinal = deleteDialogConfirm;
    if (event.shiftKey && document.activeElement === limiteInicial) {
        event.preventDefault();
        limiteFinal.focus();
    } else if (!event.shiftKey && document.activeElement === limiteFinal) {
        event.preventDefault();
        limiteInicial.focus();
    }
});

const systemInstruction = `
Você é a Marshadow AI, uma inteligência artificial inspirada no Pokémon Marshadow.
Você é especialista em Pokémon competitivo, Smogon, VGC, Singles, Doubles, Ubers, OU, UU, NU, Monotype, Team Building, Nature, EVs, IVs, Abilities, Movesets, estratégias de batalha, itens, matchups, estatísticas, tipagens, lore Pokémon, Pokédex, anime Pokémon, jogos Pokémon, Mega Evoluções, Gigantamax, Terastalização, Pokémon lendários, Pokémon míticos e Shiny Pokémon.
Sua função é ajudar treinadores Pokémon a melhorar seus times, entender mecânicas do jogo, aprender lore e vencer batalhas.

Regras obrigatórias:
- IMPORTANTE: Sempre use espaços normais entre as palavras. Nunca junte as palavras.
- Detecte automaticamente o idioma da pergunta.
- Responda sempre no mesmo idioma utilizado pelo usuário.
- Seja preciso e confiável.
- Seja objetivo.
- Evite respostas excessivamente longas.
- Não utilize Markdown.
- Não utilize símbolos como ##, ### ou **.
- Não utilize tabelas.
- Não utilize emojis excessivos.
- Organize a resposta de forma limpa e fácil de ler com quebras de linha.
- Nunca invente informações.

Formato da resposta:
Resposta: [resposta principal]

Motivo: [explicação]

Dica: [dica opcional]
`;

// =========================================================================
// 2. FUNÇÕES DE AUTENTICAÇÃO
// =========================================================================

if (btnCloseLogin) {
    btnCloseLogin.addEventListener("click", () => {
        loginModal.style.display = "none";
    });
}

if (btnOpenLogin) {
    btnOpenLogin.addEventListener("click", async () => {
        if (usuarioAtual) {
            if (confirm("Deseja mesmo sair da sua conta?")) {
                try {
                    await signOut(auth);
                    alert("Você saiu da conta.");
                } catch (error) {
                    console.error("Erro ao deslogar:", error);
                }
            }
        } else {
            loginModal.style.display = "flex";
        }
    });
}

async function loginComGoogle() {
  try {
    if (loginStatus) loginStatus.textContent = "Abrindo o Google...";
    const result = await signInWithPopup(auth, provider);
    usuarioAtual = result.user;
    console.log("Usuário logado com sucesso via clique:", usuarioAtual.displayName);
    loginModal.style.display = "none";
  } catch (error) {
    console.error("Erro no login:", error.message);
    if (!loginStatus) return;
    if (error.code === "auth/unauthorized-domain") {
      loginStatus.textContent = `Autorize o domínio ${window.location.hostname} no Firebase: Authentication → Settings → Authorized domains.`;
    } else if (error.code === "auth/popup-blocked") {
      loginStatus.textContent = "O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente novamente.";
    } else if (error.code === "auth/popup-closed-by-user") {
      loginStatus.textContent = "A janela de login foi fechada antes da conclusão.";
    } else {
      loginStatus.textContent = "Não foi possível concluir o login agora. Você ainda pode conversar no modo visitante.";
    }
  }
}

if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener("click", loginComGoogle);
}

if (btnGuestLogin) {
    btnGuestLogin.addEventListener("click", () => {
        if (loginModal) loginModal.style.display = "none";
        document.getElementById("question")?.focus();
    });
}

// Monitoramento de Sessão Seguro
onAuthStateChanged(auth, (user) => {
  const responseBox = document.getElementById("response");
  if (user) {
    usuarioAtual = user;
    console.log("Sessão ativa UID:", user.uid);
    
    if (loginModal) loginModal.style.display = "none"; 
    if (btnOpenLogin) btnOpenLogin.textContent = "Sair";
    
    // Dispara a busca do histórico de forma assíncrona sem travar a autenticação
    carregarHistoricoDoFirebase();
  } else {
    usuarioAtual = null;
    chatHistory = [];
    mensagensSalvas = [];
    conversaAtivaId = null;
    if (btnOpenLogin) btnOpenLogin.textContent = "Entrar";
    if (loginModal) loginModal.style.display = "none";
    if (responseBox) {
        responseBox.innerHTML = '<div class="guest-notice">Modo visitante ativo. Converse normalmente; entre com o Google apenas se quiser salvar o histórico.</div>';
    }
    mostrarSidebarVazia("Modo visitante — histórico temporário");
  }
});

// =========================================================================
// 3. PERSISTÊNCIA NA NUVEM (FIRESTORE)
// =========================================================================

async function carregarHistoricoDoFirebase() {
    if (!usuarioAtual) return;

    const responseBox = document.getElementById("response");
    if (!responseBox) return;
    responseBox.innerHTML = ""; 

    if (chatsList) chatsList.innerHTML = ""; 

    try {
        const mensagensRef = collection(db, "chats", usuarioAtual.uid, "messages");
        const q = query(mensagensRef, orderBy("timestamp", "asc"));
        const snapshot = await getDocs(q);

        chatHistory = [];
        mensagensSalvas = [];

        snapshot.forEach((documento) => {
            const dados = documento.data();
            mensagensSalvas.push({
                id: documento.id,
                conversationId: dados.conversationId || CONVERSA_LEGADA_ID,
                role: dados.role,
                parts: [{ text: dados.text }],
                timestamp: dados.timestamp?.toMillis?.() || 0
            });
        });

        reconstruirMenuLateralComHistoricoCompleto();

        const conversaMaisRecente = mensagensSalvas.at(-1)?.conversationId;
        if (conversaMaisRecente) {
            abrirConversa(conversaMaisRecente);
        } else {
            conversaAtivaId = null;
            responseBox.innerHTML = '<div class="empty-chat-state">Comece uma nova conversa com Marshadow AI.</div>';
        }

    } catch (error) {
        console.error("Erro ao carregar histórico da nuvem:", error);
    }
}

function criarIdDeConversa() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `conversa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function salvarMensagemNoFirebase(role, texto, conversationId) {
    if (!usuarioAtual || !conversationId || conversasExcluidas.has(conversationId)) return;
    try {
        const mensagensRef = collection(db, "chats", usuarioAtual.uid, "messages");
        const documento = await addDoc(mensagensRef, {
            role: role,
            text: texto,
            conversationId,
            timestamp: serverTimestamp()
        });
        mensagensSalvas.push({
            id: documento.id,
            conversationId,
            role,
            parts: [{ text: texto }],
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Erro ao salvar mensagem no Firestore:", error);
    }
}

function limparTituloGerado(titulo, perguntaInicial) {
    const fallback = perguntaInicial.replace(/\s+/g, " ").trim().slice(0, 48) || "Nova conversa";
    const limpo = String(titulo || "")
        .replace(/^(t[ií]tulo|title)\s*:\s*/i, "")
        .replace(/^["'“”`]+|["'“”`.]+$/g, "")
        .replace(/[\r\n]+/g, " ")
        .replace(/[*_#]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!limpo) return fallback;
    return limpo.length > 48 ? `${limpo.slice(0, 47).trimEnd()}…` : limpo;
}

async function gerarESalvarTituloDaConversa(perguntaInicial, conversationId) {
    if (!usuarioAtual || !conversationId || titulosEmGeracao.has(conversationId)) return;
    if (mensagensSalvas.some((mensagem) => mensagem.conversationId === conversationId && mensagem.role === "title")) return;

    const usuarioDaConversa = usuarioAtual;
    titulosEmGeracao.add(conversationId);
    try {
        const response = await fetch(GEMINI_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{
                        text: "Crie somente um título curto e natural para uma conversa. Use o mesmo idioma da mensagem. Resuma o assunto com 3 a 7 palavras e no máximo 48 caracteres. Não copie a pergunta inteira. Não use aspas, ponto final, Markdown, dois-pontos nem expressões como 'Nova conversa'."
                    }]
                },
                contents: [{ role: "user", parts: [{ text: perguntaInicial }] }]
            })
        });

        if (!response.ok) throw new Error(`Falha ao gerar título: ${response.status}`);
        const data = await response.json();
        const tituloBruto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const titulo = limparTituloGerado(tituloBruto, perguntaInicial);

        if (usuarioAtual?.uid !== usuarioDaConversa.uid || titulosEditadosManualmente.has(conversationId) || conversasExcluidas.has(conversationId)) return;
        await salvarMensagemNoFirebase("title", titulo, conversationId);
        reconstruirMenuLateralComHistoricoCompleto();
    } catch (error) {
        console.warn("Não foi possível criar o título inteligente da conversa:", error);
    } finally {
        titulosEmGeracao.delete(conversationId);
    }
}

function normalizarTituloManual(titulo) {
    return String(titulo || "")
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 48);
}

async function renomearConversa(conversationId, novoTitulo) {
    if (!usuarioAtual || !conversationId) return false;
    const titulo = normalizarTituloManual(novoTitulo);
    if (!titulo) return false;

    const usuarioDaConversa = usuarioAtual;
    titulosEditadosManualmente.add(conversationId);
    try {
        const titulosExistentes = mensagensSalvas.filter(
            (mensagem) => mensagem.conversationId === conversationId && mensagem.role === "title"
        );

        if (titulosExistentes.length) {
            const lote = writeBatch(db);
            titulosExistentes.forEach((mensagem) => {
                lote.update(doc(db, "chats", usuarioDaConversa.uid, "messages", mensagem.id), { text: titulo });
            });
            await lote.commit();
            titulosExistentes.forEach((mensagem) => { mensagem.parts[0].text = titulo; });
        } else {
            const mensagensRef = collection(db, "chats", usuarioDaConversa.uid, "messages");
            const documento = await addDoc(mensagensRef, {
                role: "title",
                text: titulo,
                conversationId,
                timestamp: new Date(0)
            });
            mensagensSalvas.push({
                id: documento.id,
                conversationId,
                role: "title",
                parts: [{ text: titulo }],
                timestamp: 0
            });
        }

        reconstruirMenuLateralComHistoricoCompleto();
        return true;
    } catch (error) {
        titulosEditadosManualmente.delete(conversationId);
        console.error("Erro ao renomear conversa:", error);
        alert("Não foi possível renomear esta conversa agora.");
        return false;
    }
}

async function excluirConversa(conversationId) {
    if (!usuarioAtual || !conversationId) return false;
    const usuarioDaConversa = usuarioAtual;
    const documentosDaConversa = mensagensSalvas.filter((mensagem) => mensagem.conversationId === conversationId);
    if (!documentosDaConversa.length) return false;

    conversasExcluidas.add(conversationId);
    try {
        for (let inicio = 0; inicio < documentosDaConversa.length; inicio += 450) {
            const lote = writeBatch(db);
            documentosDaConversa.slice(inicio, inicio + 450).forEach((mensagem) => {
                lote.delete(doc(db, "chats", usuarioDaConversa.uid, "messages", mensagem.id));
            });
            await lote.commit();
        }

        mensagensSalvas = mensagensSalvas.filter((mensagem) => mensagem.conversationId !== conversationId);
        titulosEmGeracao.delete(conversationId);
        titulosEditadosManualmente.delete(conversationId);

        if (conversaAtivaId === conversationId) {
            conversaAtivaId = null;
            chatHistory = [];
            const conversaSeguinte = [...mensagensSalvas]
                .filter((mensagem) => mensagem.role === "user" || mensagem.role === "model")
                .sort((a, b) => b.timestamp - a.timestamp)[0]?.conversationId;

            if (conversaSeguinte) {
                abrirConversa(conversaSeguinte);
            } else {
                const responseBox = document.getElementById("response");
                if (responseBox) responseBox.innerHTML = '<div class="empty-chat-state">Conversa apagada. Comece um novo chat com Marshadow AI.</div>';
                reconstruirMenuLateralComHistoricoCompleto();
            }
        } else {
            reconstruirMenuLateralComHistoricoCompleto();
        }
        return true;
    } catch (error) {
        conversasExcluidas.delete(conversationId);
        console.error("Erro ao excluir conversa:", error);
        alert("Não foi possível apagar esta conversa agora.");
        return false;
    }
}

// =========================================================================
// 4. LÓGICA DO CHAT E INTERFACE
// =========================================================================

function renderizarConversa(mensagens) {
    const responseBox = document.getElementById("response");
    if (!responseBox) return;
    responseBox.innerHTML = "";

    mensagens.forEach((historyMsg) => {
        const msgDiv = document.createElement("div");
        if (historyMsg.role === "user") {
            msgDiv.className = "chat-message user-bubble";
            msgDiv.textContent = `Você:\n${historyMsg.parts[0].text}`;
        } else {
            msgDiv.className = "chat-message ai-bubble";
            msgDiv.textContent = `Marshadow AI:\n${historyMsg.parts[0].text}`;
        }
        responseBox.prepend(msgDiv);
    });

    responseBox.scrollTop = 0;
}

function abrirConversa(conversationId) {
    conversaAtivaId = conversationId;
    chatHistory = mensagensSalvas
        .filter((mensagem) => mensagem.conversationId === conversationId && (mensagem.role === "user" || mensagem.role === "model"))
        .map(({ role, parts }) => ({ role, parts }));
    renderizarConversa(chatHistory);
    reconstruirMenuLateralComHistoricoCompleto();
    document.getElementById("question")?.focus();
}

function reconstruirMenuLateralComHistoricoCompleto() {
    if (chatsList) chatsList.innerHTML = "";

    const conversasPorId = new Map();
    mensagensSalvas.forEach((mensagem) => {
        if (!conversasPorId.has(mensagem.conversationId)) {
            conversasPorId.set(mensagem.conversationId, {
                id: mensagem.conversationId,
                titulo: "Nova conversa",
                ultimaAtualizacao: mensagem.timestamp || 0
            });
        }
        const conversa = conversasPorId.get(mensagem.conversationId);
        conversa.ultimaAtualizacao = Math.max(conversa.ultimaAtualizacao, mensagem.timestamp || 0);
        if (mensagem.role === "title") {
            conversa.titulo = mensagem.parts[0].text;
        } else if (mensagem.role === "user" && conversa.titulo === "Nova conversa") {
            conversa.titulo = mensagem.parts[0].text;
        }
    });

    const conversas = [...conversasPorId.values()]
        .sort((a, b) => b.ultimaAtualizacao - a.ultimaAtualizacao);

    if (conversas.length === 0) {
        mostrarSidebarVazia(usuarioAtual ? "Nenhum chat salvo" : "Modo visitante — histórico temporário");
        return;
    }

    conversas.forEach((conversa) => {
        const novoChatItem = document.createElement("div");
        novoChatItem.classList.add("chat-item");
        if (conversa.id === conversaAtivaId) novoChatItem.classList.add("is-active");

        const botaoAbrir = document.createElement("button");
        botaoAbrir.type = "button";
        botaoAbrir.className = "chat-item__open";
        botaoAbrir.textContent = conversa.titulo;
        botaoAbrir.title = conversa.titulo;
        botaoAbrir.setAttribute("aria-label", `Abrir conversa: ${conversa.titulo}`);
        botaoAbrir.addEventListener("click", () => {
            abrirConversa(conversa.id);
        });

        const acoes = document.createElement("div");
        acoes.className = "chat-item__actions";

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.className = "chat-item__action chat-item__action--edit";
        botaoEditar.textContent = "✎";
        botaoEditar.title = "Renomear conversa";
        botaoEditar.setAttribute("aria-label", `Renomear conversa: ${conversa.titulo}`);

        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.className = "chat-item__action chat-item__action--delete";
        botaoExcluir.textContent = "×";
        botaoExcluir.title = "Apagar conversa";
        botaoExcluir.setAttribute("aria-label", `Apagar conversa: ${conversa.titulo}`);

        botaoEditar.addEventListener("click", () => {
            novoChatItem.classList.add("is-editing");
            novoChatItem.innerHTML = "";

            const formulario = document.createElement("form");
            formulario.className = "chat-title-editor";
            const campo = document.createElement("input");
            campo.className = "chat-title-editor__input";
            campo.type = "text";
            campo.value = conversa.titulo;
            campo.maxLength = 48;
            campo.setAttribute("aria-label", "Novo título da conversa");

            const salvar = document.createElement("button");
            salvar.type = "submit";
            salvar.className = "chat-title-editor__save";
            salvar.textContent = "✓";
            salvar.title = "Salvar título";
            salvar.setAttribute("aria-label", "Salvar título");

            const cancelar = document.createElement("button");
            cancelar.type = "button";
            cancelar.className = "chat-title-editor__cancel";
            cancelar.textContent = "×";
            cancelar.title = "Cancelar";
            cancelar.setAttribute("aria-label", "Cancelar edição");

            const cancelarEdicao = () => reconstruirMenuLateralComHistoricoCompleto();
            cancelar.addEventListener("click", cancelarEdicao);
            campo.addEventListener("keydown", (event) => {
                if (event.key === "Escape") cancelarEdicao();
            });
            formulario.addEventListener("submit", async (event) => {
                event.preventDefault();
                const titulo = normalizarTituloManual(campo.value);
                if (!titulo) {
                    campo.focus();
                    return;
                }
                campo.disabled = true;
                salvar.disabled = true;
                cancelar.disabled = true;
                const renomeada = await renomearConversa(conversa.id, titulo);
                if (!renomeada) reconstruirMenuLateralComHistoricoCompleto();
            });

            formulario.append(campo, salvar, cancelar);
            novoChatItem.appendChild(formulario);
            campo.focus();
            campo.select();
        });

        botaoExcluir.addEventListener("click", async () => {
            const confirmado = await solicitarConfirmacaoExclusao(conversa.titulo);
            if (!confirmado) return;
            botaoExcluir.disabled = true;
            botaoEditar.disabled = true;
            novoChatItem.classList.add("is-deleting");
            const excluida = await excluirConversa(conversa.id);
            if (!excluida) reconstruirMenuLateralComHistoricoCompleto();
        });

        acoes.append(botaoEditar, botaoExcluir);
        novoChatItem.append(botaoAbrir, acoes);

        if (chatsList) chatsList.appendChild(novoChatItem);
    });
}

if (btnNewChat) {
    btnNewChat.addEventListener("click", () => {
        chatHistory = [];
        conversaAtivaId = null;
        const responseBox = document.getElementById("response");
        const questionInput = document.getElementById("question");
        
        if (questionInput) questionInput.value = "";
        if (responseBox) {
            responseBox.innerHTML = '<div class="empty-chat-state">Nova conversa pronta. Pergunte o que quiser.</div>';
        }
        reconstruirMenuLateralComHistoricoCompleto();
        if (questionInput) questionInput.focus();
    });
}

function typeEffect(element, text, speed = 10) {
    let index = 0;
    element.textContent = "Marshadow AI:\n"; 

    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }
    type();
}

function limitarHistoricoParaEnvio(history, limite = 80000) {
    const selecionadas = [];
    let caracteres = 0;
    for (let index = history.length - 1; index >= 0; index -= 1) {
        const mensagem = history[index];
        const tamanho = String(mensagem?.parts?.[0]?.text || "").length;
        if (selecionadas.length && caracteres + tamanho > limite) break;
        selecionadas.unshift(mensagem);
        caracteres += tamanho;
    }
    return selecionadas;
}

async function askAI() {
    const questionInput = document.getElementById("question");
    const question = questionInput.value.trim();
    const responseBox = document.getElementById("response");
    const askButton = document.querySelector(".chat-box > button");

    if (!question) {
        alert("Por favor, digite uma pergunta.");
        return;
    }

    if (perguntaEmAndamento) return;
    perguntaEmAndamento = true;
    if (askButton) askButton.disabled = true;

    if (chatHistory.length === 0 || responseBox.innerHTML.includes("Sua resposta aparecerá aqui...") || responseBox.querySelector(".guest-notice") || responseBox.querySelector(".empty-chat-state")) {
        responseBox.innerHTML = "";
    }

    const primeiraMensagemDaConversa = !conversaAtivaId;
    if (!conversaAtivaId) conversaAtivaId = criarIdDeConversa();
    const conversationId = conversaAtivaId;

    const userMessageDiv = document.createElement("div");
    userMessageDiv.className = "chat-message user-bubble";
    userMessageDiv.textContent = `Você:\n${question}`;
    responseBox.prepend(userMessageDiv);

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "chat-message loading-bubble";
    loadingDiv.textContent = "🔍 Marshadow está pensando...";
    responseBox.prepend(loadingDiv);
    responseBox.scrollTop = 0;

    questionInput.value = "";

    chatHistory.push({ role: "user", parts: [{ text: question }] });
    const requestHistory = limitarHistoricoParaEnvio(chatHistory);
    await salvarMensagemNoFirebase("user", question, conversationId);
    reconstruirMenuLateralComHistoricoCompleto();
    if (primeiraMensagemDaConversa && usuarioAtual) {
        void gerarESalvarTituloDaConversa(question, conversationId);
    }

    try {
        const response = await fetch(
            GEMINI_ENDPOINT,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: requestHistory
                })
            }
        );

        const data = await response.json().catch(() => ({}));
        loadingDiv.remove();

        if (!response.ok) throw new Error(data?.error || `Falha da IA: ${response.status}`);
        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!answer) throw new Error("A IA não retornou uma resposta válida.");
        const cleanAnswer = answer.replace(/^Resposta:\s*/i, "");

        await salvarMensagemNoFirebase("model", cleanAnswer, conversationId);

        if (conversaAtivaId !== conversationId) {
            reconstruirMenuLateralComHistoricoCompleto();
            return;
        }

        chatHistory.push({ role: "model", parts: [{ text: cleanAnswer }] });

        const aiMessageDiv = document.createElement("div");
        aiMessageDiv.className = "chat-message ai-bubble";
        responseBox.prepend(aiMessageDiv);

        typeEffect(aiMessageDiv, cleanAnswer, 10);
        responseBox.scrollTop = 0;

        // Atualiza a barra lateral reconstruindo os itens sem quebrar a memória cíclica
        reconstruirMenuLateralComHistoricoCompleto();

    } catch (error) {
        if(loadingDiv) loadingDiv.remove();
        if (conversaAtivaId !== conversationId) return;
        const errorDiv = document.createElement("div");
        errorDiv.className = "chat-message ai-bubble";
        errorDiv.style.borderColor = "#ff4444";
        errorDiv.textContent = "Erro ao conectar com a IA. Tente novamente.";
        responseBox.prepend(errorDiv);
        console.error(error);
    } finally {
        perguntaEmAndamento = false;
        if (askButton) askButton.disabled = false;
    }
}

window.askAI = askAI;

document.getElementById("question").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const question = document.getElementById("question").value.trim();
        if (question) {
            askAI();
        }
    }
});

// =========================================================================
// 5. CONTROLE DA ABERTURA EM VÍDEO DA MARSHADOW AI
// =========================================================================
function inicializarMarshadowSplashScreen() {
    const splash = document.getElementById("splash-screen");
    const video = document.getElementById("marshadow-intro-video");

    if (!splash || !video) return;

    let finalizado = false;
    const concluirAbertura = () => {
        if (finalizado) return;
        finalizado = true;
        splash.classList.add("splash-hidden");
        window.setTimeout(() => splash.remove(), 850);
    };

    video.addEventListener("ended", concluirAbertura, { once: true });
    video.addEventListener("error", concluirAbertura, { once: true });

    video.play().catch(() => {
        document.addEventListener("pointerdown", () => video.play().catch(concluirAbertura), { once: true });
    });

    window.setTimeout(concluirAbertura, 4300);
}

inicializarMarshadowSplashScreen();
