export function chunkTranscript(transcript: string, wordsPerChunk = 500): string[] {
  const words = transcript.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
}

// Simple TF-IDF / keyword based search as local fallback if embeddings aren't used right away.
// For true RAG, we would call an embeddings API here.
export function searchChunks(query: string, chunks: string[], topK = 3): string[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const scores = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const w of queryWords) {
      // Count occurrences
      const reg = new RegExp(w, 'g');
      const matches = lowerChunk.match(reg);
      if (matches) score += matches.length;
    }
    return { chunk, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK).map(s => s.chunk);
}
