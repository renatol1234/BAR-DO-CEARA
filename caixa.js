// ====================================================================
// CONFIGURAÇÕES GLOBAIS E REFERÊNCIAS
// ====================================================================

// A senha para fechamento de caixa
const SENHA_FECHAMENTO = "mvlima3646"; 

// A chave LocalStorage para salvar pedidos em aberto
const LS_PEDIDOS_KEY = 'bar_ceara_pedidos';

// Variáveis de estado
let pedidosEmAberto = JSON.parse(localStorage.getItem(LS_PEDIDOS_KEY)) || {};
let clienteAtualId = null;
let clienteAtualNome = null;

// Referências DOM
const clientesContainer = document.getElementById('clientes-container');
const produtosContainer = document.getElementById('produtos-container');
const categoryButtonsContainer = document.getElementById('category-buttons-container');
const caixaList = document.getElementById('caixa-list');
// Acesso ao Modal deve ser feito após o carregamento do DOM
const caixaModalElement = document.getElementById('caixaModal');
const caixaModal = caixaModalElement ? new bootstrap.Modal(caixaModalElement) : null;
const modalCaixaLabel = document.getElementById('caixaModalLabel');


// ====================================================================
// FUNÇÕES DE CLIENTES E PEDIDO
// ====================================================================

function renderizarClientes() {
    document.querySelectorAll('.cliente').forEach(button => {
        const id = button.dataset.clienteId;
        button.classList.remove('aberto');

        if (pedidosEmAberto[id]) {
            button.classList.add('aberto');
            if (pedidosEmAberto[id].nome) {
                button.textContent = pedidosEmAberto[id].nome;
            }
        } else {
            button.textContent = `Cliente ${id}`;
        }

        button.onclick = () => abrirPedidoCliente(id);
    });
}

function getClientesSugeridosLocal() {
    const lista = new Set();
    try {
        const saved = JSON.parse(localStorage.getItem('clientes_lista') || '[]');
        if (Array.isArray(saved)) saved.forEach(n => n && lista.add(n));
    } catch (e) {}

    Object.values(pedidosEmAberto).forEach(p => { if (p && p.nome) lista.add(p.nome); });

    return Array.from(lista);
}

async function getClientesSugeridosAsync() {
    const local = getClientesSugeridosLocal();
    const set = new Set(local);

    // Tenta buscar do Firebase se disponível
    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            const snapshot = await firebase.database().ref('clientes_gastos').once('value');
            const obj = snapshot.val();
            if (obj) {
                Object.values(obj).forEach(cliente => {
                    if (cliente && cliente.nome) {
                        set.add(cliente.nome);
                        if (cliente.apelido1) set.add(cliente.apelido1);
                        if (cliente.apelido2) set.add(cliente.apelido2);
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Não foi possível buscar clientes no Firebase:', e);
    }

    return Array.from(set);
}

function salvarNomeClienteNaLista(nome) {
    if (!nome) return;
    try {
        const arr = JSON.parse(localStorage.getItem('clientes_lista') || '[]');
        if (!arr.includes(nome)) {
            arr.push(nome);
            localStorage.setItem('clientes_lista', JSON.stringify(arr));
        }
    } catch (e) {}
}

function showClienteSelector(anchorEl, id, onSelect) {
    const existing = document.getElementById('cliente-selector-overlay');
    if (existing) existing.remove();

    const rect = anchorEl.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'cliente-selector-overlay';
    overlay.style.position = 'absolute';
    overlay.style.zIndex = 2000;
    overlay.style.background = '#fff';
    overlay.style.border = '1px solid #0e18daff';
    overlay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    overlay.style.padding = '8px';
    overlay.style.borderRadius = '6px';
    overlay.style.width = '260px';

    const top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;
    if (left + 280 > window.innerWidth) left = window.innerWidth - 290;
    overlay.style.top = top + 'px';
    overlay.style.left = left + 'px';

    overlay.innerHTML = `
        <div style="display:flex;gap:6px;align-items:center;">
            <input id="cliente-selector-input" placeholder="Digite nome ou apelido" style="flex:1;padding:6px;border:1px solid #ddd;border-radius:4px;" />
            <button id="cliente-selector-cancel" class="btn btn-sm btn-outline-secondary">X</button>
        </div>
        <ul id="cliente-selector-list" style="list-style:none;margin:8px 0 0 0;padding:0;max-height:180px;overflow:auto;"></ul>
    `;

    document.body.appendChild(overlay);
    const input = document.getElementById('cliente-selector-input');
    const list = document.getElementById('cliente-selector-list');
    const cancel = document.getElementById('cliente-selector-cancel');

    let suggestions = [];

    function renderSuggestions(filter) {
        list.innerHTML = '';
        const f = (filter || '').toLowerCase();
        
        // Se tem pelo menos 2 caracteres, busca por nome ou apelido
        if (filter && filter.length >= 2) {
            list.innerHTML = '<li style="padding:6px;color:#666;">Buscando clientes...</li>';
            
            // Busca por nome ou apelido
            window.buscarClientePorNomeOuApelido(filter).then(resultados => {
                list.innerHTML = '';
                
                if (resultados.length === 0) {
                    const li = document.createElement('li');
                    li.style.padding = '6px';
                    li.style.color = '#666';
                    li.textContent = 'Nenhum cliente encontrado.';
                    list.appendChild(li);
                }
                
                resultados.forEach(cliente => {
                    const li = document.createElement('li');
                    li.style.padding = '6px';
                    li.style.cursor = 'pointer';
                    li.style.borderBottom = '1px solid #1a1616ff';
                    li.innerHTML = `
                        <div>
                            <strong>${cliente.nome}</strong>
                            ${cliente.apelido1 || cliente.apelido2 ? 
                                `<br><small>Apelidos: ${cliente.apelido1 || ''} ${cliente.apelido2 ? '/ ' + cliente.apelido2 : ''}</small>` : 
                                ''}
                        </div>
                    `;
                    li.addEventListener('click', () => {
                        onSelect(cliente.nome);
                        overlay.remove();
                    });
                    list.appendChild(li);
                });
                
                // Adiciona opção para criar novo cliente se não encontrado
                if (resultados.length === 0) {
                    const li = document.createElement('li');
                    li.style.padding = '6px';
                    li.style.cursor = 'pointer';
                    li.style.fontWeight = '600';
                    li.style.color = '#0d6efd';
                    li.innerHTML = `<i>Usar "${filter}" como novo cliente</i>`;
                    li.addEventListener('click', () => {
                        onSelect(filter.trim());
                        overlay.remove();
                    });
                    list.appendChild(li);
                }
            });
        } else {
            // Mostra sugestões padrão para poucos caracteres
            const filtered = suggestions.filter(s => s.toLowerCase().includes(f));
            
            if (filtered.length === 0 && f === '') {
                const empty = document.createElement('li');
                empty.style.padding = '6px';
                empty.style.color = '#666';
                empty.textContent = 'Digite pelo menos 2 letras para buscar clientes...';
                list.appendChild(empty);
            }

            filtered.forEach(s => {
                const li = document.createElement('li');
                li.style.padding = '6px';
                li.style.cursor = 'pointer';
                li.style.borderBottom = '1px solid #1a1616ff';
                li.textContent = s;
                li.addEventListener('click', () => {
                    onSelect(s);
                    overlay.remove();
                });
                list.appendChild(li);
            });

            if (filter.trim() !== '') {
                const li = document.createElement('li');
                li.style.padding = '6px';
                li.style.cursor = 'pointer';
                li.style.fontWeight = '600';
                li.style.color = '#0d6efd';
                li.textContent = `Usar "${filter}" como novo cliente`;
                li.addEventListener('click', () => {
                    onSelect(filter.trim());
                    overlay.remove();
                });
                list.insertBefore(li, list.firstChild);
            }
        }
    }

    // Carrega sugestões (local + Firebase) assincronamente
    list.innerHTML = '<li style="padding:6px;color:#666;">Carregando clientes...</li>';
    getClientesSugeridosAsync().then(res => {
        suggestions = res;
        renderSuggestions('');
    }).catch(() => {
        suggestions = getClientesSugeridosLocal();
        renderSuggestions('');
    });

    input.addEventListener('input', (e) => renderSuggestions(e.target.value || ''));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if (val) {
                onSelect(val);
                overlay.remove();
            }
        } else if (e.key === 'Escape') {
            overlay.remove();
        }
    });

    cancel.addEventListener('click', () => {
        overlay.remove();
        clienteAtualId = null;
    });

    // close when clicking outside
    setTimeout(() => {
        function onDocClick(ev) {
            if (!overlay.contains(ev.target)) {
                overlay.remove();
                document.removeEventListener('click', onDocClick);
            }
        }
        document.addEventListener('click', onDocClick);
    }, 10);

    input.focus();
}

function abrirPedidoCliente(id) {
    clienteAtualId = id;
    let pedido = pedidosEmAberto[id];

    if (!pedido) {
        const anchor = document.querySelector(`[data-cliente-id='${id}']`) || document.body;

        showClienteSelector(anchor, id, (nomeCliente) => {
            if (!nomeCliente || nomeCliente.trim() === '') {
                clienteAtualId = null;
                return;
            }

            clienteAtualNome = nomeCliente.trim();
            pedidosEmAberto[id] = {
                id: id,
                nome: clienteAtualNome,
                itens: [],
                abertura: new Date().toISOString(),
                tipo: 'cliente_fichado'
            };

            salvarNomeClienteNaLista(clienteAtualNome);
            salvarPedidos();
            renderizarClientes();

            if(caixaModal) caixaModal.show();
            if(modalCaixaLabel) modalCaixaLabel.textContent = `Caixa - Pedido para: ${clienteAtualNome}`;
            renderizarCategoriasCaixa();
            renderizarItensCaixa();
            const formaPagamentoElement = document.getElementById('forma-pagamento');
            if(formaPagamentoElement) formaPagamentoElement.value = "Selecione";
        });

        return;
    } else {
        clienteAtualNome = pedido.nome || `Cliente ${id}`;
    }

    if(caixaModal) caixaModal.show();
    if(modalCaixaLabel) modalCaixaLabel.textContent = `Caixa - Pedido para: ${clienteAtualNome}`;
    
    renderizarCategoriasCaixa();
    renderizarItensCaixa();
    
    const formaPagamentoElement = document.getElementById('forma-pagamento');
    if(formaPagamentoElement) formaPagamentoElement.value = "Selecione";
}



// Handler para o botão "Venda Rápida"
document.getElementById('abrir-caixa').addEventListener('click', () => {
    clienteAtualId = 'rapida';
    clienteAtualNome = 'Venda Rápida';
    
    if (!pedidosEmAberto['rapida']) {
        pedidosEmAberto['rapida'] = { 
            id: 'rapida', 
            nome: clienteAtualNome, 
            itens: [], 
            abertura: new Date().toISOString(),
            tipo: 'rapida'
        };
        salvarPedidos();
    }

    if(modalCaixaLabel) modalCaixaLabel.textContent = `Caixa - Pedido Rápido`;
    
    renderizarCategoriasCaixa();
    renderizarItensCaixa();
    
    if(caixaModal) caixaModal.show();
    const formaPagamentoElement = document.getElementById('forma-pagamento');
    if(formaPagamentoElement) formaPagamentoElement.value = "Selecione";
});

function renderizarCategoriasCaixa() {
    const caixaProdutosContainer = document.querySelector('.caixa-produtos-container');
    if (!caixaProdutosContainer) return;

    caixaProdutosContainer.innerHTML = '';
    
    const categoryButtons = document.createElement('div');
    categoryButtons.id = 'caixa-category-buttons';
    categoryButtons.className = 'd-flex flex-wrap gap-2 mb-3';
    
    categoriasProdutos.forEach((categoria, index) => {
        const button = document.createElement('button');
        button.textContent = categoria.nome;
        button.dataset.categoriaId = categoria.id;
        button.classList.add('btn', 'btn-dark', 'btn-sm');
        if (index === 0) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            document.querySelectorAll('#caixa-category-buttons button').forEach(btn => {
                btn.classList.remove('active', 'btn-primary');
                btn.classList.add('btn-dark');
            });
            button.classList.remove('btn-dark');
            button.classList.add('active', 'btn-primary');
            renderizarProdutosCaixa(categoria.id);
        });
        categoryButtons.appendChild(button);
    });
    
    caixaProdutosContainer.appendChild(categoryButtons);
    
    const produtosGrid = document.createElement('div');
    produtosGrid.id = 'caixa-produtos-grid';
    produtosGrid.className = 'caixa-produtos-container';
    produtosGrid.style.display = 'grid';
    produtosGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
    produtosGrid.style.gap = '10px';
    produtosGrid.style.maxHeight = '400px';
    produtosGrid.style.overflowY = 'auto';
    produtosGrid.style.padding = '10px';
    
    caixaProdutosContainer.appendChild(produtosGrid);
    
    if (categoriasProdutos.length > 0) {
        renderizarProdutosCaixa(categoriasProdutos[0].id);
    }
}

function renderizarProdutosCaixa(categoriaId) {
    const produtosGrid = document.getElementById('caixa-produtos-grid');
    if (!produtosGrid) return;
    
    produtosGrid.innerHTML = '';
    const categoria = categoriasProdutos.find(c => c.id === categoriaId);
    
    if (!categoria) return;

    categoria.produtos.forEach(produto => {
        const produtoDiv = document.createElement('div');
        produtoDiv.classList.add('produto');
        produtoDiv.dataset.produtoId = produto.id;
        produtoDiv.innerHTML = `
            <div class="produto-nome">${produto.nome}</div>
            <div class="produto-preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</div>
        `;
        produtoDiv.addEventListener('click', () => adicionarItem(produto.id, produto.nome, produto.preco));
        produtosGrid.appendChild(produtoDiv);
    });
}

function adicionarItem(id, nome, preco) {
    if (!clienteAtualId) {
        exibirAlerta("Selecione um cliente ou inicie uma Venda Rápida.", 'warning');
        return;
    }

    let pedido = pedidosEmAberto[clienteAtualId];
    if (!pedido) {
        exibirAlerta("Erro: Pedido não encontrado. Selecione o cliente novamente.", 'danger');
        return;
    }
    
    const itemExistente = pedido.itens.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        pedido.itens.push({ id, nome, preco, quantidade: 1 });
    }

    salvarPedidos();
    renderizarItensCaixa();
    renderizarClientes();
    
    exibirAlerta(`+1 ${nome} adicionado ao pedido!`, 'success');
}

function renderizarItensCaixa() {
    const pedido = pedidosEmAberto[clienteAtualId];
    if(caixaList) caixaList.innerHTML = '';
    
    if (!pedido || pedido.itens.length === 0) {
        if(caixaList) caixaList.innerHTML = '<li class="list-group-item text-muted">Nenhum item adicionado ao pedido.</li>';
        calcularTotais();
        return;
    }

    pedido.itens.forEach((item, index) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
        li.innerHTML = `
            <div class="item-info">
                <span class="badge bg-primary rounded-pill me-2">${item.quantidade}x</span> 
                ${item.nome}
                <br>
                <small class="text-muted">R$ ${item.preco.toFixed(2).replace('.', ',')} cada</small>
            </div>
            <div class="item-controls">
                <span class="fw-bold me-2">R$ ${(item.quantidade * item.preco).toFixed(2).replace('.', ',')}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="ajustarQuantidade(${index}, 1)">+</button>
                <button class="btn btn-sm btn-outline-danger" onclick="ajustarQuantidade(${index}, -1)">-</button>
            </div>
        `;
        if(caixaList) caixaList.appendChild(li);
    });

    calcularTotais();
    atualizarContadorItensCaixa();
}

function ajustarQuantidade(index, delta) {
    const pedido = pedidosEmAberto[clienteAtualId];
    if (!pedido) return;

    pedido.itens[index].quantidade += delta;

    if (pedido.itens[index].quantidade <= 0) {
        pedido.itens.splice(index, 1);
    }
    
    salvarPedidos();
    renderizarItensCaixa();
    renderizarClientes();
}

function calcularTotais() {
    const pedido = pedidosEmAberto[clienteAtualId];
    let subtotal = 0;
    
    if (pedido) {
        subtotal = pedido.itens.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
    }

    const desconto = 0;
    const total = subtotal - desconto;

    const subtotalEl = document.getElementById('caixa-subtotal');
    const descontoEl = document.getElementById('caixa-desconto');
    const totalEl = document.getElementById('caixa-total');

    if(subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if(descontoEl) descontoEl.textContent = `R$ ${desconto.toFixed(2).replace('.', ',')}`;
    if(totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    
    return { subtotal, total, desconto };
}

function atualizarContadorItensCaixa() {
    const pedido = pedidosEmAberto[clienteAtualId];
    const totalItens = pedido ? pedido.itens.reduce((total, item) => total + item.quantidade, 0) : 0;
    const itemCountElement = document.getElementById('caixa-item-count');
    if (itemCountElement) {
        itemCountElement.textContent = `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;
    }
}

function cancelarPedido() {
    if (confirm(`Tem certeza que deseja cancelar o pedido? Todos os itens serão perdidos.`)) {
        delete pedidosEmAberto[clienteAtualId];
        salvarPedidos();
        if(caixaModal) caixaModal.hide();
        renderizarClientes();
        exibirAlerta(`Pedido cancelado.`, 'info');
    }
}

// ====================================================================
// FECHAMENTO DE CAIXA (LÓGICA E CHAMADAS)
// ====================================================================

/**
 * Função global para abrir o modal de senha, chamada pelo HTML.
 */
window.verificarSenhaFechamento = function() {
    const senhaModal = new bootstrap.Modal(document.getElementById('senhaModal'));
    senhaModal.show();
    document.getElementById('senha-fechamento').value = '';
    document.getElementById('senha-message').textContent = '';
};

// ====================================================================
// FUNÇÕES AUXILIARES
// ====================================================================

function salvarPedidos() {
    localStorage.setItem(LS_PEDIDOS_KEY, JSON.stringify(pedidosEmAberto));
}

function exibirAlerta(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.classList.add('alert', `alert-${type}`, 'alert-dismissible', 'fade', 'show');
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.prepend(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 1500);
}


function baixarRelatorioTxt(conteudo, nomeArquivo = "relatorio_fechamento.txt") {
    const blob = new Blob([conteudo], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// ====================================================================
// FUNÇÕES DE FIADO - ATUALIZADAS E COMPLETAS
// ====================================================================

/**
 * Salva venda fiado no Firebase (nos nós corretos)
 * Inclui todos os dados: itens, total, cliente, etc.
 */
async function salvarVendaFiadoSeparado(venda) {
    if (typeof firebase === 'undefined' || !firebase.database) {
        throw new Error("Firebase não disponível para salvar FIADO");
    }
    
    // Salva no nó vendas_fiado (para o controle de fiado)
    const vendaFiadoCompleta = {
        nome: venda.nome || '',
        cpf: venda.cpf || '',
        totalVenda: venda.totalVenda || 0,
        itens: venda.itens || [],
        pagamento: 'Fiado',
        tipo: venda.tipo || 'cliente_fichado',
        abertura: venda.abertura || new Date().toISOString(),
        fechamento: venda.fechamento || new Date().toISOString(),
        criadoEm: venda.criadoEm || new Date().toISOString(),
        status: 'pendente'
    };
    
    try {
        // 1. Salva no nó vendas_fiado (para controle de fiado)
        await firebase.database().ref('vendas_fiado').push(vendaFiadoCompleta);
        
        // 2. Também salva em vendas_dia para registro geral
        await firebase.database().ref('vendas_dia').push(vendaFiadoCompleta);
        
        // 3. Atualiza o gasto total do cliente
        if (vendaFiadoCompleta.nome) {
            await window.atualizarGastoClienteNoFirebase(vendaFiadoCompleta.nome, vendaFiadoCompleta.totalVenda);
        }
        
        console.log('Venda fiado salva com sucesso:', vendaFiadoCompleta);
        return vendaFiadoCompleta;
    } catch (error) {
        console.error('Erro ao salvar venda fiado:', error);
        throw error;
    }
}

/**
 * Verifica se cliente tem permissão para comprar fiado
 * Verifica por NOME E APELIDOS
 */
window.verificarPermissaoFiado = async function(nomeCliente) {
    if (!nomeCliente || nomeCliente.trim() === '') {
        return { 
            permitido: false, 
            mensagem: 'Nome do cliente não informado',
            cliente: null
        };
    }
    
    const nomeClienteLower = nomeCliente.toLowerCase().trim();
    
    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            // Busca todos os clientes cadastrados
            const snapshot = await firebase.database().ref('clientes_gastos').once('value');
            const clientes = snapshot.val();
            
            if (!clientes) {
                return { 
                    permitido: false, 
                    mensagem: 'Nenhum cliente cadastrado no sistema. Cadastre o cliente primeiro.',
                    cliente: null
                };
            }
            
            // Verifica se o nome ou apelido correspondem
            let clienteEncontrado = null;
            let encontradoPor = '';
            
            Object.values(clientes).forEach(cliente => {
                if (clienteEncontrado) return; // Já encontrou
                
                // Verifica pelo nome exato ou parcial
                if (cliente.nome) {
                    const nomeClienteCad = cliente.nome.toLowerCase();
                    if (nomeClienteCad === nomeClienteLower || 
                        nomeClienteCad.includes(nomeClienteLower)) {
                        clienteEncontrado = cliente;
                        encontradoPor = 'nome';
                        return;
                    }
                }
                
                // Verifica pelo apelido1
                if (cliente.apelido1) {
                    const apelido1Lower = cliente.apelido1.toLowerCase();
                    if (apelido1Lower === nomeClienteLower || 
                        apelido1Lower.includes(nomeClienteLower)) {
                        clienteEncontrado = cliente;
                        encontradoPor = 'apelido1';
                        return;
                    }
                }
                
                // Verifica pelo apelido2
                if (cliente.apelido2) {
                    const apelido2Lower = cliente.apelido2.toLowerCase();
                    if (apelido2Lower === nomeClienteLower || 
                        apelido2Lower.includes(nomeClienteLower)) {
                        clienteEncontrado = cliente;
                        encontradoPor = 'apelido2';
                        return;
                    }
                }
            });
            
            if (clienteEncontrado) {
                return { 
                    permitido: true, 
                    mensagem: `Cliente autorizado (encontrado por ${encontradoPor})`,
                    cliente: clienteEncontrado,
                    encontradoPor: encontradoPor
                };
            } else {
                return { 
                    permitido: false, 
                    mensagem: `Cliente "${nomeCliente}" não encontrado no cadastro. Cadastre o cliente no sistema de fiado primeiro.`,
                    cliente: null
                };
            }
        }
    } catch (e) {
        console.error('Erro ao verificar permissão de fiado:', e);
        return { 
            permitido: false, 
            mensagem: 'Erro ao verificar permissão. Tente novamente.',
            cliente: null
        };
    }
    
    // Fallback: verificação local
    try {
        const lista = JSON.parse(localStorage.getItem('clientes_lista') || '[]');
        if (Array.isArray(lista)) {
            const encontrado = lista.find(n => {
                if (!n) return false;
                const nLower = n.toLowerCase();
                return nLower === nomeClienteLower || 
                       nLower.includes(nomeClienteLower) || 
                       nomeClienteLower.includes(nLower);
            });
            if (encontrado) {
                return { 
                    permitido: true, 
                    mensagem: `Cliente encontrado localmente: ${encontrado}`,
                    cliente: { nome: encontrado }
                };
            }
        }
    } catch (e) {
        console.warn('Erro na verificação local:', e);
    }
    
    return { 
        permitido: false, 
        mensagem: `Cliente não autorizado para compra fiado. Verifique cadastro.`,
        cliente: null
    };
};

/**
 * Busca clientes por nome ou apelido (para sugestões no seletor)
 */
window.buscarClientePorNomeOuApelido = async function(termo) {
    if (!termo || termo.trim() === '') return [];
    
    const termoLower = termo.toLowerCase().trim();
    const resultados = [];
    
    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            const snapshot = await firebase.database().ref('clientes_gastos').once('value');
            const clientes = snapshot.val();
            
            if (clientes) {
                Object.values(clientes).forEach(cliente => {
                    if (!cliente) return;
                    
                    let encontrado = false;
                    let motivo = '';
                    
                    // Verifica por nome
                    if (cliente.nome && cliente.nome.toLowerCase().includes(termoLower)) {
                        encontrado = true;
                        motivo = 'nome';
                    }
                    // Verifica por apelido1
                    else if (cliente.apelido1 && cliente.apelido1.toLowerCase().includes(termoLower)) {
                        encontrado = true;
                        motivo = 'apelido';
                    }
                    // Verifica por apelido2
                    else if (cliente.apelido2 && cliente.apelido2.toLowerCase().includes(termoLower)) {
                        encontrado = true;
                        motivo = 'apelido';
                    }
                    
                    if (encontrado) {
                        resultados.push({
                            ...cliente,
                            encontradoPor: motivo,
                            displayText: `${cliente.nome}${cliente.apelido1 ? ` (${cliente.apelido1})` : ''}${cliente.apelido2 ? ` (${cliente.apelido2})` : ''}`
                        });
                    }
                });
            }
        }
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
    }
    
    // Ordena resultados: primeiro por nome exato, depois por similaridade
    resultados.sort((a, b) => {
        const aNome = a.nome.toLowerCase();
        const bNome = b.nome.toLowerCase();
        
        // Nomes que começam com o termo vêm primeiro
        if (aNome.startsWith(termoLower) && !bNome.startsWith(termoLower)) return -1;
        if (!aNome.startsWith(termoLower) && bNome.startsWith(termoLower)) return 1;
        
        // Depois por ordem alfabética
        return aNome.localeCompare(bNome);
    });
    
    return resultados;
};

/**
 * Abate apenas o estoque para uma venda (não registra a venda no nó 'vendas_dia')
 */
window.abaterEstoqueSomente = async function(venda) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) {
            throw new Error("Firebase não disponível para abater estoque");
        }
        
        const estoqueRef = firebase.database().ref('estoque_atual');
        const atualizacoes = [];
        
        for (const item of venda.itens) {
            const atualizacao = estoqueRef.child(item.id).transaction((estoqueAtual) => {
                const quantidadeVendido = item.quantidade;
                if (estoqueAtual === null) {
                    console.warn(`Produto ${item.id} não encontrado no estoque, inicializando com 0 e debitando.`);
                    return -quantidadeVendido;
                }
                return estoqueAtual - quantidadeVendido;
            });
            atualizacoes.push(atualizacao);
        }
        
        await Promise.all(atualizacoes);
        console.log('Estoque abatido para venda fiado:', venda.itens.length, 'itens');
        return true;
    } catch (error) {
        console.error('Erro ao abater estoque (somente):', error);
        return false;
    }
};

// ====================================================================
// INICIALIZAÇÃO E LISTENERS DE EVENTOS
// ====================================================================

window.addEventListener('load', function() {
    renderizarClientes();
    
    // ========================================================
    // 1. LISTENER DE FINALIZAR VENDA (ATUALIZADO)
    // ========================================================
    const finalizarVendaBtn = document.getElementById('finalizar-venda');
    if(finalizarVendaBtn) {
        finalizarVendaBtn.addEventListener('click', async () => {
            // Verifica se a função de Firebase existe
            if (typeof window.salvarVendaEAtualizarEstoque !== 'function') {
                exibirAlerta("Erro: O sistema Firebase não está carregado corretamente.", 'danger');
                return;
            }
            
            // Verifica se a função de impressão foi carregada
            if (typeof window.imprimirPedido !== 'function') {
                exibirAlerta("Erro: A função de impressão de pedido não está carregada.", 'danger');
                return;
            }

            const pedido = pedidosEmAberto[clienteAtualId];
            if (!pedido || pedido.itens.length === 0) {
                exibirAlerta("Não há itens neste pedido.", 'warning');
                return;
            }

            const formaPagamento = document.getElementById('forma-pagamento').value;
            if (!formaPagamento || formaPagamento === "Selecione") {
                exibirAlerta("Selecione a forma de pagamento!", 'warning');
                return;
            }

            const { total } = calcularTotais();

            const vendaFinalizada = {
                ...pedido,
                totalVenda: total,
                pagamento: formaPagamento,
                fechamento: new Date().toISOString()
            };

            const btnFinalizar = finalizarVendaBtn;
            const originalText = btnFinalizar.innerHTML;
            btnFinalizar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Processando...';
            btnFinalizar.disabled = true;

            try {
                if (formaPagamento === 'Fiado') {
                    // Só clientes fichados podem comprar fiado
                    if (!vendaFinalizada.nome || vendaFinalizada.tipo !== 'cliente_fichado') {
                        exibirAlerta('Fiado só permitido para clientes cadastrados (use seleção de cliente).', 'warning');
                        btnFinalizar.innerHTML = originalText;
                        btnFinalizar.disabled = false;
                        return;
                    }

                    // Verifica permissão com nome e apelidos
                    const verificacao = await window.verificarPermissaoFiado(vendaFinalizada.nome);
                    
                    if (!verificacao.permitido) {
                        // Mostra mensagem específica do erro
                        exibirAlerta(verificacao.mensagem, 'danger');
                        
                        // Sugere cadastrar o cliente
                        if (confirm(`${verificacao.mensagem}\n\nDeseja cadastrar o cliente agora?`)) {
                            // Aqui você pode redirecionar para a página de cadastro de fiado
                            // ou abrir um modal de cadastro rápido
                            window.open('controle_fiado.html', '_blank');
                        }
                        
                        btnFinalizar.innerHTML = originalText;
                        btnFinalizar.disabled = false;
                        return;
                    }

                    // Usa o nome correto do cadastro (pode ser diferente do digitado)
                    if (verificacao.cliente && verificacao.cliente.nome) {
                        vendaFinalizada.nome = verificacao.cliente.nome;
                        vendaFinalizada.cpf = verificacao.cliente.cpf || '';
                    }

                    // Abate somente o estoque (sem registrar como venda regular)
                    const estoqueAbatido = await window.abaterEstoqueSomente(vendaFinalizada);
                    if (!estoqueAbatido) {
                        throw new Error('Falha ao abater estoque');
                    }

                    // Salva o registro completo do fiado
                    await salvarVendaFiadoSeparado({
                        ...vendaFinalizada,
                        criadoEm: new Date().toISOString()
                    });

                    // Imprime o pedido
                    window.imprimirPedido(vendaFinalizada);
                    
                    exibirAlerta(`✅ Venda FIADO de R$ ${total.toFixed(2).replace('.', ',')} registrada para ${vendaFinalizada.nome}.`, 'success');
                    
                } else {
                    // VENDA NORMAL (não fiado)
                    const sucesso = await window.salvarVendaEAtualizarEstoque(vendaFinalizada);

                    if (!sucesso) throw new Error('Falha ao processar venda e estoque');

                    if (vendaFinalizada.nome && (vendaFinalizada.tipo === 'cliente_fichado' || vendaFinalizada.tipo === 'rapida')) {
                        window.atualizarGastoClienteNoFirebase(vendaFinalizada.nome, vendaFinalizada.totalVenda).catch(e => console.error("Erro ao atualizar gasto:", e));
                        window.salvarVendaDetalhadaNoFirebase(vendaFinalizada).catch(e => console.error("Erro ao salvar detalhe:", e));
                    }

                    exibirAlerta(`✅ Venda de R$ ${total.toFixed(2).replace('.', ',')} finalizada! Estoque e histórico atualizados.`, 'success');
                    window.imprimirPedido(vendaFinalizada);
                }

                // Limpa o pedido após finalizar
                delete pedidosEmAberto[clienteAtualId];
                salvarPedidos();
                if(caixaModal) caixaModal.hide();
                renderizarClientes();

            } catch (error) {
                console.error('Erro ao finalizar venda:', error);
                exibirAlerta(`❌ Erro ao finalizar a venda: ${error.message}`, 'danger');
            } finally {
                btnFinalizar.innerHTML = originalText;
                btnFinalizar.disabled = false;
            }
        });
    }

    // ========================================================
    // 2. LISTENER DE FECHAR CAIXA
    // ========================================================
    const fecharCaixaBtn = document.getElementById('btn-fechar-caixa');
    if(fecharCaixaBtn) {
        fecharCaixaBtn.addEventListener('click', async () => {
            // Verifica se a função de Firebase existe
            if (typeof window.fecharCaixaERelatorio !== 'function') {
                document.getElementById('senha-message').textContent = "Erro: O sistema Firebase não está carregado corretamente.";
                return;
            }
            
            // Verifica se a função de impressão existe
            if (typeof window.imprimirRelatorio !== 'function') {
                document.getElementById('senha-message').textContent = "Erro: A função de impressão de relatório não está carregada.";
                return;
            }

            const senhaDigitada = document.getElementById('senha-fechamento').value;
            const senhaMessage = document.getElementById('senha-message');

            if (senhaDigitada !== SENHA_FECHAMENTO) {
                senhaMessage.textContent = "Senha incorreta.";
                return;
            }
            
            const btnFechar = fecharCaixaBtn;
            const originalText = btnFechar.innerHTML;
            btnFechar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Processando...';
            btnFechar.disabled = true;

            const { sucesso, relatorioHTML, vendas, relatorioTXT } = await window.fecharCaixaERelatorio();

            btnFechar.innerHTML = originalText;
            btnFechar.disabled = false;
            
            const senhaModalInstance = bootstrap.Modal.getInstance(document.getElementById('senhaModal'));

            if (!sucesso) {
                senhaMessage.textContent = "Erro ao processar o relatório de fechamento.";
                if(senhaModalInstance) senhaModalInstance.hide();
                document.getElementById('relatorioModalBody').innerHTML = relatorioHTML;
                new bootstrap.Modal(document.getElementById('relatorioModal')).show();
                return;
            }
            
            if (!vendas || vendas.length === 0) {
                senhaMessage.textContent = "Fechamento realizado. Nenhuma venda registrada no período.";
                if(senhaModalInstance) senhaModalInstance.hide();
                document.getElementById('relatorioModalBody').innerHTML = relatorioHTML;
                new bootstrap.Modal(document.getElementById('relatorioModal')).show();
                return;
            }

            senhaMessage.textContent = "";
            if(senhaModalInstance) senhaModalInstance.hide();
            
            document.getElementById('relatorioModalBody').innerHTML = relatorioHTML;
            new bootstrap.Modal(document.getElementById('relatorioModal')).show();
            
            // CHAMA A FUNÇÃO DE IMPRESSÃO DO ARQUIVO EXTERNO
            window.imprimirRelatorio(relatorioHTML);

            baixarRelatorioTxt(relatorioTXT);
        });
    }

    // Configura o botão de impressão do pedido no modal
    document.getElementById('imprimir-pedido').addEventListener('click', function() {
        if (typeof window.imprimirPedido !== 'function') {
            exibirAlerta("Erro: A função de impressão de pedido não está carregada.", 'danger');
            return;
        }

        const pedido = pedidosEmAberto[clienteAtualId];
        if (pedido && pedido.itens.length > 0) {
            const { total } = calcularTotais();
            const pedidoParaImpressao = {
                ...pedido,
                totalVenda: total,
                pagamento: document.getElementById('forma-pagamento').value
            };
            // CHAMADA DA FUNÇÃO NO ARQUIVO EXTERNO
            window.imprimirPedido(pedidoParaImpressao);
        } else {
            exibirAlerta("Não há itens para imprimir.", 'warning');
        }
    });
    
    // Configura o botão de impressão do relatório no modal
    document.getElementById('btn-imprimir-relatorio-modal').addEventListener('click', function() {
        if (typeof window.imprimirRelatorio !== 'function') {
            exibirAlerta("Erro: A função de impressão de relatório não está carregada.", 'danger');
            return;
        }
        const relatorioHTML = document.getElementById("relatorioModalBody").innerHTML;
        // CHAMADA DA FUNÇÃO NO ARQUIVO EXTERNO
        window.imprimirRelatorio(relatorioHTML);
    });

    
    const caixaModalElement = document.getElementById('caixaModal');
    if(caixaModalElement) {
        caixaModalElement.addEventListener('hidden.bs.modal', function() {
            clienteAtualId = null;
            clienteAtualNome = null;
        });
    }
});