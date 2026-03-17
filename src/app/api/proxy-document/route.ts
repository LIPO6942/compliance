import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
  }

  try {
    let directUrl = url;

    // OneDrive / SharePoint
    if (url.includes('onedrive.live.com') || url.includes('1drv.ms') || url.includes('sharepoint.com')) {
      try {
        const base64Url = btoa(url);
        const encodedUrl = base64Url.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        directUrl = `https://api.onedrive.com/v1.0/shares/u!${encodedUrl}/root/content`;
      } catch (e) {
        console.error('Base64 Encoding Error:', e);
        // Fallback to original URL
      }
    } 
    // Dropbox
    else if (url.includes('dropbox.com')) {
      directUrl = url.replace(/[?&]dl=[01]/g, '').replace(/[?&]st=[^&]+/g, '');
      directUrl = directUrl.includes('?') ? `${directUrl}&raw=1` : `${directUrl}?raw=1`;
    }
    // Google Drive
    else if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/)?.[1] || url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/)?.[2];
      if (fileId) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      }
    }

    const response = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    if (!response.ok) {
        console.error('Source Fetch Failed:', response.status);
        // Si ça échoue, on peut essayer de rediriger simplement au lieu de proxy
        return NextResponse.redirect(directUrl);
    }

    // On renvoie le flux directement
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline', 
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Proxy Fatal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
