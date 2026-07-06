import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface AIConsentModalProps {
  open: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

export function AIConsentModal({ open, onAgree, onDecline }: AIConsentModalProps) {
  return (
    <Modal open={open} onClose={onDecline} title="AI Assistant & Your Data">
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-sm text-[var(--text-primary)]" style={{ lineHeight: 1.6 }}>
          MomManager's AI features (the AI Assistant chat, meal plans, recipes, activity
          suggestions, and self-care advice) are powered by <strong>Anthropic</strong>, a
          third-party AI service.
        </p>
        <p className="text-sm text-[var(--text-secondary)]" style={{ lineHeight: 1.6 }}>
          To generate a response, we send Anthropic the message or request you type, along
          with any relevant details you've entered for that feature — for example a child's
          name and age for a meal plan, dietary preferences, skin type, or weight/goal figures
          for self-care advice. We do <strong>not</strong> send your account credentials,
          payment details, or any data from features you haven't used.
        </p>
        <p className="text-xs text-[var(--text-muted)]" style={{ lineHeight: 1.5 }}>
          You can change your mind at any time in Settings → AI Assistant. Declining only
          disables AI features — the rest of MomManager works normally either way.
        </p>
        <div className="flex gap-3 w-full mt-1">
          <Button variant="secondary" className="flex-1" onClick={onDecline}>
            Not Now
          </Button>
          <Button variant="primary" className="flex-1" onClick={onAgree}>
            I Agree, Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
