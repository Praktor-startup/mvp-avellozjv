# Prompt para o Claude Design — Redesign da plataforma Avelloz (tons de laranja)

> Cole TUDO abaixo (a partir de "Você é um designer de produto...") em https://claude.ai/design.
> Ao terminar, me devolva o link/bundle do design que eu implemento pixel-perfect em React (dinâmico).

---

Você é um designer de produto sênior. Redesenhe a interface de um sistema web de **gestão comercial para concessionária de motos** chamado **Avelloz** (loja: "Avelloz Motos Torre — João Pessoa"). O sistema já existe e funciona; o objetivo é elevar o acabamento visual para um nível premium (referências: Linear, Vercel, Stripe Dashboard), mantendo a operação simples e rápida para uso diário de vendedores e gestores.

## Identidade de marca (obrigatória)

- **Laranja Avelloz `#F26B21`** — cor primária (ações, destaques, marca). É a mesma cor da página de vendas pública da loja.
- **Azul Avelloz `#1B2A8B`** — cor secundária / institucional (cabeçalhos escuros, contraste, gráficos).
- Neutros: cinza-ardósia (slate) para texto e bordas; fundo claro `#f8fafc`.
- Tipografia: Geist / Inter (sans), pesos 400–700. Números tabulares nas métricas.
- Cantos arredondados generosos (raio ~12px), sombras multicamada sutis, micro-interações suaves.
- Suporte a estados: aprovado (verde), restrição/atenção (âmbar), negado/perda (vermelho) — sempre legíveis ao lado do laranja.
- Logo: ícone de moto + wordmark "Avelloz".

## Princípios

- Operacional acima de estético: telas densas de dados precisam respirar mas caber muita informação.
- Mobile-first real: vendedores usam no balcão pelo celular. Cards no mobile, tabela no desktop.
- Hierarquia clara: 1 ação primária laranja por tela; o resto neutro.
- Sem lorem ipsum — use os dados reais abaixo.

## Telas a desenhar (gere todas, formando um design system coeso)

### 1. Login / Portal de acesso
- Card central, marca Avelloz no topo, abas "Entrar" / "Criar conta".
- Campos e-mail + senha; botão primário laranja "Entrar".
- Atalho discreto "Entrar como Demo".
- Fundo com leve textura/gradiente laranja-azul.

### 2. Dashboard (gestor)
- Cabeçalho com data ("segunda-feira, 15 de junho") e título "Dashboard".
- 4 cards-métrica hero: **Vendas fechadas**, **Aprovações**, **Reconsultas pendentes**, **Entradas na loja** (valores ex.: 12 / 28 / 5 / 47).
- **Funil de conversão** visual (barras horizontais com %): Entradas na loja → Atendidos por vendedor → Consultas de crédito → Aprovados → Vendas fechadas. Mostre taxas: Atendimento, Consulta, Aprovação, Fechamento, Perda.
- Painel "Reconsultas pendentes" (lista) + "Últimos atendimentos".

### 3. Atendimentos (lista)
- Filtros colapsáveis (status, vendedor, busca por nome/CPF).
- Desktop: tabela (Cliente, CPF, Vendedor, Moto, Status colorido, Entrada). Mobile: cards.
- Botão primário laranja "Novo atendimento".
- Dados reais ex.: clientes com motos **Avelloz AZ160 / AZ125 / AZ1 (AZ100)**; status como "Consulta aprovada", "Consulta com restrição", "Venda fechada".

### 4. Novo atendimento (formulário)
- Campos: Nome, CPF, Telefone/WhatsApp, Vendedor responsável, Tipo de moto, Status, Observações.
- Quando status = restrição/negado: destaque um aviso de que será gerada **reconsulta automática em 21 dias** vinculada ao mesmo vendedor.

### 5. Detalhe do atendimento
- Cabeçalho com cliente + status colorido + dados.
- Linha do tempo de **consultas de crédito** (data, resultado: aprovado/restrição/negado, anexo).
- Quando "Consulta aprovada": seção "Desfecho da venda" (fechou / não fechou).
- Ações: registrar consulta, editar.

### 6. Equipe (gestor)
- Título "Equipe", subtítulo "2 gestores/técnico · 2 vendedores".
- Cards de membro com badge de papel colorido: **Gestor** (azul/escudo), **Técnico** (âmbar/chave), **Vendedor** (cinza/usuário).
- Exibir nome, e-mail, telefone, CPF. Botão "Nova conta" (laranja) e "Remover acesso".
- Dados reais ex.: "João Paulo Chaves — Gestor", "Demo Avelloz — Técnico (você)", "Heverton Breno Sabino da Silva — Vendedor", "Edylaine dos Santos Ponciano — Vendedor".

### 7. Navegação (sidebar)
- Sidebar vertical com logo Avelloz + nome da loja ativa abaixo.
- Itens: Dashboard, Atendimentos, Lembretes, Leads, Captação (QR), Relatórios, Equipe, Vendedores, Tipos de Moto, Status, Motivos de Perda.
- Item ativo com destaque laranja. Rodapé: "Tutorial" + "Sair".
- Mostre também a variante de vendedor (menu enxuto: só Dashboard, Atendimentos, Lembretes, Relatórios).

## Componentes do design system
Botões (primário laranja / secundário neutro / destrutivo), inputs e selects, badges de status (aprovado/restrição/negado/pendente), cards, tabela, barras de funil, navegação ativa, estados vazios ("Nenhum atendimento ainda"), diálogos/modais, toast de sucesso/erro.

## Entregue
Telas em HTML responsivo + a paleta/tokens (cores, tipografia, raio, sombras) documentados, para eu reimplementar em React/Tailwind. Foco em consistência entre as telas.
