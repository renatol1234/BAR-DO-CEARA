// =========================================================
// FIREBASE - CONFIGURAÇÃO E INTERAÇÃO COM O BANCO
// Este script DEVE ser carregado antes do caixa.js
// =========================================================

// Configuração do Firebase

     const firebaseConfig = {
             apiKey: "AIzaSyCdbKJ9gO0m7eGzX5vZotORRnaKp0XZAew",
            authDomain: "bar-do-ceara.firebaseapp.com",
            databaseURL: "https://bar-do-ceara-default-rtdb.firebaseio.com",
            projectId: "bar-do-ceara",
            storageBucket: "bar-do-ceara.firebasestorage.app",
            messagingSenderId: "261053972795",
            appId: "1:261053972795:web:f2a08158ecf83b36ef771e",
            measurementId: "G-Y0GVZ7W652"
        };

// Inicializa o Firebase
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const estoqueRef = db.ref('estoque_atual');
const vendasRef = db.ref('vendas_dia'); // Vendas registradas ao longo do dia
const historicoFechamentoRef = db.ref('historico_caixa'); // Relatórios de fechamento
const clientesGastosRef = db.ref('clientes_gastos'); // Referência para gastos dos clientes

/**
 * Função para sanitizar chaves do Firebase (remover caracteres inválidos)
 */
function sanitizarChaveFirebase(chave) {
    if (typeof chave !== 'string' || !chave.trim()) {
        return 'cliente_nao_identificado';
    }
    // Remove caracteres inválidos: ., #, $, /, [, ]
    return chave.trim().replace(/[.#$/\[\]]/g, '_').toLowerCase();
}
window.sanitizarChaveFirebase = sanitizarChaveFirebase; 

/**
 * Salva uma venda finalizada no banco de dados e atualiza o estoque.
 * @param {object} venda - O objeto de venda contendo itens, total, cliente e pagamento.
 * @returns {boolean} - true se a operação foi bem-sucedida, false caso contrário.
 */
window.salvarVendaEAtualizarEstoque = async function(venda) {
    try {
        // 1. REGISTRA A VENDA COMPLETA NO NÓ 'vendas_dia'
        await vendasRef.push(venda);

        // 2. ATUALIZA O ESTOQUE (Decremento)
        for (const item of venda.itens) {
            await estoqueRef.child(item.id).transaction((estoqueAtual) => {
                const quantidadeVendido = item.quantidade;
                
                if (estoqueAtual === null) {
                    console.warn(`Produto ${item.id} não encontrado no estoque, inicializando com 0 e debitando.`);
                    return -quantidadeVendido; 
                }
                
                return estoqueAtual - quantidadeVendido;
            });
        }
        
        return true;
    } catch (error) {
        console.error("Erro no Firebase ao salvar venda/atualizar estoque:", error);
        return false;
    }
}

/**
 * Atualiza o gasto total de um cliente no nó 'clientes_gastos'.
 */
window.atualizarGastoClienteNoFirebase = async function(nomeCliente, valor) {
    if (!nomeCliente) return;
    try {
        const chaveCliente = sanitizarChaveFirebase(nomeCliente);
        const ref = clientesGastosRef.child(chaveCliente);

        // 1. LER o valor atual do cliente UMA VEZ
        const snapshot = await ref.once('value');
        const dadosAtuais = snapshot.val();
        
        // 2. MODIFICAR o valor
        let novoTotal = valor;
        let nomeSalvo = nomeCliente;

        if (dadosAtuais && typeof dadosAtuais.total === 'number') {
            // Soma o novo valor ao total existente
            novoTotal = dadosAtuais.total + valor;
            nomeSalvo = dadosAtuais.nome || nomeCliente; // Mantém o nome original se existir
        } 
        // Se dadosAtuais for nulo ou total não for um número, inicia com o 'valor'

        // 3. ESCREVER o novo valor diretamente (set/update)
        await ref.set({ 
            total: novoTotal, 
            nome: nomeSalvo 
        });

        console.log(`Gasto do cliente ${nomeCliente} (chave: ${chaveCliente}) atualizado com sucesso.`);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar gasto do cliente:', error);
        // Não lançar o erro, apenas registrar para não travar a venda principal
        return false; 
    }
}

/**
 * Salva a venda detalhada na subcoleção 'vendas' do cliente.
 */
window.salvarVendaDetalhadaNoFirebase = async function(venda) {
    if (!venda.nome) return;
    try {
        const chaveCliente = sanitizarChaveFirebase(venda.nome);
        const ref = clientesGastosRef.child(chaveCliente).child('vendas');
        const novaVendaRef = ref.push();
        await novaVendaRef.set({
            abertura: venda.abertura,
            fechamento: venda.fechamento,
            id: venda.id,
            itens: venda.itens,
            pagamento: venda.pagamento,
            tipo: venda.tipo,
            total: venda.totalVenda
        });
        console.log('Venda detalhada salva no Firebase com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao salvar venda detalhada:', error);
        throw error;
    }
}


/**
 * Processa o fechamento de caixa, gerando relatório e zerando o nó 'vendas_dia'.
 * @returns {object} - Contém sucesso (boolean), relatorioHTML (string), vendas (array) e relatorioTXT (string).
 */
window.fecharCaixaERelatorio = async function() {
    try {
        const snapshot = await vendasRef.once('value');
        const vendasObj = snapshot.val();
        
        if (!vendasObj) {
            const relatorioVazioHTML = `
                <div class="text-center">
                    <h3>RESUMO DE FECHAMENTO (${new Date().toLocaleDateString('pt-BR')})</h3>
                    <p>Hora do Fechamento: ${new Date().toLocaleTimeString('pt-BR')}</p>
                    <hr>
                    <p class="text-muted">Nenhuma venda registrada desde o último fechamento.</p>
                </div>
            `;
            return { sucesso: true, relatorioHTML: relatorioVazioHTML, vendas: [], relatorioTXT: 'RELATÓRIO DE FECHAMENTO - Nenhuma venda registrada.' };
        }

        const vendasArray = Object.values(vendasObj);

        // 1. GERA RELATÓRIO E TOTALIZAÇÕES
        let totalDinheiro = 0;
        let totalCartaoDebito = 0;
        let totalCartaoCredito = 0;
        let totalPix = 0;
        let totalGeral = 0;
        let totalItensVendidos = 0;
        const resumoItens = {}; 

        vendasArray.forEach(venda => {
            totalGeral += venda.totalVenda || 0; 

            switch (venda.pagamento) {
                case 'Dinheiro': totalDinheiro += venda.totalVenda || 0; break;
                case 'Cartao_Debito': totalCartaoDebito += venda.totalVenda || 0; break;
                case 'Cartao_Credito': totalCartaoCredito += venda.totalVenda || 0; break;
                case 'Pix': totalPix += venda.totalVenda || 0; break;
            }

            venda.itens.forEach(item => {
                totalItensVendidos += item.quantidade;
                const nomeProduto = item.nome;
                
                if (!resumoItens[nomeProduto]) {
                    resumoItens[nomeProduto] = {
                        nomeOriginal: nomeProduto,
                        quantidade: 0
                    };
                }
                resumoItens[nomeProduto].quantidade += item.quantidade;
            });
        });
        
        const dataFechamento = new Date().toLocaleDateString('pt-BR');
        const horaFechamento = new Date().toLocaleTimeString('pt-BR');
        
        // 2. MONTAGEM DO RELATÓRIO HTML
        let relatorioHTML = `
            <h3>RESUMO DE FECHAMENTO (${dataFechamento})</h3>
            <p>Hora do Fechamento: ${horaFechamento}</p>
            <hr>
            
            <h4>Totalização por Pagamento</h4>
            <ul class="list-group mb-4">
                <li class="list-group-item d-flex justify-content-between">
                    <span>💵 Total em Dinheiro:</span>
                    <strong>R$ ${totalDinheiro.toFixed(2).replace('.', ',')}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                    <span>💳 Total em Débito:</span>
                    <strong>R$ ${totalCartaoDebito.toFixed(2).replace('.', ',')}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                    <span>💳 Total em Crédito:</span>
                    <strong>R$ ${totalCartaoCredito.toFixed(2).replace('.', ',')}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                    <span>📱 Total em PIX:</span>
                    <strong>R$ ${totalPix.toFixed(2).replace('.', ',')}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between list-group-item-success fw-bold">
                    <span>💰 TOTAL GERAL DE VENDAS:</span>
                    <strong>R$ ${totalGeral.toFixed(2).replace('.', ',')}</strong>
                </li>
            </ul>

            <h4>Resumo de Produtos Vendidos (${totalItensVendidos} itens)</h4>
            <table class="table table-striped table-sm">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const sortedItens = Object.entries(resumoItens)
            .sort(([, a], [, b]) => b.quantidade - a.quantidade);

        sortedItens.forEach(([nomeOriginal, dados]) => {
            relatorioHTML += `
                <tr>
                    <td>${dados.nomeOriginal}</td>
                    <td>${dados.quantidade}</td>
                </tr>
            `;
        });
        
        relatorioHTML += `
                </tbody>
            </table>
            
            <div class="alert alert-info mt-3">
                <small>
                    <strong>Informação:</strong> Relatório gerado automaticamente pelo sistema.
                    Total de ${vendasArray.length} vendas processadas.
                </small>
            </div>
        `;

        // 3. MONTAGEM DO RELATÓRIO TXT
        let relatorioTXT = `RELATÓRIO DE FECHAMENTO - ${dataFechamento} ${horaFechamento}\r\n`;
        relatorioTXT += `\r\n--- RESUMO DE VENDAS ---\r\n`;
        relatorioTXT += `Total Dinheiro: R$ ${totalDinheiro.toFixed(2)}\r\n`;
        relatorioTXT += `Total Débito: R$ ${totalCartaoDebito.toFixed(2)}\r\n`;
        relatorioTXT += `Total Crédito: R$ ${totalCartaoCredito.toFixed(2)}\r\n`;
        relatorioTXT += `Total PIX: R$ ${totalPix.toFixed(2)}\r\n`;
        relatorioTXT += `\r\nTOTAL GERAL: R$ ${totalGeral.toFixed(2)}\r\n`;
        relatorioTXT += `\r\n--- DETALHE DOS PRODUTOS ---\r\n`;

        sortedItens.forEach(([nomeOriginal, dados]) => {
            relatorioTXT += `${dados.quantidade}x ${dados.nomeOriginal}\r\n`;
        });
        relatorioTXT += `\r\n--- DETALHE DAS VENDAS ---\r\n`;

        vendasArray.forEach((venda, idx) => {
            relatorioTXT += `\r\n----------------------------------------\r\n`;
            relatorioTXT += `${idx+1}) ${venda.nome || 'Venda Rápida'} - R$ ${(venda.totalVenda || 0).toFixed(2)} - ${venda.pagamento || 'Não Informado'}\r\n`;
            venda.itens.forEach(item => {
                relatorioTXT += `   ${item.quantidade}x ${item.nome} (R$ ${item.preco.toFixed(2)})\r\n`;
            });
        });
        relatorioTXT += `\r\n----------------------------------------\r\n`;
        
        
        // 4. SALVA O RELATÓRIO NO HISTÓRICO
        const resumoItensParaFirebase = {};
        Object.entries(resumoItens).forEach(([nomeOriginal, dados]) => {
            const chaveSanitizada = sanitizarChaveFirebase(nomeOriginal);
            resumoItensParaFirebase[chaveSanitizada] = dados.quantidade;
        });
        
        const relatorioFechamento = {
            dataFechamento: new Date().toISOString(),
            totalGeral: totalGeral,
            totalVendas: vendasArray.length,
            totalItens: totalItensVendidos,
            detalhesPagamento: { 
                Dinheiro: totalDinheiro, 
                Debito: totalCartaoDebito, 
                Credito: totalCartaoCredito, 
                Pix: totalPix 
            },
            resumoItens: resumoItensParaFirebase
        };
        
        await historicoFechamentoRef.push(relatorioFechamento);

        // 5. ZERA O NÓ 'vendas_dia' (Prepara para o próximo dia)
        await vendasRef.set(null);

        // 6. Retorna todos os dados para o caixa.js usar.
        return { sucesso: true, relatorioHTML: relatorioHTML, vendas: vendasArray, relatorioTXT: relatorioTXT };

    } catch (error) {
        console.error("Erro no Firebase ao fechar caixa:", error);
        return { 
            sucesso: false, 
            relatorioHTML: `
                <div class="alert alert-danger">
                    <h4>Erro ao gerar relatório</h4>
                    <p>${error.message}</p>
                    <small>Verifique a conexão com o Firebase e tente novamente.</small>
                </div>
            `,
            vendas: [],
            relatorioTXT: `ERRO: ${error.message}`
        };
    }
}