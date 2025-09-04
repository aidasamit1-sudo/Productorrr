import { useState, useEffect } from 'react';
import { Download, ExternalLink, Calendar, CreditCard } from 'lucide-react';
import { GeneratedImage } from '@/shared/types';

export default function ImageGallery() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Creations</h2>
            <p className="text-sm text-gray-500">{images.length} generated images</p>
          </div>
          <button
            onClick={fetchImages}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Refresh
          </button>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
            <p className="text-gray-500">Generate your first product photo above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
                  <img
                    src={image.imageUrl}
                    alt={image.originalPrompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-colors flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
                      {image.resolution}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {image.originalPrompt}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 capitalize">
                      {image.generationType}
                    </span>
                    <span className="text-xs text-purple-600 font-medium">
                      {image.creditsUsed} credits
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="max-w-4xl max-h-full bg-white rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Generated Image
                  </h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(selectedImage.createdAt)}</span>
                    </div>
                    <span className="text-sm text-purple-600 font-medium">
                      {selectedImage.creditsUsed} credits used
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => downloadImage(
                    selectedImage.imageUrl,
                    `pixelforge-${selectedImage.id}.png`
                  )}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="aspect-auto max-h-96 rounded-xl overflow-hidden mb-4">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.originalPrompt}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Prompt
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                    {selectedImage.originalPrompt}
                  </p>
                </div>

                {selectedImage.enhancedPrompt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enhanced Prompt
                    </label>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {selectedImage.enhancedPrompt}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Resolution:</span>
                    <span className="ml-2 font-medium">{selectedImage.resolution}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Style:</span>
                    <span className="ml-2 font-medium capitalize">{selectedImage.generationType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
