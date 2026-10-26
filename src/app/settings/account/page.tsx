import { SettingsShell } from "../SettingsShell";
import { AccountSettings } from "./AccountSettings";

export default function AccountSettingsPage() {
  return (
    <SettingsShell tab="account">
      <AccountSettings />
    </SettingsShell>
  );
}
