import { DisplayClient } from "./display-client";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <DisplayClient sessionId={sessionId} />;
}
