import { usePreferences, useUpdatePreferences } from "./hooks";
import { Card } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { CheckboxField } from "../../components/fields";

export function NotificationSettingsCard() {
  const { data } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  if (!data) return null;

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Text message reminders</h2>
      <p className="mt-1 text-sm text-stone-500">
        We text you a day before and an hour before each session, and when you get a new message. Texts only say
        &ldquo;Mind Hub&rdquo;, the time, and a link. They never include your therapist&apos;s name or why you&apos;re meeting.
      </p>
      <div className="mt-3">
        <CheckboxField
          id="smsNotificationsEnabled"
          label="Send me text message reminders"
          checked={data.preferences.smsNotificationsEnabled}
          disabled={updatePreferences.isPending}
          onChange={(e) => updatePreferences.mutate({ smsNotificationsEnabled: e.target.checked })}
        />
      </div>
      {updatePreferences.isError && (
        <Alert variant="error" className="mt-3">
          Couldn&apos;t save that change. Please try again.
        </Alert>
      )}
    </Card>
  );
}
