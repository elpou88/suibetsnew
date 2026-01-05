import { Router, Request, Response } from 'express';

const router = Router();

// AI Betting Suggestion endpoint with provider selection
router.post('/api/ai/betting-suggestion', async (req: Request, res: Response) => {
  try {
    const { eventName, sport, homeTeam, awayTeam, provider = 'openai' } = req.body;

    let content = '';

    // Route to different AI provider based on request
    if (provider === 'anthropic') {
      content = await getAnthropicSuggestion(sport, eventName, homeTeam, awayTeam);
    } else if (provider === 'gemini') {
      content = await getGeminiSuggestion(sport, eventName, homeTeam, awayTeam);
    } else {
      // Default to OpenAI
      content = await getOpenAISuggestion(sport, eventName, homeTeam, awayTeam);
    }

    if (!content) {
      return res.json({ suggestions: [] });
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };

    res.json(suggestions);
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.json({ suggestions: [] });
  }
});

// OpenAI - GPT-4o Mini (Fast & Free)
async function getOpenAISuggestion(sport: string, eventName: string, homeTeam: string, awayTeam: string): Promise<string> {
  try {
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert sports betting advisor. Analyze sports events and provide betting recommendations with confidence scores and reasoning. Return ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `Analyze this ${sport} event and provide betting recommendations:
Event: ${eventName}
${homeTeam ? `Home Team: ${homeTeam}` : ''}
${awayTeam ? `Away Team: ${awayTeam}` : ''}

Provide 2-3 betting recommendations in this JSON format:
{
  "suggestions": [
    {
      "market": "Market Name",
      "recommendation": "Specific bet recommendation",
      "confidence": 0.85,
      "reasoning": "Brief explanation"
    }
  ]
}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await aiResponse.json() as any;
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI error:', error);
    return '';
  }
}

// Anthropic - Claude (Better Reasoning)
async function getAnthropicSuggestion(sport: string, eventName: string, homeTeam: string, awayTeam: string): Promise<string> {
  try {
    const response = await fetch(
      `${process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 500,
          system: `You are an expert sports betting advisor. Analyze sports events and provide betting recommendations with confidence scores and reasoning. Return ONLY valid JSON.`,
          messages: [
            {
              role: 'user',
              content: `Analyze this ${sport} event and provide betting recommendations:
Event: ${eventName}
${homeTeam ? `Home Team: ${homeTeam}` : ''}
${awayTeam ? `Away Team: ${awayTeam}` : ''}

Provide 2-3 betting recommendations in this JSON format:
{
  "suggestions": [
    {
      "market": "Market Name",
      "recommendation": "Specific bet recommendation",
      "confidence": 0.85,
      "reasoning": "Brief explanation"
    }
  ]
}`,
            },
          ],
        }),
      }
    );

    const data = await response.json() as any;
    return data.content?.[0]?.text || '';
  } catch (error) {
    console.error('Anthropic error:', error);
    return '';
  }
}

// Gemini - Google (Fast & Powerful)
async function getGeminiSuggestion(sport: string, eventName: string, homeTeam: string, awayTeam: string): Promise<string> {
  try {
    const response = await fetch(
      `${process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': process.env.AI_INTEGRATIONS_GEMINI_API_KEY || '',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert sports betting advisor. Analyze this ${sport} event and provide betting recommendations with confidence scores and reasoning. Return ONLY valid JSON.

Event: ${eventName}
${homeTeam ? `Home Team: ${homeTeam}` : ''}
${awayTeam ? `Away Team: ${awayTeam}` : ''}

Provide 2-3 betting recommendations in this JSON format:
{
  "suggestions": [
    {
      "market": "Market Name",
      "recommendation": "Specific bet recommendation",
      "confidence": 0.85,
      "reasoning": "Brief explanation"
    }
  ]
}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Gemini error:', error);
    return '';
  }
}

export default router;
