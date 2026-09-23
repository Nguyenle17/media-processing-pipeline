import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  danger?: boolean;
  children?: ReactNode;
}

export default function Modal({ isOpen, onClose, title, description, onConfirm, confirmText = 'Confirm', danger = false, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="vs-modal-overlay" onClick={onClose}>
      <div className="vs-modal" onClick={(e) => e.stopPropagation()}>
        {title && <div className="vs-modal-title">{title}</div>}
        {description && <div className="vs-modal-desc">{description}</div>}
        {children}
        <div className="vs-modal-actions">
          <button className="vs-modal-btn vs-modal-btn--cancel" onClick={onClose}>Cancel</button>
          {onConfirm && (
            <button className={`vs-modal-btn ${danger ? 'vs-modal-btn--danger' : 'vs-modal-btn--confirm'}`} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
