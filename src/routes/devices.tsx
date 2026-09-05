import { createFileRoute } from "@tanstack/react-router";
import { PosShell } from "@/components/pos/PosShell";
import { DevicePairing } from "@/components/pos/DevicePairing";

export const Route = createFileRoute("/devices")({
  head: () => ({
    meta: [
      { title: "Device Sync — Hotel Kusum Palace POS" },
      {
        name: "description",
        content:
          "Link this phone, tablet or counter PC to Hotel Kusum Palace POS so tables, bills, stock and kitchen tickets stay the same on every device.",
      },
      { property: "og:title", content: "Device Sync — Hotel Kusum Palace POS" },
      {
        property: "og:description",
        content: "Pair every staff device with one shop key and keep working offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PosShell allow={["owner", "manager", "cook", "waiter", "helper"]}>
      <div className="mx-auto max-w-[720px] space-y-4 p-3 lg:p-5">
        <h1 className="font-display text-2xl">Device sync</h1>
        <DevicePairing />
      </div>
    </PosShell>
  ),
});
