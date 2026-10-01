"use client";

import { Component, ReactNode } from "react";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneOutlined";

/** Cerca em volta do sino. */
interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export default class NotificationBellBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[notificações] falha ao renderizar o sino", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <span
          title="Não foi possível carregar as notificações."
          aria-label="Notificações indisponíveis"
          className="flex items-center text-white/40"
        >
          <NotificationsIcon className="text-[22px] sm:text-[26px]" />
        </span>
      );
    }

    return this.props.children;
  }
}
