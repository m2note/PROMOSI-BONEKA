import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { GeneratedImageGallery } from './components/GeneratedImageGallery';
import { PersonIcon } from './components/icons/PersonIcon';
import { ProductIcon } from './components/icons/ProductIcon';
import { Spinner } from './components/icons/Spinner';
import { generatePromotionalImages } from './services/geminiService';
import type { ImageFile, AspectRatio } from './types';

const backgroundOptions = {
    'Ruangan mewah dengan nuansa Islami, menampilkan pola geometris yang rumit, lengkungan yang elegan, dan pencahayaan yang lembut dan hangat': 'Ruang Tamu Islami Mewah',
    'A beautiful white sand beach with turquoise water': 'Pantai Pasir Putih',
    'A lush green field with the Eiffel Tower in the background, Paris, France': 'Taman Menara Eiffel',
    'An infinity pool with clear blue water under a bright sunny sky': 'Kolam Renang Infinity',
    'A cozy indoor living room with a comfortable sofa': 'Ruang Tamu Nyaman',
    'A stylish indoor bedroom with soft lighting': 'Kamar Tidur Bergaya',
    'An outdoor flower garden bursting with colorful blooms': 'Taman Bunga',
};

const aspectRatioOptions: { value: AspectRatio, name: string }[] = [
    { value: '9:16', name: '9:16 (Vertikal)' },
    { value: '16:9', name: '16:9 (Horizontal)' },
    { value: '1:1', name: '1:1 (Persegi)' },
];


const App: React.FC = () => {
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [dollImage, setDollImage] = useState<ImageFile | null>(null);
  const [background, setBackground] = useState<string>(Object.keys(backgroundOptions)[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!modelImage || !dollImage) {
      setError('Silakan unggah gambar model dan produk.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generatePromotionalImages(modelImage, dollImage, background, aspectRatio);
      setGeneratedImages(images);
    } catch (err) {
      console.error(err);
      setError('Gagal menghasilkan gambar. Silakan periksa konsol untuk detailnya.');
    } finally {
      setIsLoading(false);
    }
  }, [modelImage, dollImage, background, aspectRatio]);

  const processImageTo9x16 = (dataUrl: string, mimeType: string): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = dataUrl;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const targetAspectRatio = 9 / 16;

            // Use a fixed high-resolution canvas for quality
            const canvasWidth = 720;
            const canvasHeight = 1280;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Tidak bisa mendapatkan konteks kanvas'));
            }

            // Fill background with black
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Calculate new dimensions to fit the image inside the canvas
            const imageAspectRatio = image.width / image.height;
            let drawWidth = canvasWidth;
            let drawHeight = canvasHeight;

            if (imageAspectRatio > targetAspectRatio) {
                // Image is wider than target, fit to width
                drawHeight = canvasWidth / imageAspectRatio;
            } else {
                // Image is taller than or equal to target, fit to height
                drawWidth = canvasHeight * imageAspectRatio;
            }

            const x = (canvasWidth - drawWidth) / 2;
            const y = (canvasHeight - drawHeight) / 2;

            ctx.drawImage(image, x, y, drawWidth, drawHeight);

            const newDataUrl = canvas.toDataURL(mimeType, 0.95);
            
            resolve({
                base64: newDataUrl.split(',')[1],
                mimeType: mimeType,
                previewUrl: newDataUrl
            });
        };
        image.onerror = (error) => {
            console.error('Error loading image for processing:', error);
            reject(new Error('Tidak dapat memuat gambar untuk diproses.'));
        };
    });
  };

  const fileHandler = async (file: File, callback: (result: ImageFile) => void) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        try {
            const originalDataUrl = reader.result as string;
            const processedImage = await processImageTo9x16(originalDataUrl, file.type);
            callback(processedImage);
        } catch (processError) {
             console.error('Error processing image:', processError);
             setError((processError as Error).message || 'Terjadi kesalahan yang tidak diketahui saat pemrosesan gambar.');
        }
    };
    reader.onerror = (error) => {
      console.error('Error converting file to base64:', error);
      setError('Tidak dapat membaca file yang dipilih.');
    };
  };

  const handleModelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      fileHandler(e.target.files[0], setModelImage);
    }
  };

  const handleDollImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      fileHandler(e.target.files[0], setDollImage);
    }
  };
  
  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSingle = (imageUrl: string, index: number) => {
    downloadImage(imageUrl, `pajangan-promoshot-${index + 1}.png`);
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((imageUrl, index) => {
        downloadImage(imageUrl, `pajangan-promoshot-${index + 1}.png`);
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex flex-col items-center p-4 sm:p-8 text-gray-200">
      <main className="container mx-auto max-w-6xl w-full">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-100 tracking-tight">
            Pajangan <span className="text-pink-500">Promoshot</span>
          </h1>
          <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
            Buat gambar promosi yang menakjubkan dan realistis untuk produk pajangan Anda dalam sekejap.
          </p>
        </header>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6">
            <ImageUploader
              id="model-uploader"
              title="Upload Model"
              icon={<PersonIcon />}
              imagePreviewUrl={modelImage?.previewUrl}
              onChange={handleModelImageChange}
              aspectRatio={aspectRatio}
            />
            <ImageUploader
              id="doll-uploader"
              title="Upload Produk Pajangan"
              icon={<ProductIcon />}
              imagePreviewUrl={dollImage?.previewUrl}
              onChange={handleDollImageChange}
              aspectRatio={aspectRatio}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
            <div>
                <label htmlFor="background-selector" className="block text-lg font-semibold text-gray-300 mb-2 text-center">
                    Pilih Latar Belakang
                </label>
                <select
                    id="background-selector"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-pink-500 focus:border-pink-500"
                >
                    {Object.entries(backgroundOptions).map(([value, name]) => (
                        <option key={value} value={value}>{name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="ratio-selector" className="block text-lg font-semibold text-gray-300 mb-2 text-center">
                    Pilih Rasio Aspek
                </label>
                <select
                    id="ratio-selector"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-pink-500 focus:border-pink-500"
                >
                    {aspectRatioOptions.map(({ value, name }) => (
                        <option key={value} value={value}>{name}</option>
                    ))}
                </select>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleGenerate}
              disabled={!modelImage || !dollImage || isLoading}
              className="relative inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white bg-pink-500 rounded-full hover:bg-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-300 shadow-md"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  Membuat...
                </>
              ) : (
                'Buat 6 Pose'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 text-center text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30">
              <p>{error}</p>
            </div>
          )}
        </div>
        
        {generatedImages.length > 0 && !isLoading && (
            <div className="text-center mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                    onClick={handleDownloadAll}
                    className="inline-flex items-center justify-center px-8 py-3 text-md font-bold text-white bg-green-500 rounded-full hover:bg-green-600 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 shadow-md"
                >
                    Unduh Semua
                </button>
                <button
                    onClick={handleGenerate}
                    className="inline-flex items-center justify-center px-8 py-3 text-md font-bold text-pink-500 bg-transparent border-2 border-pink-500 rounded-full hover:bg-pink-500/10 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-800 shadow-md"
                >
                    Buat Lagi
                </button>
            </div>
        )}

        <GeneratedImageGallery images={generatedImages} isLoading={isLoading} onDownload={handleDownloadSingle} aspectRatio={aspectRatio}/>
      </main>

      <footer className="text-center mt-12 text-gray-400">
        <p>Didukung oleh Gemini API</p>
      </footer>
    </div>
  );
};

export default App;