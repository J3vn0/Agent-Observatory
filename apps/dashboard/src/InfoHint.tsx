import { Info } from "lucide-react";

export function InfoHint({
  label,
  description,
  meta = [],
}: {
  label: string;
  description: string;
  meta?: string[];
}) {
  return (
    <span
      className="info-hint"
      tabIndex={0}
      aria-label={label + ": " + description}
    >
      <Info size={13} aria-hidden="true" />
      <span className="info-tooltip" role="tooltip">
        <strong>{label}</strong>
        <span>{description}</span>
        {meta.length > 0 && (
          <small>{meta.filter(Boolean).join(" · ")}</small>
        )}
      </span>
    </span>
  );
}
