const apiKey = process.env.GEMINI_API_KEY || process.env.GENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY

const DEFAULT_SYSTEM_INSTRUCTION = process.env.CHATBOT_SYSTEM_INSTRUCTION || `You are a DSA, placement related queries instructor and an NPTEL course recommendation chatbot. You will only reply to problems related to Data Structures and Algorithms, placement queries, and NPTEL course recommendations. If the user asks something outside those areas, reply tersely and rudely. Provide explanations, examples, and code snippets for DSA topics; recommend NPTEL courses with links when asked; give placement preparation tips when asked.`

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt is required' })
  if (!apiKey) return res.status(500).json({ error: 'GENAI API key not configured on server. Set GEMINI_API_KEY or GENAI_API_KEY.' })

  try {
    const combinedInput = `${DEFAULT_SYSTEM_INSTRUCTION}\\n\\nUser: ${prompt}`

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
        buildBody: () => ({ 
          contents: [ { parts: [ { text: prompt } ] } ], 
          systemInstruction: { parts: [ { text: DEFAULT_SYSTEM_INSTRUCTION } ] }, 
          generationConfig: { maxOutputTokens: 800 } 
        })
      }
    ]

    for (const attempt of attempts) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(attempt.model)}:${attempt.methodSuffix}?key=${encodeURIComponent(apiKey)}`
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt.buildBody())
        })

        const data = await response.json()

        if (response.ok && data) {
          // Extract text from different possible response shapes
          let text
          
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = data.candidates[0].content.parts[0].text
          } else if (data.candidates?.[0]?.output) {
            text = data.candidates[0].output
          } else if (data.candidates?.[0]?.text) {
            text = data.candidates[0].text
          } else if (data.candidates?.[0]) {
            text = JSON.stringify(data.candidates[0])
          } else if (data.text) {
            text = data.text
          } else {
            text = JSON.stringify(data)
          }

          return res.json({ 
            response: text.trim(),
            model: attempt.model,
            method: attempt.name
          })
        }
      } catch (attemptErr) {
        console.log(`Attempt ${attempt.name} failed:`, attemptErr.message)
        continue
      }
    }

    return res.status(500).json({ error: 'All API attempts failed' })
  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}