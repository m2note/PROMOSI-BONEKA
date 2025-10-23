import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageFile, AspectRatio } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const POSES_PROMPTS = [
  "memegang produk pajangan dengan kedua tangan, menunjukkannya ke kamera dengan senyum bangga, seluruh badan.",
  "duduk di kursi modern, meletakkan produk pajangan di meja kecil di sebelahnya, sambil menunjuk ke arahnya.",
  "dalam bidikan close-up, memegang produk pajangan di dekat wajahnya, menyoroti detailnya.",
  "berdiri dan memegang produk pajangan setinggi dada, menatapnya dengan kekaguman.",
  "mempresentasikan produk pajangan seolah-olah dalam iklan TV, dengan satu tangan menunjukkannya.",
  "menata produk pajangan di rak sebagai bagian dari dekorasi rumah.",
];

async function generateSingleImage(modelImage: ImageFile, dollImage: ImageFile, posePrompt: string, background: string, aspectRatio: AspectRatio): Promise<string> {
    const model = 'gemini-2.5-flash-image';
    
    const getRatioDescription = (ratio: AspectRatio) => {
        switch (ratio) {
            case '16:9': return 'horizontal 16:9 landscape';
            case '1:1': return 'square 1:1';
            case '9:16':
            default: return 'vertical 9:16 portrait';
        }
    }

    const textPrompt = `Hasilkan satu gambar tunggal yang fotorealistis dan berkualitas promosi.

**Perintah Utama: Rasio aspek gambar keluaran HARUS ${getRatioDescription(aspectRatio)}. Ini adalah persyaratan yang ketat dan tidak dapat dinegosiasikan.**

**Konten Gambar:**
- **Orang:** Harus orang yang *sama persis* dari gambar masukan pertama.
- **Produk Pajangan:** Harus *produk pajangan yang sama persis* dari gambar masukan kedua.
- **Aksi:** Orang tersebut sedang ${posePrompt}.
- **Latar Belakang:** Pengaturannya adalah **${background}**.

**Gaya Artistik & Batasan:**
- **Realisme:** Produk harus ditampilkan dengan jelas dan menarik. Pencahayaan harus profesional dan bersih, cocok untuk iklan produk, menciptakan suasana yang menarik.
- **Konsistensi:** Pertahankan penampilan persis orang dan produk pajangan dari gambar sumber.
- **Kualitas:** Gambar akhir harus beresolusi tinggi dan cocok untuk penggunaan promosi profesional.
- **Format:** Hanya keluarkan data gambar.`;

    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                { inlineData: { data: dollImage.base64, mimeType: dollImage.mimeType } },
                { text: textPrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    
    throw new Error('Image generation failed, no image data returned.');
}

export async function generatePromotionalImages(modelImage: ImageFile, dollImage: ImageFile, background: string, aspectRatio: AspectRatio): Promise<string[]> {
  const imagePromises = POSES_PROMPTS.map(prompt => 
    generateSingleImage(modelImage, dollImage, prompt, background, aspectRatio)
  );

  const results = await Promise.all(imagePromises);
  return results;
}