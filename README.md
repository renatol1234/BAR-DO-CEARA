# 🍻 Bar do Ceará - Sistema de Gerenciamento

Sistema completo para gerenciamento de caixa, controle de estoque e fiado para estabelecimentos comerciais.

## 📋 Visão Geral

Este projeto é um sistema web integrado para gerenciamento de bar/restaurante com as seguintes funcionalidades principais:

- **Sistema de Caixa**: Venda rápida e controle de clientes fichados
- **Controle de Estoque**: Entrada/saída de produtos com relatórios
- **Controle de Fiado**: Gerenciamento de crédito para clientes

## 🚀 Funcionalidades

### 💰 Sistema de Caixa (`caixa.html`)
- Venda rápida para clientes avulsos
- Controle de clientes fichados (1-20)
- Seleção de produtos por categorias
- Finalização com múltiplas formas de pagamento (Dinheiro, Cartão, PIX, Fiado)
- Fechamento de caixa com relatório diário
- Impressão de pedidos

### 📊 Controle de Estoque (`controle.html`)
- Lançamento de entrada de produtos (compras/reposição)
- Visualização do estoque atual em tempo real
- Categorização de produtos (cervejas, bebidas quentes, porções, etc.)
- Relatórios de vendas (semanal e mensal)
- Lista de produtos mais vendidos
- Top clientes por gasto

### 📒 Controle de Fiado (`Fiado.html`)
- Cadastro e acompanhamento de clientes com crédito
- Histórico completo de compras fiadas e pagamentos
- Cálculo automático de saldo pendente
- Registro de pagamentos recebidos
- Filtro por nome do cliente

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Framework CSS**: Bootstrap 5.3
- **Backend/DB**: Firebase Realtime Database
- **Autenticação**: Sistema de senha local
- **Impressão**: API de impressão do navegador

## 🔧 Configuração

### 1. Firebase Configuration
Atualize as configurações do Firebase em cada arquivo com suas credenciais:

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    databaseURL: "SUA_DATABASE_URL",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID",
    measurementId: "SEU_MEASUREMENT_ID"
};
```

### 2. Senhas de Acesso
As senhas padrão para acesso são:
- **Sistema de Caixa**: `mvlima3646`
- **Controle de Estoque**: `mvlima3646`
- **Controle de Fiado**: `123456`

### 3. Estrutura de Dados no Firebase
O sistema utiliza a seguinte estrutura:

```
/bar-do-ceara/
├── estoque_atual/        # Quantidades atuais de cada produto
├── clientes_gastos/      # Clientes e total gasto
├── vendas_fiado/         # Vendas em fiado registradas
├── fiado_pagamentos/     # Pagamentos recebidos de fiados
├── movimentacoes/        # Entradas de estoque (compras)
├── vendas_dia/           # Vendas diárias (não-fiado)
└── historico_caixa/      # Fechamentos de caixa
```

## 📁 Estrutura de Arquivos

```
📦 bar-do-ceara
├── 📄 caixa.html          # Sistema principal de vendas
├── 📄 caixa.js            # Lógica do caixa
├── 📄 caixa_firebase.js   # Integração Firebase
├── 📄 caixa_impressao.js  # Funções de impressão
├── 📄 caixa_log.js        # Log de atividades
├── 📄 produtos.js         # Lista de produtos
├── 📄 controle.html       # Controle de estoque
├── 📄 Fiado.html          # Controle de fiados
└── 📄 README.md           # Este arquivo
```

## 🎯 Categorias de Produtos

O sistema organiza produtos em 12 categorias principais:

1. **🍺 Cervejas Geladas** (Cristal, Império, Skol, Brahma, etc.)
2. **🥃 Bebidas Quentes** (Cachaças, vodkas, licores)
3. **🥃 Whisky** (Natu Nobilis, Jack James, Ballantines, etc.)
4. **🍸 Gin** (RM'S, Royal, Tropical, sabores diversos)
5. **🍹 Askov** (Sabores diversos em diferentes tamanhos)
6. **🧪 Corotes** (Sabores: limão, melancia, maracujá, etc.)
7. **🧃 Refrigerantes** (Coca-Cola, Fanta, Sprite, águas)
8. **⚡ Energéticos** (Monster, TNT, Baly, Mansão)
9. **🥂 Gelos** (Sabores: cocô, maçã verde, melancia)
10. **🍬 Balas/Salgadinhos** (Chicletes, balas, doces)
11. **🍖 Porções** (Batata, calabresa, salgados, frango)
12. **🚬 Cigarro/Fichas** (Cigarros, palheiro, seda, fichas de sinuca)

## 🔐 Segurança

- Acesso restrito por senha em todos os módulos
- Senha de administrador para fechamento de caixa
- Dados sensíveis armazenados com segurança no Firebase
- Sistema de permissões por função

## 🖨️ Impressão

O sistema suporta impressão de:
- Pedidos individuais
- Relatório de fechamento de caixa
- Histórico de vendas

## 📱 Responsividade

Interface adaptável para:
- Desktop (telas grandes)
- Tablets (telas médias)
- Smartphones (telas pequenas)

## 🔄 Fluxo de Trabalho

1. **Venda**: Atender cliente no caixa → selecionar produtos → finalizar venda
2. **Estoque**: Repor produtos → registrar entrada → acompanhar níveis
3. **Fiado**: Autorizar cliente → registrar venda fiado → receber pagamento

## ⚠️ Considerações Importantes

1. **Backup**: Realize backup periódico dos dados do Firebase
2. **Conexão**: Sistema requer conexão com internet para funcionamento completo
3. **Navegador**: Recomendado Chrome/Edge atualizado
4. **Impressora**: Configure impressora térmica para melhor experiência

## 📞 Suporte

Para suporte ou dúvidas:
- Verifique a configuração do Firebase
- Confirme as senhas de acesso
- Verifique a conexão com a internet
- Consulte o console do navegador para erros

## 📄 Licença

© 2024 Bar do Ceará. Todos os direitos reservados.

---

*Sistema desenvolvido para otimizar o gerenciamento do Bar do Ceará, proporcionando controle eficiente de vendas, estoque e fiados.*
