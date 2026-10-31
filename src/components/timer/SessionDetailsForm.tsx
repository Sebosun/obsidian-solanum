import { TagField } from "@/components/timer/TagField";
import { NoteField } from "@/components/timer/NoteField";

export function SessionDetailsForm() {
  return (
    <div className="solanum-session-details">
      <TagField />
      <NoteField />
    </div>
  );
}
