// caixa_log.js - Sistema de Log Automático com Armazenamento Local
document.addEventListener('DOMContentLoaded', function() {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) {
        console.error('Container de log não encontrado!');
        return;
    }

    // Chave para armazenamento no localStorage
    const LOG_STORAGE_KEY = 'bar_ceara_logs';
    const LOG_TIMESTAMP_KEY = 'bar_ceara_logs_timestamp';

    // Estado do sistema
    let clienteAtual = 'Nenhum';
    let pedidoAtual = [];
    let ultimaAcao = '';
    let ultimoItemCount = 0;

    // Função para verificar e limpar logs expirados
    function limparLogsExpirados() {
        const timestampSalvo = localStorage.getItem(LOG_TIMESTAMP_KEY);
        if (timestampSalvo) {
            const agora = new Date().getTime();
            const tempoSalvo = parseInt(timestampSalvo);
            const diferencaHoras = (agora - tempoSalvo) / (1000 * 60 * 60);
            
            if (diferencaHoras >= 24) {
                // Limpar logs após 24 horas
                localStorage.removeItem(LOG_STORAGE_KEY);
                localStorage.removeItem(LOG_TIMESTAMP_KEY);
                console.log('Logs antigos removidos (expiração 24h)');
            }
        }
    }

    // Função para salvar logs no localStorage
    function salvarLogs(logs) {
        try {
            localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
            // Salvar timestamp atual se for a primeira vez
            if (!localStorage.getItem(LOG_TIMESTAMP_KEY)) {
                localStorage.setItem(LOG_TIMESTAMP_KEY, new Date().getTime().toString());
            }
        } catch (e) {
            console.error('Erro ao salvar logs no localStorage:', e);
        }
    }

    // Função para carregar logs do localStorage
    function carregarLogs() {
        try {
            limparLogsExpirados();
            const logsSalvos = localStorage.getItem(LOG_STORAGE_KEY);
            if (logsSalvos) {
                return JSON.parse(logsSalvos);
            }
        } catch (e) {
            console.error('Erro ao carregar logs do localStorage:', e);
        }
        return [];
    }

    // Função principal para adicionar logs
    function adicionarLog(mensagem, tipo = 'info', icon = '📝') {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        const dataCompleta = new Date().toLocaleString('pt-BR');
        const entry = document.createElement('div');
        entry.className = `log-entry ${tipo}`;
        entry.innerHTML = `<span>[${timestamp}]</span> ${icon} ${mensagem}`;
        logContainer.appendChild(entry);
        
        // Rolagem automática para o final
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Salvar no localStorage
        const logs = carregarLogs();
        const logEntry = {
            mensagem: `${icon} ${mensagem}`,
            tipo: tipo,
            timestamp: timestamp,
            dataCompleta: dataCompleta,
            timestampMs: new Date().getTime()
        };
        
        logs.push(logEntry);
        
        // Manter apenas os últimos 100 logs no localStorage também
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        salvarLogs(logs);
        
        // Limitar número de entradas visíveis (opcional - mantém últimos 50 logs)
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }
        
        console.log(`[LOG] ${mensagem}`);
    }

    // Função para restaurar logs do localStorage na interface
    function restaurarLogs() {
        const logs = carregarLogs();
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${log.tipo}`;
            entry.innerHTML = `<span>[${log.timestamp}]</span> ${log.mensagem}`;
            logContainer.appendChild(entry);
        });
        
        if (logs.length > 0) {
            adicionarLog(`Logs restaurados - ${logs.length} entradas carregadas`, 'success', '📂');
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // Função para exportar logs (útil para análise)
    window.exportarLogs = function() {
        const logs = carregarLogs();
        const logText = logs.map(log => 
            `[${log.dataCompleta}] ${log.mensagem}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_bar_ceara_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        adicionarLog('Logs exportados para arquivo', 'info', '💾');
    };

    // Função para limpar logs manualmente
    window.limparLogs = function() {
        if (confirm('Deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem(LOG_STORAGE_KEY);
            localStorage.removeItem(LOG_TIMESTAMP_KEY);
            logContainer.innerHTML = '';
            adicionarLog('Todos os logs foram limpos', 'warning', '🧹');
        }
    };

    // Função para verificar estatísticas dos logs
    window.verificarEstatisticasLogs = function() {
        const logs = carregarLogs();
        const agora = new Date().getTime();
        const logsHoje = logs.filter(log => (agora - log.timestampMs) < (24 * 60 * 60 * 1000));
        
        const estatisticas = {
            total: logs.length,
            hoje: logsHoje.length,
            ultimoLog: logs.length > 0 ? logs[logs.length - 1].dataCompleta : 'Nenhum'
        };
        
        adicionarLog(`Estatísticas: ${estatisticas.total} logs totais, ${estatisticas.hoje} nas últimas 24h`, 'info', '📊');
        return estatisticas;
    };

    // Monitorar mudanças específicas nos itens do pedido
    function monitorarItensPedidoDetalhado() {
        let estadoAnterior = [];
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    // Capturar estado atual dos itens
                    const itensAtuais = Array.from(document.querySelectorAll('#caixa-list .list-group-item:not(.text-muted)'));
                    const estadoAtual = itensAtuais.map(item => {
                        const nome = item.querySelector('.produto-nome')?.textContent || 
                                    item.querySelector('.fw-bold')?.textContent || 
                                    item.textContent.split(' - ')[0];
                        const quantidade = item.querySelector('.badge')?.textContent || '1';
                        const preco = item.querySelector('.produto-preco')?.textContent || 
                                     item.querySelector('.text-muted')?.textContent || '';
                        return { nome, quantidade, preco, elemento: item };
                    }).filter(item => item.nome && !item.nome.includes('Nenhum item'));

                    // Comparar com estado anterior para detectar mudanças
                    if (estadoAnterior.length !== estadoAtual.length) {
                        // Houve adição ou remoção de itens
                        if (estadoAtual.length > estadoAnterior.length) {
                            // Item ADICIONADO
                            const novoItem = estadoAtual.find(item => 
                                !estadoAnterior.some(oldItem => oldItem.nome === item.nome)
                            );
                            if (novoItem) {
                                adicionarLog(`➕ ADICIONADO para ${clienteAtual}: ${novoItem.quantidade}x ${novoItem.nome} ${novoItem.preco}`, 'success', '🛒');
                            }
                        } else if (estadoAtual.length < estadoAnterior.length) {
                            // Item REMOVIDO
                            const itemRemovido = estadoAnterior.find(item => 
                                !estadoAtual.some(newItem => newItem.nome === item.nome)
                            );
                            if (itemRemovido) {
                                adicionarLog(`➖ REMOVIDO de ${clienteAtual}: ${itemRemovido.quantidade}x ${itemRemovido.nome}`, 'error', '🗑️');
                            }
                        }
                        
                        // Atualizar contagem geral
                        const countElement = document.getElementById('caixa-item-count');
                        if (countElement) {
                            const countText = countElement.textContent;
                           // adicionarLog(`📦 Pedido atualizado: ${countText}`, 'info', '📋');
                        }
                    } else if (estadoAtual.length > 0 && estadoAnterior.length > 0) {
                        // Verificar mudanças na quantidade do mesmo item
                        estadoAtual.forEach(itemAtual => {
                            const itemAnterior = estadoAnterior.find(item => item.nome === itemAtual.nome);
                            if (itemAnterior && itemAnterior.quantidade !== itemAtual.quantidade) {
                                const diff = parseInt(itemAtual.quantidade) - parseInt(itemAnterior.quantidade);
                                if (diff > 0) {
                                    adicionarLog(`➕ QUANTIDADE AUMENTADA para ${clienteAtual}: ${itemAtual.nome} de ${itemAnterior.quantidade} para ${itemAtual.quantidade}`, 'success', '📈');
                                } else if (diff < 0) {
                                    adicionarLog(`➖ QUANTIDADE DIMINUÍDA de ${clienteAtual}: ${itemAtual.nome} de ${itemAnterior.quantidade} para ${itemAtual.quantidade}`, 'warning', '📉');
                                }
                            }
                        });
                    }
                    
                    // Atualizar estado anterior
                    estadoAnterior = estadoAtual.map(item => ({...item}));
                    ultimoItemCount = estadoAtual.length;
                }
            });
        });

        const listaItens = document.getElementById('caixa-list');
        if (listaItens) {
            observer.observe(listaItens, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    // Monitorar botões de remoção específicos
    function monitorarBotoesRemocao() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    const botoesRemover = document.querySelectorAll('.btn-remover, .btn-danger, [onclick*="remover"], [class*="remover"]');
                    botoesRemover.forEach(botao => {
                        if (!botao.hasAttribute('data-log-remocao-monitorado')) {
                            botao.setAttribute('data-log-remocao-monitorado', 'true');
                            botao.addEventListener('click', function() {
                                // Tentar encontrar o nome do produto associado
                                const item = this.closest('.list-group-item');
                                if (item) {
                                    const produtoNome = item.querySelector('.produto-nome')?.textContent || 
                                                       item.querySelector('.fw-bold')?.textContent || 
                                                       'Item do pedido';
                                    const quantidade = item.querySelector('.badge')?.textContent || '1';
                                    
                                    setTimeout(() => {
                                        adicionarLog(`➖ REMOVIDO MANUALMENTE de ${clienteAtual}: ${quantidade}x ${produtoNome}`, 'error', '❌');
                                    }, 100);
                                }
                            });
                        }
                    });
                }
            });
        });

        const listaItens = document.getElementById('caixa-list');
        if (listaItens) {
            observer.observe(listaItens, {
                childList: true,
                subtree: true
            });
        }
    }

    // Monitorar cliques nos botões de cliente
    function monitorarClientes() {
        const botoesClientes = document.querySelectorAll('.cliente');
        botoesClientes.forEach(botao => {
            botao.addEventListener('click', function() {
                const clienteId = this.getAttribute('data-cliente-id');
                const clienteTexto = this.textContent.trim();
                
                if (clienteId === 'rapida') {
                    clienteAtual = 'VENDA RÁPIDA';
                    adicionarLog('Modo Venda Rápida ativado', 'warning', '💰');
                } else {
                    clienteAtual = clienteTexto;
                    adicionarLog(`Cliente selecionado: ${clienteTexto} (ID: ${clienteId})`, 'success', '👤');
                }
                
                ultimaAcao = 'selecao_cliente';
                ultimoItemCount = 0;
            });
        });
    }

    // Monitorar categorias
    function monitorarCategorias() {
        const categorias = document.querySelectorAll('.nav-item');
        categorias.forEach(categoria => {
            categoria.addEventListener('click', function() {
                const categoriaNome = this.textContent.trim();
                adicionarLog(`Categoria acessada: ${categoriaNome}`, 'info', '📁');
                ultimaAcao = 'navegacao_categoria';
            });
        });
    }

    // Monitorar produtos
    function monitorarProdutos() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    const botoesProdutos = document.querySelectorAll('.produto-btn, .btn-produto, [class*="produto"]');
                    botoesProdutos.forEach(botao => {
                        if (!botao.hasAttribute('data-log-monitorado')) {
                            botao.setAttribute('data-log-monitorado', 'true');
                            botao.addEventListener('click', function() {
                                const produtoNome = this.querySelector('.produto-nome')?.textContent || 
                                                  this.querySelector('.fw-bold')?.textContent ||
                                                  this.textContent.trim();
                                const produtoPreco = this.querySelector('.produto-preco')?.textContent || 
                                                   this.querySelector('.text-muted')?.textContent || '';
                                
                                adicionarLog(`Selecionado produto: ${produtoNome} ${produtoPreco}`, 'info', '👉');
                                ultimaAcao = 'selecao_produto';
                            });
                        }
                    });
                }
            });
        });

        const produtosContainer = document.getElementById('produtos-container');
        if (produtosContainer) {
            observer.observe(produtosContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    // Monitorar o modal do caixa
    function monitorarModalCaixa() {
        const modal = document.getElementById('caixaModal');
        if (modal) {
            modal.addEventListener('show.bs.modal', function() {
                adicionarLog('Caixa de pedido aberto', 'info', '💼');
            });

            modal.addEventListener('hide.bs.modal', function() {
                adicionarLog('Caixa de pedido fechado', 'info', '📋');
            });
        }

        const btnFinalizar = document.getElementById('finalizar-venda');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', function() {
                const subtotal = document.getElementById('caixa-subtotal')?.textContent || 'R$ 0,00';
                const formaPagamento = document.getElementById('forma-pagamento')?.value || 'Não informado';
                const totalItens = document.getElementById('caixa-item-count')?.textContent || '0 itens';
                
                adicionarLog(`✅ VENDA FINALIZADA - Cliente: ${clienteAtual} | ${totalItens} | Total: ${subtotal} | Pagamento: ${formaPagamento}`, 'success', '🎉');
                
                clienteAtual = 'Nenhum';
                pedidoAtual = [];
                ultimaAcao = 'venda_finalizada';
                ultimoItemCount = 0;
            });
        }

        const formaPagamento = document.getElementById('forma-pagamento');
        if (formaPagamento) {
            formaPagamento.addEventListener('change', function() {
                adicionarLog(`Forma de pagamento selecionada: ${this.value}`, 'info', '💳');
            });
        }
    }

    // Monitorar fechamento de caixa
    function monitorarFechamentoCaixa() {
        const btnFecharCaixa = document.querySelector('[onclick="verificarSenhaFechamento()"]');
        if (btnFecharCaixa) {
            btnFecharCaixa.addEventListener('click', function() {
                adicionarLog('Solicitado fechamento de caixa', 'warning', '📊');
            });
        }

        const btnGerarRelatorio = document.getElementById('btn-fechar-caixa');
        if (btnGerarRelatorio) {
            btnGerarRelatorio.addEventListener('click', function() {
                adicionarLog('Relatório de fechamento gerado', 'success', '📈');
            });
        }
    }

    // Monitorar vendas rápidas
    function monitorarVendaRapida() {
        const btnVendaRapida = document.getElementById('abrir-caixa');
        if (btnVendaRapida) {
            btnVendaRapida.addEventListener('click', function() {
                adicionarLog('Botão VENDA RÁPIDA acionado - Iniciando venda sem cliente específico', 'warning', '⚡');
                clienteAtual = 'VENDA RÁPIDA';
                ultimaAcao = 'venda_rapida_iniciada';
                ultimoItemCount = 0;
            });
        }
    }

    // Inicializar todos os monitores
    function inicializarMonitoramento() {
        // Primeiro restaura os logs salvos
        restaurarLogs();
        
        adicionarLog('Sistema de log inicializado - Capturando todas as atividades', 'success', '🚀');
        
        monitorarClientes();
        monitorarCategorias();
        monitorarProdutos();
        monitorarModalCaixa();
        monitorarFechamentoCaixa();
        monitorarItensPedidoDetalhado();
        monitorarBotoesRemocao();
        monitorarVendaRapida();
        
        adicionarLog('Todos os monitores ativados - Sistema pronto', 'success', '✅');
        
        // Verificar estatísticas iniciais
        setTimeout(() => {
            verificarEstatisticasLogs();
        }, 2000);
    }

    // Funções globais para uso externo
    window.adicionarLog = adicionarLog;
    window.getClienteAtual = () => clienteAtual;
    window.getUltimaAcao = () => ultimaAcao;
    window.exportarLogs = exportarLogs;
    window.limparLogs = limparLogs;
    window.verificarEstatisticasLogs = verificarEstatisticasLogs;

    // Iniciar o monitoramento
    setTimeout(inicializarMonitoramento, 1000);
});