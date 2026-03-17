import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  try {
    let directUrl = url;

    // OneDrive / SharePoint
    if (url.includes('onedrive.live.com') || url.includes('1drv.ms') || url.includes('sharepoint.com')) {
      const base64Url = btoa(url);
      const encodedUrl = base64Url.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      directUrl = `https://api.onedrive.com/v1.0/shares/u!${encodedUrl}/root/content`;
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
        // Le paramètre confirm=t force le téléchargement direct même pour les très gros fichiers (bypass antivirus prompt)
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      }
    }

    const response = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    // Pour Google Drive qui gère le Scan antivirus sur les gros fichiers
    let finalStream = response.body;

    // On ignore délibérément le content-type de Google (qui renvoie souvent du octet-stream pour forcer le téléchargement)
    // On impose au navigateur de l'afficher comme PDF dans le lecteur natif.
    return new NextResponse(finalStream, {
      status: response.ok ? 200 : response.status,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document-compliance.pdf"', 
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
