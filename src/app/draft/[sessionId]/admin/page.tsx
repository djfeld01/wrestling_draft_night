import { AdminDraftClient } from "./admin-draft-client";

export default async function AdminDraftPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <AdminDraftClient sessionId={sessionId} />;
}
