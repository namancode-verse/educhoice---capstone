import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

// API key from environment (set GEMINI_API_KEY or GENAI_API_KEY or GOOGLE_GENAI_API_KEY)
const apiKey = process.env.GEMINI_API_KEY || process.env.GENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY
if (!apiKey) console.warn('GENAI API key not set in environment (GEMINI_API_KEY or GENAI_API_KEY or GOOGLE_GENAI_API_KEY)')

const DEFAULT_SYSTEM_INSTRUCTION = process.env.CHATBOT_SYSTEM_INSTRUCTION || `You are a DSA, placement related queries instructor and an NPTEL course recommendation chatbot. You will only reply to problems related to Data Structures and Algorithms, placement queries, and NPTEL course recommendations. If the user asks something outside those areas, reply tersely and rudely. Provide explanations, examples, and code snippets for DSA topics; recommend NPTEL courses with links when asked; give placement preparation tips when asked.`

router.post('/', async (req, res) => {
  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt is required' })
  if (!apiKey) return res.status(500).json({ error: 'GENAI API key not configured on server. Set GEMINI_API_KEY or GENAI_API_KEY.' })

  try {
    // Use the text-bison generateText endpoint which accepts a simple { input: "..." } payload.
    // Some GenAI endpoints expect different payload shapes; using generateText avoids the
    // 'contents'/'systemInstruction' shape that caused 'Invalid JSON payload' errors.
    const model = 'text-bison-001'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(apiKey)}`

    // Prepend the system instruction to the prompt so we don't rely on a separate systemInstruction field.
    const combinedInput = `${DEFAULT_SYSTEM_INSTRUCTION}\n\nUser: ${prompt}`

    // We'll try multiple payload shapes/endpoints to be robust against
    // differing model expectations. Try generateText first, then fallbacks.
    const attempts = [
      {
        name: 'generateText',
        model: 'text-bison-001',
        methodSuffix: 'generateText',
        buildBody: () => ({ prompt: { text: combinedInput }, temperature: 0.2, maxOutputTokens: 800 })
      },
      {
        name: 'generateContent_simple',
        model: 'gemini-2.5-flash',
        methodSuffix: 'generateContent',
        buildBody: () => ({ contents: [ { parts: [ { text: prompt } ] } ], systemInstruction: { parts: [ { text: DEFAULT_SYSTEM_INSTRUCTION } ] }, generationConfig: { maxOutputTokens: 800 } })
      },
      {
        name: 'generateContent_parts',
        model: 'gemini-2.5-flash',
        methodSuffix: 'generateContent',
        buildBody: () => ({ contents: [ { parts: [ { text: prompt } ] } ], systemInstruction: { parts: [ { text: DEFAULT_SYSTEM_INSTRUCTION } ] }, generationConfig: { maxOutputTokens: 800 } })
      }
    ]

    let lastError = null
    let data = null
    let usedAttempt = null

    for (const attempt of attempts) {
      try {
        const ep = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(attempt.model)}:${attempt.methodSuffix}?key=${encodeURIComponent(apiKey)}`
        const bodyObj = attempt.buildBody()
        console.log('GenAI attempt', attempt.name, 'model', attempt.model)
        const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) })
        const txt = await r.text()
        if (!r.ok) {
          // record and try next
          lastError = { status: r.status, text: txt, attempt: attempt.name }
          console.warn('GenAI attempt failed', attempt.name, r.status, txt)
          continue
        }
        // parse JSON
        try { data = JSON.parse(txt) } catch (e) { data = txt }
        usedAttempt = attempt.name
        break
      } catch (errAttempt) {
        lastError = { error: String(errAttempt), attempt: attempt.name }
        console.error('GenAI attempt exception', attempt.name, errAttempt)
        continue
      }
    }

    if (!data) {
      console.error('All GenAI attempts failed', lastError)
      // Provide a safe fallback response so the UI still receives useful output
      const fallbackText = `Sorry — the AI service is currently unavailable.\n\nI received your question: "${prompt}"\n\nPlease try again later or contact the administrator.`
      return res.json({ text: fallbackText, fallback: true, details: lastError })
    }

    // Extract text from possible response shapes returned by different GenAI endpoints
    let text = ''
    try {
      const candidates = data?.candidates
      console.log('Parsing response. candidates:', candidates ? 'present' : 'missing')
      if (Array.isArray(candidates) && candidates.length > 0) {
        const c = candidates[0]
        console.log('First candidate keys:', Object.keys(c))
        // Gemini shape: candidates[0].content.parts[0].text
        if (c.content && c.content.parts && Array.isArray(c.content.parts)) {
          console.log('Found content.parts structure')
          for (const part of c.content.parts) {
            if (part.text) text += part.text
          }
        }
        // Fallback: c.output, c.text, c.content as string
        else if (typeof c.output === 'string') {
          console.log('Using c.output')
          text = c.output
        }
        else if (typeof c.text === 'string') {
          console.log('Using c.text')
          text = c.text
        }
        else if (typeof c.content === 'string') {
          console.log('Using c.content as string')
          text = c.content
        }
      }
    } catch (e) { 
      console.error('Error parsing candidates:', e)
    }

    if (!text) {
      console.log('No text extracted, trying top-level fields. data keys:', Object.keys(data))
      // Try top-level fields (text-bison shape)
      if (typeof data?.output === 'string') {
        console.log('Using data.output')
        text = data.output
      }
      else if (typeof data?.text === 'string') {
        console.log('Using data.text')
        text = data.text
      }
      else if (Array.isArray(data?.output) && data.output.length > 0 && typeof data.output[0] === 'string') {
        console.log('Using data.output[0]')
        text = data.output[0]
      }
      else {
        console.log('No matching field found, returning stringified data')
        text = JSON.stringify(data)
      }
    }
    console.log('Final extracted text:', text.substring(0, 100))
    // include which attempt succeeded for debugging
    res.json({ text, modelAttempt: usedAttempt })
  } catch (err) {
    console.error('GenAI proxy error', err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

export default router
