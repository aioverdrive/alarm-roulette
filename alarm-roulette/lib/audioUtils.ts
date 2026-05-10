export const MAX_MB = 10;
export const MAX_BYTES = MAX_MB * 1024 * 1024;

/** Some browsers leave file.type empty; Storage MIME allowlists require a real type. */
export function inferAudioContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': case 'oga': return 'audio/ogg';
    case 'm4a': return 'audio/mp4';
    case 'aac': return 'audio/aac';
    default: return 'audio/mpeg';
  }
}

export function ringtoneObjectPathFromPublicUrl(publicUrl: string): string | null {
  const marker = '/object/public/ringtones/';
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length));
}

export function randomPoolIndex(length: number): number {
  if (length <= 0) return 0;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % length;
}
