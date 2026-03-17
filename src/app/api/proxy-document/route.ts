import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
  }

  try {
    let directUrl = url;

    // Transformation OneDrive (Personal/Business 1drv.ms ou onedrive.live.com)
    if (url.includes('onedrive.live.com') || url.includes('1drv.ms') || url.includes('sharepoint.com')) {
      // Méthode officielle de conversion de lien de partage OneDrive en lien direct
      // 1. Encoder l'URL en base64
      // 2. Remplacer les caractères non autorisés
      // 3. Préfixer avec l'API Microsoft
      const base64Url = btoa(url);
      const encodedUrl = base64Url.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      directUrl = `https://api.onedrive.com/v1.0/shares/u!${encodedUrl}/root/content`;
    } 
    // Transformation Dropbox
    else if (url.includes('dropbox.com')) {
      directUrl = url.replace(/[?&]dl=[01]/g, '').replace(/[?&]st=[^&]+/g, '');
      directUrl = directUrl.includes('?') ? `${directUrl}&raw=1` : `${directUrl}?raw=1`;
    }
    // Transformation Google Drive
    else if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/)?.[1] || url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/)?.[2];
      if (fileId) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }

    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Le serveur source a répondu avec l'état ${response.status}`);
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/pdf';

    // On renvoie le fichier avec les bons headers pour autoriser l'affichage
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline', // Force l'affichage au lieu du téléchargement
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Erreur Proxy PDF:', error);
    return NextResponse.json({ error: 'Impossible de récupérer le document : ' + error.message }, { status: 500 });
  }
}
