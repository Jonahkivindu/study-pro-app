import { SUMMARY_PROMPT, RAG_PROMPT } from '../lib/prompts';

const getGeminiEndpoint = (model: string) => 
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve((reader.result as string).split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
};

export async function transcribeAudioGemini(audioBlob: Blob): Promise<string> {
  const base64Audio = await blobToBase64(audioBlob);
  
  const response = await fetch(getGeminiEndpoint('gemini-1.5-flash'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Generate a highly accurate word-for-word transcription of the following audio." },
          { inlineData: { mimeType: audioBlob.type || "audio/webm", data: base64Audio } }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini Transcription Error:", errText);
    throw new Error('Failed to transcribe audio via Gemini');
  }

  const data = await response.json();
  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].content.parts[0].text;
  }
  return "";
}

export async function generateSummary(transcript: string) {
  const prompt = SUMMARY_PROMPT.replace('{transcript}', transcript);
  
  const response = await fetch(getGeminiEndpoint('gemini-1.5-flash'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary');
  }

  const data = await response.json();
  const textOutput = data.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(textOutput);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", textOutput);
    throw new Error("Invalid output format from AI");
  }
}

export async function askRAG(question: string, contextChunks: string[]) {
  const contextText = contextChunks.join('\n\n---\n\n');
  const prompt = RAG_PROMPT.replace('{context}', contextText).replace('{question}', question);

  const response = await fetch(getGeminiEndpoint('gemini-1.5-flash'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch response');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
