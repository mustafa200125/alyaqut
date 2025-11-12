import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { toast } from 'sonner';

const ImageCropDialog = ({ open, onClose, imageSrc, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [targetSize, setTargetSize] = useState(400); // Default size

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas size to target size
      canvas.width = targetSize;
      canvas.height = targetSize;

      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        targetSize,
        targetSize
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            resolve(reader.result);
          };
        }, 'image/jpeg', 0.95);
      });
    } catch (e) {
      console.error(e);
      toast.error('فشل قص الصورة');
      return null;
    }
  };

  const handleSave = async () => {
    const croppedImage = await createCroppedImage();
    if (croppedImage) {
      onCropComplete(croppedImage);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">قص وتحديد حجم الصورة</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Crop Area */}
          <div className="relative h-96 bg-slate-900 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteInternal}
            />
          </div>

          {/* Zoom Control */}
          <div>
            <Label className="text-slate-200 mb-2 block">التكبير/التصغير</Label>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Size Selection */}
          <div>
            <Label className="text-slate-200 mb-2 block">حجم الصورة النهائي (بكسل)</Label>
            <div className="grid grid-cols-4 gap-2">
              {[200, 300, 400, 500].map((size) => (
                <Button
                  key={size}
                  onClick={() => setTargetSize(size)}
                  variant={targetSize === size ? 'default' : 'outline'}
                  className={
                    targetSize === size
                      ? 'btn-sapphire'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  }
                >
                  {size}x{size}
                </Button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              الحجم الحالي: {targetSize}x{targetSize} بكسل
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              className="btn-sapphire"
            >
              حفظ وتطبيق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to create image element
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export default ImageCropDialog;
