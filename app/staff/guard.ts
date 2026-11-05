import "server-only";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/outreach/staff-session";

/** For staff pages: send anyone not signed in to the sign-in page. */
export async function staffOrRedirect(): Promise<string> {
  const who = await currentStaff();
  if (!who) redirect("/staff");
  return who;
}
