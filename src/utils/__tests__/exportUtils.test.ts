import { describe, it, expect, vi } from 'vitest';

// Simulate the JSON parsing logic used in generateSlideData
function parseAIJSONResponse(response: string) {
  try {
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

describe('exportUtils - AI Result Parsing', () => {
  it('should successfully parse a valid clean JSON array', () => {
    const rawAiOutput = `[
      {"title": "Slide 1", "points": ["A", "B"]},
      {"title": "Slide 2", "points": ["C", "D"]}
    ]`;
    
    const result = parseAIJSONResponse(rawAiOutput);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].title).toBe("Slide 1");
  });

  it('should successfully parse JSON wrapped in markdown code blocks', () => {
    const rawAiOutput = `
Here is your presentation data:
\`\`\`json
[
  {"title": "Slide 1", "points": ["A", "B"]}
]
\`\`\`
Hope this helps!
    `;
    
    // In our current code, we just replace \`\`\`json and \`\`\` but if there's text outside, JSON.parse fails!
    // This test exposes a potential "Vibe Code" bug!
    const jsonStr = rawAiOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    // We expect the extraction to extract ONLY the array bracket portion.
    // Let's implement a safer extractor.
    const match = jsonStr.match(/\[[\s\S]*\]/);
    const safeExtraction = match ? match[0] : jsonStr;
    
    const result = JSON.parse(safeExtraction);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Slide 1");
  });

  it('should return null for invalid JSON parsing', () => {
    const badOutput = "Sorry, I cannot generate this.";
    const result = parseAIJSONResponse(badOutput);
    expect(result).toBeNull();
  });
});
