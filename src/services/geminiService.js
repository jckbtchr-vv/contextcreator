// Gemini API service for generating p5.js code from prompts

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

/**
 * Generate p5.js drawing code from a text prompt using Gemini
 * @param {string} apiKey - Gemini API key
 * @param {string} prompt - User's visual description
 * @param {object} constraints - Color constraints { foreground, background }
 * @returns {Promise<string>} - p5.js drawing code
 */
export async function generateP5Code(apiKey, prompt, constraints) {
  if (!apiKey) {
    throw new Error('API key is required')
  }

  if (!prompt || prompt.trim() === '') {
    throw new Error('Prompt is required')
  }

  const systemPrompt = `You are a p5.js code generator. Generate ONLY the drawing code (no setup, no createCanvas) that will be executed inside a p5.js draw function.

CONSTRAINTS:
- Canvas is 600x600 pixels (use p.width and p.height)
- Foreground color: ${constraints.foreground}
- Background color: ${constraints.background}
- The background is already set, don't call p.background()
- Use only these p5 functions: p.fill(), p.stroke(), p.strokeWeight(), p.noFill(), p.noStroke(), p.rect(), p.ellipse(), p.line(), p.point(), p.triangle(), p.quad(), p.arc(), p.beginShape(), p.vertex(), p.endShape(), p.push(), p.pop(), p.translate(), p.rotate(), p.scale(), p.text(), p.textSize(), p.textAlign()
- For colors, use the provided foreground/background or derive from them
- Make visuals centered and well-composed
- Keep code simple and elegant
- Do NOT use any external resources, images, or fonts
- Do NOT use loops that could cause infinite execution
- Do NOT use setTimeout, setInterval, or any async operations

RESPONSE FORMAT:
Return ONLY valid JavaScript code, no markdown, no explanations, no code fences. The code will be executed directly with eval().

Example response for "a simple circle":
p.noFill();
p.stroke(255, 255, 255);
p.strokeWeight(2);
p.ellipse(p.width/2, p.height/2, 200, 200);`

  const requestBody = {
    contents: [{
      parts: [{
        text: `${systemPrompt}\n\nGenerate p5.js code for: "${prompt}"`
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API')
    }

    let code = data.candidates[0].content.parts[0].text.trim()

    // Clean up the code - remove markdown code fences if present
    code = code.replace(/^```(?:javascript|js)?\n?/i, '')
    code = code.replace(/\n?```$/i, '')
    code = code.trim()

    // Basic validation - check for dangerous patterns
    const dangerousPatterns = [
      /\beval\s*\(/,
      /\bFunction\s*\(/,
      /\bsetTimeout\s*\(/,
      /\bsetInterval\s*\(/,
      /\bfetch\s*\(/,
      /\bXMLHttpRequest/,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage/,
      /\bsessionStorage/,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error('Generated code contains potentially unsafe patterns')
      }
    }

    return code
  } catch (error) {
    if (error.message.includes('API error') || error.message.includes('Invalid response')) {
      throw error
    }
    throw new Error(`Failed to generate code: ${error.message}`)
  }
}

/**
 * Test if the API key is valid
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<boolean>}
 */
export async function testApiKey(apiKey) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say "ok"'
          }]
        }]
      })
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get word suggestions for visual prompt completion
 * @param {string} apiKey - Gemini API key
 * @param {string} currentPrompt - Current prompt text
 * @returns {Promise<string[]>} - Array of suggested words
 */
export async function getWordSuggestions(apiKey, currentPrompt) {
  if (!apiKey) return []

  const prompt = currentPrompt?.trim() || ''

  const systemPrompt = `You are a creative assistant helping complete visual art prompts. Given the current prompt, suggest 4-6 single words or short phrases (2 words max) that would make interesting visual directions.

Focus on:
- Geometric shapes and patterns
- Artistic styles and movements
- Moods and atmospheres
- Abstract concepts
- Visual compositions

RESPONSE FORMAT:
Return ONLY a comma-separated list of suggestions, nothing else. Keep each suggestion short (1-2 words).

Example for "geometric":
patterns, circles, fractals, minimal, recursive, grid

Example for "":
abstract, minimal, organic, geometric, flowing, sharp`

  const requestBody = {
    contents: [{
      parts: [{
        text: `${systemPrompt}\n\nCurrent prompt: "${prompt}"\n\nSuggest next words:`
      }]
    }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 100,
    }
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) return []

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    // Parse comma-separated suggestions
    const suggestions = text
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0 && s.length < 20)
      .slice(0, 6)

    return suggestions
  } catch {
    return []
  }
}
