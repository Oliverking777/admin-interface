import Button from "@/components/ui/Button";

type OrderCardActionsProps = {
  /** Shown only when allowed: the page decides with useOrderAbilities / canCancelOrder. */
  canCancel: boolean;
  canComplete: boolean;
  onCancel: () => void;
  onComplete: () => void;
  className?: string;
};

/** Actions on a PENDING order. Renders nothing when the user may do neither. */
export default function OrderCardActions({ canCancel, canComplete, onCancel, onComplete, className }: OrderCardActionsProps) {
  if (!canCancel && !canComplete) return null;

  return (
    <div className={className ?? "mt-2 flex gap-2"}>
      {canCancel && (
        <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      )}
      {canComplete && (
        <Button size="sm" className="flex-1" onClick={onComplete}>
          Complete sale
        </Button>
      )}
    </div>
  );
}