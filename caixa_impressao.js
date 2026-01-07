// ====================================================================
// IMPRESSÃO TÉRMICA 58mm - RELATÓRIOS E PEDIDOS (SEM FECHAR JANELA)
// ====================================================================

window.imprimirRelatorio = function(relatorioHTML) {
    if (!relatorioHTML) {
        const modal = document.getElementById("relatorioModalBody");
        if (modal) {
            relatorioHTML = modal.innerHTML;
        } else {
            console.warn("Nenhum conteúdo para imprimir!");
            return;
        }
    }

    const printWindow = window.open('', '_blank', 'height=600,width=400,left=100,top=100');

    const printStyles = `
        <style>
            @page { 
                size: 58mm auto; 
                margin: 0; 
            }
            * {
                box-sizing: border-box;
            }
            html, body {
                width: 58mm !important;
                min-width: 58mm !important;
                max-width: 58mm !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: 'Courier New', monospace, sans-serif;
                font-size: 10px !important;
                line-height: 1.2;
            }
            body { 
                padding: 3mm !important;
            }
            h1, h2, h3, h4 {
                font-weight: bold !important;
                margin: 3px 0 !important;
                padding: 0 !important;
                text-align: center;
                width: 100%;
            }
            h2 { 
                font-size: 12px !important; 
            }
            h3 { 
                font-size: 11px !important; 
            }
            h4 { 
                font-size: 10px !important; 
            }
            p, div, span {
                margin: 2px 0 !important;
                padding: 0 !important;
                font-size: 10px !important;
            }
            table {
                width: 100% !important;
                font-size: 9px !important;
                border-collapse: collapse;
                margin: 4px 0 !important;
            }
            th, td {
                padding: 2px 1px !important;
                text-align: left;
            }
            th {
                font-weight: bold !important;
                border-bottom: 1px solid #000;
            }
            td {
                border-bottom: 0.5px dotted #ccc;
            }
            hr { 
                border: none;
                border-top: 1px dashed #000; 
                margin: 5px 0 !important; 
            }
            ul, ol { 
                padding-left: 15px !important; 
                margin: 3px 0 !important;
            }
            li { 
                margin: 2px 0 !important;
            }
            .total-container {
                margin-top: 5px !important;
                padding-top: 3px !important;
                border-top: 1px solid #000;
                text-align: left !important;
                width: 100%;
            }
            .valor-total {
                font-weight: bold !important;
                font-size: 11px !important;
                text-align: left !important;
                display: block;
                width: 100%;
            }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .no-print, .modal-footer, .btn, button, .modal-header { 
                display: none !important; 
            }
            .badge {
                background: #f8f9fa !important;
                border: 1px solid #000 !important;
                padding: 1px 4px !important;
                font-size: 8px !important;
            }
        </style>
    `;

    // Limpar e formatar o conteúdo do relatório
    let conteudoFormatado = relatorioHTML
        .replace(/<h1[^>]*>/gi, '<h2>')
        .replace(/<\/h1>/gi, '</h2>')
        .replace(/<h3[^>]*>/gi, '<h3>')
        .replace(/<\/h3>/gi, '</h3>')
        .replace(/font-size:[^;"]*;?/gi, '')
        .replace(/<strong>/gi, '<span style="font-weight: bold !important;">')
        .replace(/<\/strong>/gi, '</span>');

    printWindow.document.write(`
        <html>
        <head>
            <title>Relatório Bar do Ceará</title>
            ${printStyles}
        </head>
        <body>
            <div style="text-align: center; margin-bottom: 5px;">
                <h2>BAR DO CEARÁ</h2>
                <div style="font-size: 10px;">RELATÓRIO DE VENDAS</div>
                <div style="font-size: 9px;">${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            <hr>
            ${conteudoFormatado}
            <br><br><br>
            <script>
                window.onload = function() {
                    window.focus();
                    setTimeout(function() {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
};

// ====================================================================
// FUNÇÃO PARA IMPRIMIR PEDIDO TÉRMICO 58mm - CORRIGIDA
// ====================================================================

window.imprimirPedido = function(venda) {
    if (!venda) {
        console.warn("Objeto venda não informado!");
        return;
    }

    let itensHTML = '';
    let subtotal = 0;
    
    venda.itens.forEach(item => {
        const totalItem = (item.quantidade * item.preco);
        subtotal += totalItem;
        const totalFormatado = totalItem.toFixed(2).replace('.', ',');
        const precoUnit = item.preco.toFixed(2).replace('.', ',');
        
        // Formatação mais simples para caber na largura
        itensHTML += `
            <tr>
                <td>${item.quantidade}x</td>
                <td>${item.nome.substring(0, 18)}</td>
                <td style="text-align: right;">R$ ${totalFormatado}</td>
            </tr>
        `;
    });

    const totalVenda = venda.totalVenda || subtotal;
    const totalFormatado = totalVenda.toFixed(2).replace('.', ',');

    const printWindow = window.open('', '_blank', 'height=600,width=400,left=100,top=100');

    const printStyles = `
        <style>
            @page { 
                size: 58mm auto; 
                margin: 0; 
            }
            * {
                box-sizing: border-box;
            }
            html, body {
                width: 58mm !important;
                min-width: 58mm !important;
                max-width: 58mm !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: 'Courier New', monospace, sans-serif;
                font-size: 11px !important;
                line-height: 1.3;
            }
            body { 
                padding: 3mm !important;
            }
            .cabecalho { 
                text-align: center; 
                margin-bottom: 5px; 
                border-bottom: 1px dashed #000;
                padding-bottom: 3px;
            }
            .cabecalho h2 { 
                margin: 0 !important; 
                font-size: 13px !important;
                font-weight: bold !important;
            }
            .info-pedido {
                margin: 3px 0;
                padding: 2px 0;
                font-size: 10px !important;
            }
            hr { 
                border: none;
                border-top: 1px dashed #000; 
                margin: 4px 0 !important; 
            }
            table {
                width: 100% !important;
                font-size: 10px !important;
                border-collapse: collapse;
                margin: 4px 0 !important;
            }
            th, td {
                padding: 2px 1px !important;
                text-align: left;
                vertical-align: top;
            }
            th {
                font-weight: bold !important;
                border-bottom: 1px solid #000;
                font-size: 10px !important;
            }
            td {
                border-bottom: 0.5px dotted #ccc;
            }
            .total-container {
                margin-top: 6px !important;
                padding-top: 4px !important;
                border-top: 1px solid #000;
                text-align: left !important;
                width: 100%;
            }
            .valor-total {
                font-weight: bold !important;
                font-size: 12px !important;
                text-align: left !important;
                display: block;
                width: 100%;
                margin: 3px 0 !important;
            }
            .rodape { 
                text-align: center; 
                margin-top: 6px; 
                font-size: 9px !important;
                border-top: 1px dashed #000;
                padding-top: 3px;
            }
        </style>
    `;

    const content = `
        <div class="cabecalho">
            <h2>BAR DO CEARÁ</h2>
            <div style="font-size: 11px;">** PEDIDO **</div>
        </div>
        
        <div class="info-pedido">
            <div><strong>Cliente:</strong> ${venda.nome || 'MESA'}</div>
            <div><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        
        <hr>
        
        <table>
            <thead>
                <tr>
                    <th>Qtd</th>
                    <th>Produto</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itensHTML}
            </tbody>
        </table>
        
        <hr>
        
        <div class="total-container">
            <div class="valor-total">TOTAL: R$ ${totalFormatado}</div>
        </div>
        
        <div style="margin-top: 4px; font-size: 10px;">
            <strong>Pagamento:</strong> ${venda.pagamento || 'Não informado'}
        </div>
        
        <div class="rodape">
            Obrigado pela preferência!
        </div>
        
        <br><br><br>
    `;

    printWindow.document.write(`
        <html>
        <head>
            <title>Cupom Pedido</title>
            ${printStyles}
        </head>
        <body>
            ${content}
            <script>
                window.onload = function() {
                    window.focus();
                    setTimeout(function() {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
};