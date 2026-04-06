export const RAG_PROMPT = `You are an expert academic assistant answering questions about a specific lecture.
Context from lecture:
{context}

Question: {question}

Provide a concise, helpful answer based ONLY on the context provided above. If the answer is not in the context, say so.`;

export const SUMMARY_PROMPT = `You are an expert academic assistant. Summarize the following lecture transcript.
Output MUST be valid JSON matching this exact structure:
{
  "summary": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
  "keyConcepts": ["concept 1", "concept 2", "concept 3"],
  "potentialExamQuestions": ["q1", "q2", "q3", "q4", "q5"]
}

Lecture Transcript:
{transcript}`;
