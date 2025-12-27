export default {
  async fetch(request, env) {
    // --- 1. DEFINITIVE CORS HEADERS (Allow Everything) ---
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*", // Allow any header the browser wants to send
    };

    // --- 2. HANDLE PREFLIGHT (Browser Security Check) ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204, // No Content
        headers: corsHeaders,
      });
    }

    // --- 3. HANDLE ACTUAL REQUEST ---
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const { userPrompt, systemPrompt, model } = await request.json();
      
      // Check API Key
      const apiKey = env.GEMINI_API_KEY; 
      // FALLBACK: If you forgot to set the var in Cloudflare, hardcode it here for testing:
      // const apiKey = "YOUR_KEY_HERE"; 

      if (!apiKey) {
        throw new Error("Server Configuration Error: GEMINI_API_KEY is missing in Cloudflare Variables.");
      }

      const targetModel = model || "gemini-1.5-flash"; 
      
      // Call Google
      const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      };

      if (systemPrompt) {
        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const googleResponse = await fetch(googleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await googleResponse.json();

      // Return Result with CORS Headers
      return new Response(JSON.stringify(data), {
        status: googleResponse.status,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }
};
