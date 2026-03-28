type ReportRequest = {
  fileName?: string;
  analysis: {
    pathology: string;
    confidence: number;
    insight?: string;
    pixels?: number;
    area?: number;
    modelUsed?: string;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function buildPrompt(body: ReportRequest) {
  const a = body.analysis;

  return `
Create a concise suggestive ultrasound report draft for doctor review.

Rules:
- Use only the provided findings.
- Do not invent values.
- Do not give a final diagnosis.
- If a value is missing, write "Not provided".
- Use these headings exactly:
Summary:
Key Findings:
Impression:
Recommendation:
Disclaimer:

Findings:
- File: ${body.fileName ?? "Not provided"}
- Classification: ${a.pathology}
- Confidence: ${typeof a.confidence === "number" ? `${(a.confidence * 100).toFixed(1)}%` : "Not provided"}
- Pixel count: ${a.pixels ?? "Not provided"}
- Area (mm^2): ${a.area ?? "Not provided"}
- Model insight: ${a.insight ?? "Not provided"}
- Model used: ${a.modelUsed ?? "Not provided"}
`.trim();
}

function extractText(result: any) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.output_text === "string") return result.output_text;

  const chunks: string[] = [];
  for (const item of result?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  if (chunks.length > 0) {
    return chunks.join("\n\n");
  }

  return JSON.stringify(result);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/report") {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const body = (await request.json()) as ReportRequest;

    if (!body?.analysis?.pathology) {
      return Response.json(
        { error: "analysis.pathology is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const aiResult = await env.AI.run("@cf/openai/gpt-oss-20b", {
      instructions:
        "You are a medical drafting assistant. Generate a suggestive report draft for doctors. Never invent missing values. Never state a final diagnosis. Always include a disclaimer that a clinician must review the output.",
      input: buildPrompt(body),
      reasoning: { effort: "low" },
      max_tokens: 500,
    });

	return Response.json(
  {
    report: extractText(aiResult),
    raw: aiResult,
  },
  { headers: corsHeaders }
);
  },
};
