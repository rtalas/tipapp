/**
 * Client-side image utilities for avatar processing
 */

const MAX_AVATAR_SIZE = 256
const JPEG_QUALITY = 0.8

/**
 * Resize and compress an image to a square JPEG suitable for avatar use.
 * Returns a Blob of the processed image.
 *
 * @param file - The original image file
 * @param maxSize - Maximum width/height (default: 256px)
 * @returns Promise<Blob> - The processed image as a JPEG blob
 */
export async function resizeImageForAvatar(
  file: File,
  maxSize: number = MAX_AVATAR_SIZE
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to create canvas context'))
      return
    }

    img.onload = () => {
      // Calculate crop dimensions to create a square
      const minDimension = Math.min(img.width, img.height)
      const sx = (img.width - minDimension) / 2
      const sy = (img.height - minDimension) / 2

      // Set canvas size
      canvas.width = maxSize
      canvas.height = maxSize

      // Draw cropped and resized image
      ctx.drawImage(
        img,
        sx,
        sy,
        minDimension,
        minDimension,
        0,
        0,
        maxSize,
        maxSize
      )

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create image blob'))
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Load the image from file
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Validate that a file is an acceptable image type
 */
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  return validTypes.includes(file.type)
}

/**
 * Maximum raw file size before processing (5MB)
 */
export const MAX_RAW_FILE_SIZE = 5 * 1024 * 1024

/**
 * Check if file size is within acceptable limits
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_RAW_FILE_SIZE
}
