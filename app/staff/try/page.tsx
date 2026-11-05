import { getOutreach } from "@/lib/outreach/server";
import { staffOrRedirect } from "../guard";
import { TextSimulator } from "./TextSimulator";
import { CallSimulator } from "./CallSimulator";

export const metadata = { title: "Try the text and phone line" };

export default async function TryPage() {
  await staffOrRedirect();
  const { cfg } = getOutreach();
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Try the text and phone line</h1>
      <p>
        These run the same code as the real line, using the live directory. Use a made-up number in the 555-01xx range.
        {cfg.live
          ? " Outreach is live, so this is a dry run: sign-ups and opt-outs are only described, never saved."
          : " In simulated mode, sign-ups, YES replies and STOP are saved, so you can try the whole flow. Nothing is sent."}
      </p>
      <TextSimulator />
      <CallSimulator />
    </div>
  );
}
