import { handleAiGenerationRequest } from "@/lib/ai-generation-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleAiGenerationRequest(request, "BRIEF");
}
