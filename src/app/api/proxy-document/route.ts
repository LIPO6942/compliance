import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
  }

  try {
    let directUrl = url;

    // Transformation Dropbox
    if (url.includes('dropbox.com')) {
      directUrl = url.replace(/[?&]dl=[01]/g, '').replace(/[?&]st=[^&]+/g, '');
      directUrl = directUrl.includes('?') ? `${directUrl}&raw=1` : `${directUrl}?raw=1`;
    } 
    // Transformation OneDrive
    else if (url.includes('onedrive.live.com') || url.includes('1drv.ms')) {
      // Pour OneDrive, on utilise le mode download forcé
      directUrl = url.replace('redir?', 'download?');
    }
    // Transformation Google Drive
    else if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/)?.[1] || url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/)?.[2];
      if (fileId) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }

    const response = await fetch(directUrl);
    
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
