# Pedido v2 ao Claude Design — transformar TODA a plataforma (claro/premium, laranja)

> Antes de colar o texto: no Claude Design, use **Import → link local codebase** e aponte
> para o repositório do app (`C:/Users/Eduardo/Projetos/mvp-avelloz`, branch de produção).
> Assim ele enxerga TODAS as telas e o design system já existente, e transforma tudo de forma coesa.

---

Importei o codebase da plataforma **Avelloz** (Next.js 14 + Tailwind + shadcn/ui), um sistema de gestão comercial para uma concessionária de motos (loja "Avelloz Motos Torre — João Pessoa"). Quero que você **redesenhe TODAS as telas** elevando para um nível premium e **CLARO** (referências: Linear, Vercel, Stripe Dashboard), mantendo a operação simples e rápida para vendedores e gestores.

CRÍTICO — o que NÃO quero:
- NADA de cabeçalho/hero escuro no dashboard nem em outras telas. A versão atual tem uma faixa escura no topo do dashboard — substitua por um topo CLARO (branco/neutro), como nos seus mockups anteriores. Tema 100% claro.
- Não é só trocar a cor de acento — quero o **layout e o acabamento** repensados, tela a tela.

IDENTIDADE (manter):
- Laranja Avelloz #F26B21 = primária (ações, marca, item de menu ativo). Azul Avelloz #1B2A8B = secundária/institucional e gráficos. Neutros slate; fundo claro #f8fafc; borda #e7ebf0.
- Tipografia Geist + Geist Mono (números tabulares). Raio ~12px, sombras multicamada sutis, micro-interações.
- Estados: aprovado verde #16a34a, restrição/atenção âmbar #d97706, negado/perda vermelho #dc2626, pendente cinza/azul.
- Badges de papel: **Gestor = AZUL** (escudo), **Técnico = âmbar** (chave), **Vendedor = cinza** (usuário). (Importante distinguir Gestor de Técnico por cor.)

PRINCÍPIOS: operacional acima de estético; mobile-first real (cards no mobile, tabela no desktop); 1 ação primária laranja por tela; sem lorem ipsum (use motos Avelloz AZ160/AZ125/AZ1, nomes reais: João Paulo, Demo, Heverton, Edylaine).

TELAS A REDESENHAR (todas as rotas do app — cobrir o conjunto inteiro):
- /login — portal Entrar/Criar conta + acesso Demo (o gradiente laranja→azul de fundo ficou ótimo, manter)
- /dashboard — 4 métricas (Vendas fechadas, Aprovações, Reconsultas pendentes, Entradas na loja), funil de conversão em barras com % (Entradas→Atendidos→Consultas→Aprovados→Vendas; escalonar a cor azul→laranja→verde), painéis "Reconsultas pendentes" e "Últimos atendimentos" — TUDO em tema claro
- /atendimentos — lista com filtros colapsáveis (status, vendedor, busca nome/CPF); tabela no desktop, cards no mobile
- /atendimentos/novo e /atendimentos/[id]/editar — formulário (Nome, CPF, Telefone, Vendedor, Tipo de moto, Status, Observações); aviso de reconsulta automática em 21 dias quando restrição/negado
- /atendimentos/[id] — detalhe: cabeçalho + status; timeline de consultas de crédito (aprovado/restrição/negado, anexo); seção "Desfecho da venda" quando aprovado
- /lembretes — reconsultas/cobranças pendentes (lista por data, vendedor vinculado)
- /leads — inbox de leads captados (contato + origem) + converter em atendimento
- /origens — captação por QR: criar origem, gerar/baixar QR, métricas de scan
- /relatorios — desempenho por vendedor (funil + taxas)
- /equipe — gestor/técnico: cards de membro com badges de papel, "Nova conta" (laranja), "Remover acesso"
- /vendedores, /motos, /status, /motivos-perda — telas de configuração (CRUD simples, consistentes)
- Sidebar — logo Avelloz + nome da loja ativa; item ativo laranja; rodapé Tutorial + Sair. Variante de vendedor com menu enxuto (Dashboard, Atendimentos, Lembretes, Relatórios).

COMPONENTES (design system coeso): botões (primário laranja/secundário/destrutivo/ghost), inputs/selects, badges de status e de papel, cards, tabela, barras de funil, navegação ativa, estados vazios, modais, toasts.

ENTREGUE: as telas em HTML responsivo (desktop + mobile) + tokens documentados (cores, tipografia, raio, sombras), para eu reimplementar em React/Tailwind no codebase. Consistência total entre telas, tema claro.
