import type { Node, Edge } from '../store/store';

interface AIResponse {
  nodes: any[];
  edges: any[];
}

// Using Gemini 2.5 Flash-Lite as requested.
const DEFAULT_MODEL = 'gemini-2.5-flash-lite-preview-09-2025';
const API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1500 + Math.random() * 200; // Slightly longer wait
        console.warn(`AI Service rate limited. Retrying in ${Math.round(waitTime)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }

      // If not 429 or max retries reached
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      await delay(Math.pow(2, attempt) * 1500);
    }
  }
  throw lastError;
};

// Shared Schema Definition to ensure consistency across Generate, Analyze, and Modify
const FLOW_SCHEMA = `{
  "nodes": [{
    "id": "string",
    "type": "task"|"decision"|"note"|"document"|"external"|"meeting"|"fmea"|"ishikawa"|"pdca"|"fiveWTwoH"|"swot"|"prioritization"|"projectCharter"|"stakeholderMatrix"|"wbs",
    "position": {"x": number, "y": number},
    "width": number, "height": number,
    "data": {
      "label": "string", "description": "string", "status": "pending",
      "priority": "low"|"medium"|"high"|"critical", "assignee": "string",
      "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD", "estimatedHours": number,
      "tags": ["string"],
      "checklist": [{"id": "uuid", "text": "string", "done": boolean}],
      
      // Type-specific:
      "question": "string", "decision": "yes"|"no", // decision
      "content": "string", // note
      "documentUrl": "string", // document
      "externalSystem": "string", // external
      "meeting": { "date": "string", "participants": ["string"], "minutes": "string" }, // meeting
      "failureMode": "string", "severity": number, "occurrence": number, "detection": number, "action": "string", // fmea
      "causes": { "method": ["string"], "machine": ["string"], "material": ["string"], "manpower": ["string"], "measurement": ["string"], "environment": ["string"] }, // ishikawa
      "pdca": { "plan": ["string"], "do": ["string"], "check": ["string"], "act": ["string"] }, // pdca
      "fiveWTwoH": { "what": "string", "why": "string", "where": "string", "when": "string", "who": "string", "how": "string", "howMuch": "string" }, // fiveWTwoH
      "swot": { "strengths": ["string"], "weaknesses": ["string"], "opportunities": ["string"], "threats": ["string"] }, // swot
      "prioritization": { "method": "RICE"|"ICE", "items": [{ "id": "string", "label": "string", "reach": number, "impact": number, "confidence": number, "effort": number, "ease": number }] }, // prioritization
      "projectCharter": { "projectName": "string", "projectManager": "string", "budget": "string", "justification": "string", "objectives": ["string"], "successCriteria": ["string"], "assumptions": ["string"] }, // projectCharter
      "stakeholderMatrix": { "stakeholders": [{ "id": "string", "name": "string", "role": "string", "power": "low"|"high", "interest": "low"|"high" }] }, // stakeholderMatrix
      "wbs": { "items": [{ "id": "string", "code": "string", "name": "string", "cost": "string", "responsible": "string" }] } // wbs
    }
  }],
  "edges": [{
    "id": "string", "source": "string", "target": "string", "sourceHandle": "yes"|"no"|"right"|"bottom"|"top", "label": "string"
  }]
}`;

// Shared Rules for Robust Content and Logic
const SYSTEM_RULES = `RULES:
0. **ROBUST CONTENT (CRITICAL)**:
   - **NO EMPTY FIELDS**: Every single field MUST be filled with specific, realistic data.
   - **NO PLACEHOLDERS**: forbidden words: "TBD", "Pending", "Item 1", "Description here", "Insert text".
   - **Detailed Descriptions**: Write at least 2 sentences for descriptions.
   - **Complete Arrays**: For lists (causes, steps), provide 3-5 distinct items.
   - **Project Charter/WBS/Matrix**: MUST be fully populated with realistic business data.

1. **CONNECTIVITY**: ALL nodes MUST be connected.
2. **EDGES (LOGIC ONLY)**:
   - OUTPUT ONLY: "id", "source", "target", "label".
   - **DO NOT** output "sourceHandle" or "targetHandle". The application will automatically calculate the best routing.
3. **DECISION NODES**:
   - For logic, you still need to distinguish purely by LABEL.
   - Label edges exiting decision nodes as "Yes" or "No" (or "Sim"/"Não").
4. **LAYOUT**: Use HORIZONTAL Left-to-Right layout. Increase X by 300px for each step. Stack branches on Y (-150/150).

5. **DETAILS**: Add realistic labels, descriptions and assignees.
6. **DATES**: For tasks, ALWAYS provide BOTH "startDate" (TODAY: {today}) and "dueDate" (startDate + 3 days).
7. **RETURN EDGES**: Just connect Source to Target. The App handles the visual loop.`;

// Helper to force standardized handles: Left=Arrival, Right=Departure, Top/Bottom=Return
const forceSmartHandles = (nodes: Node[], edges: Edge[]) => {
  return edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (sourceNode && targetNode) {

      // DECISION NODE SPECIAL LOGIC
      if (sourceNode.type === 'decision') {
        const label = (edge.label || '').toLowerCase();
        let sHandle = edge.sourceHandle;

        if (label === 'yes' || label === 'sim') sHandle = 'yes';
        else if (label === 'no' || label === 'não' || label === 'nao') sHandle = 'no';

        if (sHandle !== 'yes' && sHandle !== 'no') {
          if (label.includes('yes') || label.includes('sim')) sHandle = 'yes';
          else sHandle = 'no';
        }

        // For decision targets, we still want to be smart about entry point
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        const isVertical = Math.abs(dy) > Math.abs(dx) && dy > 0; // Target is below

        return {
          ...edge,
          sourceHandle: sHandle,
          targetHandle: isVertical ? 'top' : 'left'
        };
      }

      // STANDARD NODE LOGIC
      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;

      const isVerticalStack = Math.abs(dy) > Math.abs(dx) + 50;

      if (isVerticalStack) {
        // VERTICAL CONNECTION
        if (dy > 0) { // Target is BELOW
          return { ...edge, sourceHandle: 'bottom', targetHandle: 'top' };
        } else { // Target is ABOVE
          return { ...edge, sourceHandle: 'top', targetHandle: 'bottom' };
        }
      } else {
        // HORIZONTAL CONNECTION
        if (dx >= 0) { // Target is RIGHT
          return { ...edge, sourceHandle: 'right', targetHandle: 'left' };
        } else { // Target is LEFT
          return { ...edge, sourceHandle: 'bottom', targetHandle: 'bottom' };
        }
      }
    }
    return edge;
  });
};


export const generateFlowFromPrompt = async (prompt: string, apiKey: string): Promise<{ nodes: Node[], edges: Edge[] }> => {

  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  if (!apiKey.startsWith('AIza')) {
    throw new Error("Invalid API Key: Google Gemini keys usually start with 'AIza'. Please check your key.");
  }

  const systemPrompt = `Expert flowchart designer for FluxUp. Create detailed flowchart from user description.

SCHEMA:
${FLOW_SCHEMA}

${SYSTEM_RULES}
`.trim();

  try {
    const response = await fetchWithRetry(`${API_BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt.replace('{today}', new Date().toISOString().split('T')[0]) }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        throw new Error("AI Service is temporarily busy. Please try again in 30 seconds.");
      }
      throw new Error(errorData.error?.message || 'Failed to generate flow');
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content returned from Gemini API");
    }

    const parsed = JSON.parse(content) as AIResponse;

    // Post-process
    const nodes: Node[] = parsed.nodes.map((n, index) => {
      let width = n.width || 256;
      let height = n.height || 100;

      if (n.type === 'decision') { width = 150; height = 100; }
      if (n.type === 'note') { width = 200; height = 150; }
      if (n.type === 'document') { width = 160; height = 100; }
      if (n.type === 'external') { width = 180; height = 100; }
      if (n.type === 'meeting') { width = 250; height = 150; }
      if (n.type === 'fmea') { width = 320; height = 400; }
      if (n.type === 'ishikawa') { width = 600; height = 400; }
      if (n.type === 'pdca') { width = 500; height = 400; }
      if (n.type === 'fiveWTwoH') { width = 400; height = 350; }
      if (n.type === 'swot') { width = 600; height = 450; }
      if (n.type === 'prioritization') { width = 600; height = 450; }
      if (n.type === 'projectCharter') { width = 450; height = 550; }
      if (n.type === 'stakeholderMatrix') { width = 600; height = 400; }
      if (n.type === 'wbs') { width = 600; height = 400; }

      const validTypes = ['task', 'decision', 'note', 'document', 'external', 'meeting', 'fmea', 'ishikawa', 'pdca', 'fiveWTwoH', 'swot', 'prioritization', 'projectCharter', 'stakeholderMatrix', 'wbs'];
      let safeType = n.type;
      if (!validTypes.includes(safeType)) {
        console.warn(`AI generated invalid type: ${safeType}, defaulting to 'task'`);
        safeType = 'task'; // Fallback to task instead of allowing generic/unknown types
      }

      return {
        id: n.id || `node-${index}-${Date.now()}`,
        type: safeType,
        position: n.position || { x: index * 300, y: 100 },

        width,
        height,
        data: {
          label: n.data?.label || 'Untitled',
          status: 'pending',
          ...n.data
        }
      };
    });

    const edges: Edge[] = parsed.edges.map((e, index) => ({
      id: e.id || `edge-${index}-${Date.now()}`,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
      animated: true
    }));

    const finalEdges = forceSmartHandles(nodes, edges);

    return { nodes, edges: finalEdges };

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

// Helper to sanitize flow data before sending to AI (remove dates from analysis nodes)
// Aggressively sanitize flow data before sending to AI to reduce token usage and avoid 429 errors.
const sanitizeFlowForAI = (nodes: Node[], edges: Edge[]) => {
  const analysisTypes = ['fmea', 'ishikawa', 'pdca', 'fiveWTwoH', 'swot', 'prioritization'];

  const sanitizedNodes = nodes.map(node => {
    // Only pick essential properties for logic/analysis
    const { id, type, position } = node;

    // Clean data object
    const data: any = { ...node.data };

    // Remove properties AI doesn't need to rebuild logic
    if (analysisTypes.includes(type || '')) {
      delete data.startDate;
      delete data.dueDate;
    }

    // Remove empty/default arrays or long strings that don't add value
    if (data.checklist && data.checklist.length === 0) delete data.checklist;
    if (data.tags && data.tags.length === 0) delete data.tags;

    // Truncate very long descriptions to save tokens
    if (data.description && data.description.length > 500) {
      data.description = data.description.substring(0, 500) + "...";
    }

    // Strip UI-only states from data if they exist
    delete data.status; // AI mostly works with content logic, not status tracking

    return {
      id,
      type,
      // Round coordinates to save characters
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y)
      },
      width: node.width,
      height: node.height,
      data
    };
  });

  const sanitizedEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label
  }));

  return { nodes: sanitizedNodes, edges: sanitizedEdges };
};

export const analyzeFlow = async (nodes: Node[], edges: Edge[], apiKey: string): Promise<{ analysis: string, improvedFlow: { nodes: Node[], edges: Edge[] } }> => {
  if (!apiKey) throw new Error("API Key is missing");

  const systemPrompt = `Expert process analyst for FluxUp. Analyze the provided flow JSON.
    
    OUTPUT: Valid JSON only.
    {
        "analysis": "Markdown text. 1. Summary. 2. Issues. 3. Improvements.",
        "improvedFlow": { "nodes": [...], "edges": [...] }
    }

    SCHEMA:
    ${FLOW_SCHEMA}

    ${SYSTEM_RULES}
    `;

  try {
    const response = await fetchWithRetry(`${API_BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: `Current Flow:\n${JSON.stringify(sanitizeFlowForAI(nodes, edges))}` }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        throw new Error("AI Service is temporarily busy. Please try again in 30 seconds.");
      }
      throw new Error(errorData.error?.message || 'Failed to analyze flow');
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error("No content returned from Gemini API");

    try {
      const parsed = JSON.parse(content);
      const finalEdges = forceSmartHandles(parsed.improvedFlow.nodes, parsed.improvedFlow.edges);
      return {
        analysis: parsed.analysis,
        improvedFlow: {
          nodes: parsed.improvedFlow.nodes,
          edges: finalEdges
        }
      };

    } catch (parseError) {
      console.error("JSON Parse Error. Raw Content:", content);
      throw new Error("Failed to parse AI response. See console for details.");
    }

  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};

export const modifyFlow = async (nodes: Node[], edges: Edge[], prompt: string, apiKey: string): Promise<{ nodes: Node[], edges: Edge[] }> => {
  if (!apiKey) throw new Error("API Key is missing");

  const systemPrompt = `Expert process analyst for FluxUp. Modify flow based on request.
    
    OUTPUT: Valid JSON only.
    { "nodes": [...], "edges": [...] }

    SCHEMA:
    ${FLOW_SCHEMA}

    ${SYSTEM_RULES}
    `;

  try {
    const response = await fetchWithRetry(`${API_BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt.replace('{today}', new Date().toISOString().split('T')[0]) }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: `User Request: ${prompt}\n\nCurrent Flow:\n${JSON.stringify(sanitizeFlowForAI(nodes, edges))}` }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        throw new Error("AI Service is temporarily busy. Please try again in 30 seconds.");
      }
      throw new Error(errorData.error?.message || 'Failed to modify flow');
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error("No content returned from Gemini API");

    try {
      const parsed = JSON.parse(content);
      const finalEdges = forceSmartHandles(parsed.nodes, parsed.edges);
      return { nodes: parsed.nodes, edges: finalEdges };

    } catch (parseError) {
      console.error("JSON Parse Error. Raw Content:", content);
      throw new Error("Failed to parse AI response. See console for details.");
    }

  } catch (error) {
    console.error("AI Modification Error:", error);
    throw error;
  }
};
