import { redirect } from "next/navigation";

// The landing page (with the real "Get a proposal" form) is Phase 3 — it needs the
// Resend key. Until then, the root opens on the overview; the pipeline is at /leads.
export default function Home() {
  redirect("/dashboard");
}
