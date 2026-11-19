import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type MembersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  /** Hides the Add member button for users who may not create members. */
  canAdd: boolean;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function MembersToolbar({ search, onSearchChange, onAdd, canAdd }: MembersToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 sm:max-w-sm">
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, username or role"
          startIcon={<SearchIcon />}
          aria-label="Search members"
        />
      </div>
      {canAdd && (
        <Button onClick={onAdd}>
          <PlusIcon />
          Add member
        </Button>
      )}
    </div>
  );
}