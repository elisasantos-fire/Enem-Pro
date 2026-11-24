const STORAGE_KEY = "enem_pro_dados_v1";

const dadosIniciais = {
  disciplinas: [
    { id: "mat", nome: "Matemática", assuntos: ["Funções", "Estatística"] },
    { id: "ling", nome: "Linguagens", assuntos: ["Interpretação de Texto", "Gêneros Textuais"] },
    { id: "nat", nome: "Ciências da Natureza", assuntos: ["Calorimetria", "Ecologia"] },
    { id: "hum", nome: "Ciências Humanas", assuntos: ["Geopolítica", "História do Brasil"] }
  ],
  atividades: [
    {
      id: "act-1",
      data: new Date(Date.now() - 3 * 86400000).toISOString(),
      disciplina: "Matemática",
      assunto: "Funções",
      topico: "Função afim",
      questoes: 20,
      acertos: 11,
      erros: 9
    },
    {
      id: "act-2",
      data: new Date(Date.now() - 2 * 86400000).toISOString(),
      disciplina: "Ciências da Natureza",
      assunto: "Calorimetria",
      topico: "Trocas de calor",
      questoes: 15,
      acertos: 9,
      erros: 6
    },
    {
      id: "act-3",
      data: new Date(Date.now() - 1 * 86400000).toISOString(),
      disciplina: "Linguagens",
      assunto: "Interpretação de Texto",
      topico: "",
      questoes: 25,
      acertos: 21,
      erros: 4
    }
  ]
};

let estado = carregarEstado();
let periodoAtual = "all";

function carregarEstado() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) return JSON.parse(salvo);
  } catch (e) {
    // Fallback para dados iniciais
  }
  return structuredClone(dadosIniciais);
}

function salvarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function calcularPercentual(acertos, total) {
  if (!total || total <= 0) return 0;
  return Math.round((acertos / total) * 100);
}

function filtrarAtividadesPorPeriodo(periodo) {
  if (periodo === "all") return estado.atividades;
  const dias = Number(periodo);
  const limite = Date.now() - dias * 86400000;
  return estado.atividades.filter((item) => new Date(item.data).getTime() >= limite);
}

function calcularReforco(atividades) {
  const mapa = new Map();
  for (const act of atividades) {
    const chave = `${act.assunto} (${act.disciplina})`;
    const atual = mapa.get(chave) || { label: chave, acertos: 0, questoes: 0 };
    atual.acertos += Number(act.acertos);
    atual.questoes += Number(act.questoes);
    mapa.set(chave, atual);
  }

  return [...mapa.values()]
    .map((item) => ({
      ...item,
      pct: calcularPercentual(item.acertos, item.questoes)
    }))
    .filter((item) => item.pct < 70)
    .sort((a, b) => a.pct - b.pct);
}

function renderBarrasDisciplinas(container, atividades) {
  container.innerHTML = "";
  estado.disciplinas.forEach((disc) => {
    const itens = atividades.filter((a) => a.disciplina === disc.nome);
    const total = itens.reduce((acc, i) => acc + Number(i.questoes), 0);
    const acertos = itens.reduce((acc, i) => acc + Number(i.acertos), 0);
    const pct = calcularPercentual(acertos, total);

    const row = document.createElement("div");
    row.innerHTML = `
      <div class="bar-row-top">
        <span>${disc.nome}</span>
        <span>${pct}% (${acertos}/${total})</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderListaReforco(listaEl, itensReforco) {
  listaEl.innerHTML = "";
  if (itensReforco.length === 0) {
    listaEl.innerHTML = `<li class="muted">Nenhum conteúdo abaixo de 70% no momento.</li>`;
    return;
  }
  itensReforco.forEach((item) => {
    const li = document.createElement("li");
    li.className = "reinforce-item";
    li.innerHTML = `<span>${item.label}</span><span>${item.pct}%</span>`;
    listaEl.appendChild(li);
  });
}

function atualizarSelectsOrganizacaoEAtividade() {
  const selAssunto = document.getElementById("select-disciplina-assunto");
  const selAtivDisc = document.getElementById("select-atividade-disciplina");
  const selAtivAssunto = document.getElementById("select-atividade-assunto");

  const discSelecionadaAnterior = selAtivDisc.value;

  selAssunto.innerHTML = "";
  selAtivDisc.innerHTML = "";

  estado.disciplinas.forEach((d) => {
    const opt1 = document.createElement("option");
    opt1.value = d.nome;
    opt1.textContent = d.nome;
    selAssunto.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = d.nome;
    opt2.textContent = d.nome;
    selAtivDisc.appendChild(opt2);
  });

  if (discSelecionadaAnterior && estado.disciplinas.some((d) => d.nome === discSelecionadaAnterior)) {
    selAtivDisc.value = discSelecionadaAnterior;
  }

  atualizarSelectAssuntosDaAtividade();
  selAtivAssunto.disabled = false;
}

function atualizarSelectAssuntosDaAtividade() {
  const discNome = document.getElementById("select-atividade-disciplina").value;
  const selAssunto = document.getElementById("select-atividade-assunto");
  const discObj = estado.disciplinas.find((d) => d.nome === discNome);
  const assuntos = discObj ? discObj.assuntos : [];

  selAssunto.innerHTML = "";
  if (assuntos.length === 0) {
    const opt = document.createElement("option");
    opt.value = "Geral";
    opt.textContent = "Geral (cadastre assuntos em Organizar Estudos)";
    selAssunto.appendChild(opt);
  } else {
    assuntos.forEach((ass) => {
      const opt = document.createElement("option");
      opt.value = ass;
      opt.textContent = ass;
      selAssunto.appendChild(opt);
    });
  }
}

function atualizarPreviewAtividade() {
  const totalInput = document.getElementById("input-questoes");
  const acertosInput = document.getElementById("input-acertos");
  const errosInput = document.getElementById("input-erros");
  const previewEl = document.getElementById("preview-aproveitamento");

  let total = Math.max(1, Number(totalInput.value) || 0);
  let acertos = Math.max(0, Number(acertosInput.value) || 0);
  if (acertos > total) {
    acertos = total;
    acertosInput.value = total;
  }
  const erros = total - acertos;
  errosInput.value = erros;

  const pct = calcularPercentual(acertos, total);
  previewEl.textContent = `${pct}% (${acertos} de ${total})`;
}

function renderTudo() {
  const todas = estado.atividades;
  const totalQuestoes = todas.reduce((acc, a) => acc + Number(a.questoes), 0);
  const totalAcertos = todas.reduce((acc, a) => acc + Number(a.acertos), 0);
  const pctGeral = calcularPercentual(totalAcertos, totalQuestoes);

  document.getElementById("kpi-disciplinas").textContent = estado.disciplinas.length;
  document.getElementById("kpi-questoes").textContent = totalQuestoes;
  document.getElementById("kpi-aproveitamento").textContent = `${pctGeral}%`;

  renderBarrasDisciplinas(document.getElementById("painel-disciplinas"), todas);
  renderListaReforco(document.getElementById("painel-reforco"), calcularReforco(todas));

  // Organização de estudos
  const totalAssuntos = estado.disciplinas.reduce((acc, d) => acc + d.assuntos.length, 0);
  document.getElementById("resumo-grade").textContent =
    `${estado.disciplinas.length} disciplinas • ${totalAssuntos} assuntos`;

  const listaDiscEl = document.getElementById("lista-disciplinas");
  listaDiscEl.innerHTML = "";
  estado.disciplinas.forEach((d) => {
    const card = document.createElement("div");
    card.className = "subject-card";
    const itemsHtml = d.assuntos.length
      ? d.assuntos.map((a) => `<li>${a}</li>`).join("")
      : `<li class="muted">Nenhum assunto cadastrado</li>`;
    card.innerHTML = `
      <strong>${d.nome}</strong> <span class="muted">(${d.assuntos.length})</span>
      <ul>${itemsHtml}</ul>
    `;
    listaDiscEl.appendChild(card);
  });

  atualizarSelectsOrganizacaoEAtividade();
  atualizarPreviewAtividade();

  // Acompanhar desempenho com filtro
  const filtradas = filtrarAtividadesPorPeriodo(periodoAtual);
  const fQuestoes = filtradas.reduce((acc, a) => acc + Number(a.questoes), 0);
  const fAcertos = filtradas.reduce((acc, a) => acc + Number(a.acertos), 0);
  const fPct = calcularPercentual(fAcertos, fQuestoes);

  document.getElementById("filtro-aproveitamento").textContent = `${fPct}%`;
  document.getElementById("filtro-questoes").textContent = fQuestoes;

  renderBarrasDisciplinas(document.getElementById("filtro-disciplinas"), filtradas);
  renderListaReforco(document.getElementById("filtro-reforco"), calcularReforco(filtradas));

  const corpo = document.getElementById("historico-corpo");
  corpo.innerHTML = "";
  [...filtradas].reverse().forEach((act) => {
    const tr = document.createElement("tr");
    const dataFmt = new Date(act.data).toLocaleDateString("pt-BR");
    const assuntoFmt = act.topico ? `${act.assunto} — ${act.topico}` : act.assunto;
    const pct = calcularPercentual(act.acertos, act.questoes);
    tr.innerHTML = `
      <td>${dataFmt}</td>
      <td>${act.disciplina}</td>
      <td>${assuntoFmt}</td>
      <td>${act.acertos} / ${act.questoes}</td>
      <td><strong>${pct}%</strong></td>
    `;
    corpo.appendChild(tr);
  });
}

// Navegação entre abas
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
  });
});

// Cadastrar disciplina
document.getElementById("form-disciplina").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("input-disciplina");
  const nome = input.value.trim();
  if (!nome) return;
  if (!estado.disciplinas.some((d) => d.nome.toLowerCase() === nome.toLowerCase())) {
    estado.disciplinas.push({
      id: `disc-${Date.now()}`,
      nome,
      assuntos: []
    });
    salvarEstado();
    renderTudo();
  }
  input.value = "";
});

// Cadastrar assunto
document.getElementById("form-assunto").addEventListener("submit", (e) => {
  e.preventDefault();
  const discNome = document.getElementById("select-disciplina-assunto").value;
  const inputAssunto = document.getElementById("input-assunto");
  const assunto = inputAssunto.value.trim();
  if (!discNome || !assunto) return;

  const disc = estado.disciplinas.find((d) => d.nome === discNome);
  if (disc && !disc.assuntos.some((a) => a.toLowerCase() === assunto.toLowerCase())) {
    disc.assuntos.push(assunto);
    salvarEstado();
    renderTudo();
  }
  inputAssunto.value = "";
});

// Registrar atividade
document.getElementById("select-atividade-disciplina").addEventListener("change", atualizarSelectAssuntosDaAtividade);
document.getElementById("input-questoes").addEventListener("input", atualizarPreviewAtividade);
document.getElementById("input-acertos").addEventListener("input", atualizarPreviewAtividade);

document.getElementById("btn-limpar-atividade").addEventListener("click", () => {
  document.getElementById("input-atividade-topico").value = "";
  document.getElementById("input-questoes").value = "10";
  document.getElementById("input-acertos").value = "7";
  atualizarPreviewAtividade();
});

document.getElementById("form-atividade").addEventListener("submit", (e) => {
  e.preventDefault();
  const disciplina = document.getElementById("select-atividade-disciplina").value;
  const assunto = document.getElementById("select-atividade-assunto").value;
  const topico = document.getElementById("input-atividade-topico").value.trim();
  const questoes = Math.max(1, Number(document.getElementById("input-questoes").value) || 0);
  const acertos = Math.min(questoes, Math.max(0, Number(document.getElementById("input-acertos").value) || 0));
  const erros = questoes - acertos;

  estado.atividades.push({
    id: `act-${Date.now()}`,
    data: new Date().toISOString(),
    disciplina,
    assunto,
    topico,
    questoes,
    acertos,
    erros
  });

  salvarEstado();
  renderTudo();
  document.getElementById("input-atividade-topico").value = "";
});

// Filtros de período
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    periodoAtual = btn.dataset.periodo;
    renderTudo();
  });
});

renderTudo();
