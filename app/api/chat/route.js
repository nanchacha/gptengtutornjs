import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const threeLine = " in three lines."

    // v4에서는 createChatCompletion → chat.completions.create(...) 으로 바뀜
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful English speaking tutor. Your name is Seung Ae Lee' },
        { role: 'user', content: prompt+threeLine },
      ],
    });

    const chatResponse = completion.choices[0]?.message?.content ?? '';

    return NextResponse.json({ response: chatResponse });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch response from ChatGPT' },
      { status: 500 }
    );
  }
}
