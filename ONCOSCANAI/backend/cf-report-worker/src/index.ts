type ReportRequest = {
  fileName?: string;
  analysis: {
    modality?: string;
    pathology: string;
    subclass?: string;
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

const HISTOLOGY_HEADINGS = [
  "Predicted Subclass",
  "Diagnosis Group",
  "Confidence",
  "Model Insight",
  "Potential Causes",
  "Lifestyle Advice",
  "Dietary Recommendations",
  "Clinical Recommendations",
  "Disclaimer",
];

function buildPrompt(body: ReportRequest) {
  const a = body.analysis;
  const modality = (a.modality || "medical imaging").toLowerCase();
  const isHistology = modality.includes("histo");
  if (isHistology) {
    return `
Create a concise suggestive histopathology report draft for doctor review by following this exact plain-text template.

Rules:
- Return plain text only. Do not return JSON.
- Do not use markdown, bullet points, code blocks, or extra headings.
- Use only the provided findings.
- Do not invent values.
- Do not state a final diagnosis.
- If a value is missing, write "Not provided".
- Use these headings exactly and in this exact order:
Analysis Report
Predicted Subclass:
Diagnosis Group:
Confidence:
Model Insight:
Potential Causes:
Lifestyle Advice:
Dietary Recommendations:
Clinical Recommendations:
Disclaimer:

Provided findings:
File: ${body.fileName ?? "Not provided"}
Model: ${a.modelUsed ?? "Not provided"}
Predicted Subclass: ${a.subclass ?? "Not provided"}
Diagnosis Group: ${a.pathology}
Confidence: ${typeof a.confidence === "number" ? `${(a.confidence * 100).toFixed(1)}%` : "Not provided"}
Model Insight: ${a.insight ?? "Not provided"}

Writing guidance:
- "Potential Causes" should briefly explain what the AI-identified subclass may be associated with in general pathology terms.
- "Lifestyle Advice" should stay conservative and supportive, focused on general wellness only.
- "Dietary Recommendations" should stay general and non-prescriptive.
- "Clinical Recommendations" should emphasize pathology review, clinicopathologic correlation, and physician follow-up.
- "Disclaimer" must clearly state that the AI report is for reference only and not for standalone diagnostic use.

Return exactly this structure:
Analysis Report
Predicted Subclass: ...
Diagnosis Group: ...
Confidence: ...
Model Insight: ...
Potential Causes: ...
Lifestyle Advice: ...
Dietary Recommendations: ...
Clinical Recommendations: ...
Disclaimer: ...
`.trim();
  }

  const reportKind = "ultrasound";
  return `
Create a concise suggestive ${reportKind} report draft for doctor review.

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

function extractText(result: any): string {
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
    return chunks.join("\n");
  }

  return JSON.stringify(result);
}

function extractJSON(text: string): any {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/^```(?:json)?\s*/gm, "").replace(/\s*```$/gm, "");
  cleaned = cleaned.trim();
  
  // Try to extract JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function extractSections(text: string, headings: string[]) {
  const lines = text
    .replace(/^```(?:json)?\s*/gm, "")
    .replace(/\s*```$/gm, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Record<string, string> = {};
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentHeading) return;
    sections[currentHeading] = buffer.join(" ").trim();
    currentHeading = null;
    buffer = [];
  };

  for (const line of lines) {
    const matchedHeading = headings.find((heading) =>
      line.toLowerCase().startsWith(`${heading.toLowerCase()}:`)
    );

    if (matchedHeading) {
      flush();
      currentHeading = matchedHeading;
      const remainder = line.slice(matchedHeading.length + 1).trim();
      if (remainder) buffer.push(remainder);
      continue;
    }

    if (currentHeading) {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

function buildHistologyFallback(body: ReportRequest, extractedText: string) {
  const a = body.analysis;
  const extractedSections = extractSections(extractedText, HISTOLOGY_HEADINGS);
  const subclass = a.subclass || "Not provided";
  const diagnosis = a.pathology || "Not provided";
  const confidence =
    typeof a.confidence === "number" ? `${(a.confidence * 100).toFixed(1)}%` : "Not provided";
  const insight = a.insight || "Not provided";

  const templateSections: Record<string, string> = {
    "Predicted Subclass": extractedSections["Predicted Subclass"] || subclass,
    "Diagnosis Group": extractedSections["Diagnosis Group"] || diagnosis,
    "Confidence": extractedSections["Confidence"] || confidence,
    "Model Insight": extractedSections["Model Insight"] || insight,
    "Potential Causes":
      extractedSections["Potential Causes"] ||
      `The AI-identified subclass ${subclass} may be associated with ${diagnosis.toLowerCase()} histopathologic patterns. Correlation with microscopic review is required.`,
    "Lifestyle Advice":
      extractedSections["Lifestyle Advice"] ||
      "Maintain general wellness habits, follow clinician guidance, and avoid relying on this draft alone for medical decisions.",
    "Dietary Recommendations":
      extractedSections["Dietary Recommendations"] ||
      "Use balanced, non-prescriptive dietary support as advised by the treating clinician or dietitian.",
    "Clinical Recommendations":
      extractedSections["Clinical Recommendations"] ||
      "Recommend pathology review, clinicopathologic correlation, and physician follow-up before any final interpretation or treatment planning.",
    "Disclaimer":
      extractedSections["Disclaimer"] ||
      "This draft is generated for preliminary review only. A qualified clinician must review, interpret, and confirm findings before forming a final diagnosis or treatment plan.",
  };

  return [
    "Analysis Report",
    ...HISTOLOGY_HEADINGS.map((heading) => `${heading}: ${templateSections[heading] || "Not provided"}`),
  ].join("\n");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log(`[Worker] ${request.method} ${request.url}`);
    
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/" || url.pathname === "") {
      console.log("[Worker] Health check OK");
      return Response.json(
        { status: "ok", message: "CF Report Worker is running" },
        { headers: corsHeaders }
      );
    }

    if (url.pathname !== "/report") {
      console.log(`[Worker] Unknown path: ${url.pathname}`);
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      const body = (await request.json()) as ReportRequest;
      console.log("[Worker] Request body received:", JSON.stringify(body));

      if (!body?.analysis?.pathology) {
        console.log("[Worker] Missing analysis.pathology");
        return Response.json(
          { error: "analysis.pathology is required" },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log("[Worker] Calling AI model...");
      const aiResult = await env.AI.run("@cf/openai/gpt-oss-20b", {
        instructions:
          "You are a medical drafting assistant. Generate a suggestive report draft for doctors. Never invent missing values. Never state a final diagnosis. Always include a disclaimer that a clinician must review the output. Follow the requested heading template exactly.",
        input: buildPrompt(body),
        reasoning: { effort: "low" },
        max_tokens: 500,
      });

      console.log("[Worker] AI result received, extracting text...");
      const extractedText = extractText(aiResult);
      console.log("[Worker] Extracted text length:", extractedText.length);

      const modality = (body.analysis.modality || "medical imaging").toLowerCase();
      const isHistology = modality.includes("histo");

      if (isHistology) {
        const report = buildHistologyFallback(body, extractedText);
        console.log("[Worker] Returning normalized histology template report");
        return Response.json(
          {
            report,
            raw: aiResult,
            extractedText,
          },
          { headers: corsHeaders }
        );
      }
       
      const parsedJSON = extractJSON(extractedText);
      console.log("[Worker] JSON parsed:", !!parsedJSON);

      // If JSON parsing succeeded, return it directly as the report
      if (parsedJSON && typeof parsedJSON === "object") {
        console.log("[Worker] Returning structured JSON report");
        return Response.json(
          {
            report: JSON.stringify(parsedJSON),
            ...parsedJSON,
          },
          { headers: corsHeaders }
        );
      }

      // Fallback to plain text report
      console.log("[Worker] Returning text fallback report");
      return Response.json(
        {
          report: extractedText,
          raw: aiResult,
        },
        { headers: corsHeaders }
      );
    } catch (err) {
      console.error("[Worker] Error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      return Response.json(
        {
          error: "Report generation failed",
          details: errorMsg,
        },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
