/** Seções do dashboard. */
export interface AdminSection {
  href: string;
  label: string;
  description: string;
  ready: boolean;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/movies",
    label: "Filmes",
    description: "Cadastrar, editar e remover filmes em cartaz.",
    ready: true,
  },
  {
    href: "/admin/cinemas",
    label: "Cinemas",
    description: "Unidades, endereços e os filmes em cartaz de cada cinema.",
    ready: true,
  },
  {
    href: "/admin/sessions",
    label: "Sessões",
    description: "Horários, idioma, tipo de sala e preço do ingresso.",
    ready: true,
  },
  {
    href: "/admin/sales-control",
    label: "Controle de vendas",
    description:
      "Preços de inteira e meia, regras por dia e período de venda das sessões.",
    ready: true,
  },
  {
    href: "/admin/products",
    label: "Produtos",
    description: "Itens da bomboniere, preços e disponibilidade.",
    ready: true,
  },
  {
    href: "/admin/stock",
    label: "Estoque",
    description: "Quantidade disponível de cada produto.",
    ready: true,
  },
  {
    href: "/admin/orders",
    label: "Pedidos",
    description: "Todos os pedidos, com usuário, itens e valores.",
    ready: true,
  },
  {
    href: "/admin/tickets",
    label: "Ingressos",
    description: "Ingressos emitidos por usuário, sessão e assento.",
    ready: true,
  },
  {
    /** A fila de análise dos reembolsos. */
    href: "/admin/refunds",
    label: "Reembolsos",
    description:
      "Solicitações de reembolso dos clientes, para aprovar ou recusar.",
    ready: true,
  },
  {
    href: "/admin/analytics",
    label: "Relatórios",
    description: "Receita, ingressos, filmes, cinemas e produtos por período.",
    ready: true,
  },
  {
    href: "/admin/users",
    label: "Usuários",
    description:
      "Clientes cadastrados, com contato, cidade e data de cadastro.",
    ready: true,
  },
  {
    /** DENTRO DE `/admin` DE PROPÓSITO. */
    href: "/admin/notifications",
    label: "Notificações",
    description:
      "Vendas novas, pagamentos aguardando análise e alertas de estoque.",
    ready: true,
  },
];
