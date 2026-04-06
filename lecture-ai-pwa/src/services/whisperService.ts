export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string, segments: any[] }> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key missing');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'lecture.webm');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json'); // for timestamps

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API failed: ${err}`);
  }

  const data = await response.json();
  return {
    text: data.text,
    segments: data.segments || []
  };
}
