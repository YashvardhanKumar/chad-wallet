import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'avatar';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary configuration is missing in environment variables' }, { status: 500 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const uploadFormData = new FormData();
    const blob = new Blob([buffer], { type: file.type });
    uploadFormData.append('file', blob, file.name);
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp);
    uploadFormData.append('signature', signature);
    uploadFormData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Cloudinary error: ${errText}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ url: data.secure_url });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
