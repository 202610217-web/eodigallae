import { SettingsShell } from "../SettingsShell";
import { ProfileSettings } from "./ProfileSettings";

export default function ProfileSettingsPage() {
  return (
    <SettingsShell tab="profile">
      <ProfileSettings />
    </SettingsShell>
  );
}
