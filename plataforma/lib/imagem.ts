// Compressão de fotos NO NAVEGADOR antes do upload.
// Foto de celular (4-8 MB) → JPEG de ~0,5-1,5 MB com até 3000px no maior lado:
// sobra resolução para imprimir até 20x30cm e o upload fica rápido no 4G.
//
// HEIC (iPhone): o Safari converte ao escolher da galeria; se mesmo assim chegar
// um HEIC que o navegador não sabe abrir, enviamos o original (sem preview).

const LADO_MAXIMO = 3000;
const QUALIDADE = 0.88;
const LADO_MINIATURA = 160;

export interface FotoProcessada {
  arquivo: Blob;
  tipo: string;
  extensao: "jpg" | "png" | "webp" | "heic";
  largura: number | null; // null = navegador não conseguiu ler (HEIC)
  altura: number | null;
  /** miniatura pequena em data URL, para guardar no localStorage */
  miniatura: string | null;
}

export async function processarFoto(arquivo: File): Promise<FotoProcessada> {
  let bitmap: ImageBitmap;
  try {
    // "from-image" respeita a rotação EXIF (foto de celular deitada)
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    return {
      arquivo,
      tipo: arquivo.type || "image/heic",
      extensao: "heic",
      largura: null,
      altura: null,
      miniatura: null,
    };
  }

  try {
    const { width, height } = bitmap;
    const escala = Math.min(1, LADO_MAXIMO / Math.max(width, height));
    const w = Math.round(width * escala);
    const h = Math.round(height * escala);

    // Se já é um JPEG pequeno, não recomprime (evita perder qualidade à toa)
    const jaLeve = arquivo.type === "image/jpeg" && escala === 1 && arquivo.size < 1.5 * 1024 * 1024;
    const blob = jaLeve ? arquivo : await desenhar(bitmap, w, h, "image/jpeg", QUALIDADE);

    const e = Math.min(1, LADO_MINIATURA / Math.max(width, height));
    const mini = await desenhar(bitmap, Math.round(width * e), Math.round(height * e), "image/jpeg", 0.6);

    return {
      arquivo: blob,
      tipo: "image/jpeg",
      extensao: "jpg",
      largura: width,
      altura: height,
      miniatura: await paraDataUrl(mini),
    };
  } finally {
    bitmap.close();
  }
}

async function desenhar(fonte: ImageBitmap, w: number, h: number, tipo: string, qualidade: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem");
  ctx.fillStyle = "#fff"; // PNG com transparência vira fundo branco (como no papel)
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fonte, 0, 0, w, h);
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Falha ao comprimir a imagem"))), tipo, qualidade),
  );
}

function paraDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(leitor.result as string);
    leitor.onerror = () => falha(leitor.error);
    leitor.readAsDataURL(blob);
  });
}
