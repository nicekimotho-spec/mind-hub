import { useCareTeam } from "../careTeam/hooks";
import { SelectField } from "../../components/fields";

/** "Who can see this?" for a toolkit item: only the client, or the client and one
 * therapist from their care team. */
export function ShareSelect({ id, value, onChange }: { id: string; value: string | null; onChange: (value: string | null) => void }) {
  const { data } = useCareTeam();
  const members = data?.members ?? [];

  return (
    <SelectField
      id={id}
      label="Who can see this?"
      hint={members.length === 0 ? "After your first session, you can choose to share with your therapist." : undefined}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={members.length === 0}
    >
      <option value="">Only me</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          Me and {member.fullName}
        </option>
      ))}
    </SelectField>
  );
}

/** A short label for list views: "Private" or "Shared with Brian". */
export function useShareLabel(): (sharedWithTherapistId: string | null) => string {
  const { data } = useCareTeam();
  return (sharedWithTherapistId) => {
    if (!sharedWithTherapistId) return "Private";
    const member = data?.members.find((m) => m.id === sharedWithTherapistId);
    return member ? `Shared with ${member.fullName}` : "Shared with your therapist";
  };
}
