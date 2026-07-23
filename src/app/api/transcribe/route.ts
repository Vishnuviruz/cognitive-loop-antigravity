import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { transcribeAudio } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'bad_request', message: 'Multipart form data is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const textContent = formData.get('content') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'bad_request', message: 'Audio file is required' }, { status: 400 });
    }

    let text = '';
    const isOfflineDemo = !process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'placeholder_replace_with_actual_key';

    if (isOfflineDemo && textContent) {
      text = textContent.trim();
    } else {
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      text = await transcribeAudio(buffer, audioFile.type);
    }

    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during audio transcription' },
      { status: 500 }
    );
  }
}
