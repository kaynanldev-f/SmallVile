import { ReactNode } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  icon?: ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonClassName?: string;
  cancelButtonClassName?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  hideCloseButton?: boolean;
}

export interface SuccessModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose?: () => void;
}

export interface MovieCardProps {
  movie: {
    title: string;
    genre: string;
    classification: string;
    image: string;
  };
}

export interface SuportButtonProps {
  phone: string;
  message?: string;
}
