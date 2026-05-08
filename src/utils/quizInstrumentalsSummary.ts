/**
 * Поле instrumentals в order.php / TXT релиза — сводка «Права на инструментал»
 * из шага Quiz2 (по каждому треку).
 */

export interface Quiz2InstrumentalsTrack {
  product_id?: string;
  trackName?: string;
  audioFileName?: string;
  rightsType?: string;
  rightsContractLink?: string;
  additionalInfo?: string;
}

export interface Quiz2ForInstrumentals {
  singleTracks?: Quiz2InstrumentalsTrack[];
  albums?: { tracks?: Quiz2InstrumentalsTrack[] }[];
}

export function rightsTypeToInstrumentalsLabel(rightsType: string): string {
  switch (rightsType) {
    case 'author':
      return 'Я 100% автор музыки';
    case 'exclusive':
      return 'Исключительная лицензия / полная передача права';
    case 'wav':
      return 'Wav лицензия / Аренда';
    case 'mp3':
      return 'Mp3 лицензия / Аренда';
    case 'free':
      return 'free for profit / бит с ютуба';
    case 'gifted':
      return 'подарен / отдан бесплатно / сделан по дружбе';
    default:
      return (rightsType || '').trim();
  }
}

export function buildInstrumentalsFromQuiz2(
  quiz2: Quiz2ForInstrumentals | null | undefined,
): string {
  if (!quiz2) return '';

  const lines: string[] = [];

  quiz2.singleTracks?.forEach((track, i) => {
    if (!track?.product_id) return;
    const title = (track.trackName || track.audioFileName || `Сингл ${i + 1}`).trim();
    const lbl = rightsTypeToInstrumentalsLabel(track.rightsType || '');
    if (!lbl) return;
    let line = `«${title}»: ${lbl}`;
    if (track.rightsContractLink?.trim()) {
      line += `. Договор: ${track.rightsContractLink.trim()}`;
    }
    if (track.additionalInfo?.trim()) {
      line += `. Доп.: ${track.additionalInfo.trim()}`;
    }
    lines.push(line);
  });

  quiz2.albums?.forEach((album, ai) => {
    album.tracks?.forEach((track, ti) => {
      if (!track?.product_id) return;
      const title = (track.trackName || track.audioFileName || `Трек ${ti + 1}`).trim();
      const lbl = rightsTypeToInstrumentalsLabel(track.rightsType || '');
      if (!lbl) return;
      let line = `[Альбом ${ai + 1}] «${title}»: ${lbl}`;
      if (track.rightsContractLink?.trim()) {
        line += `. Договор: ${track.rightsContractLink.trim()}`;
      }
      if (track.additionalInfo?.trim()) {
        line += `. Доп.: ${track.additionalInfo.trim()}`;
      }
      lines.push(line);
    });
  });

  return lines.join('\n').trim();
}
