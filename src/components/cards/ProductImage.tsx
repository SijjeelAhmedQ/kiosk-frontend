import { useState } from 'react';
import type { Product } from '@/types';
import { toImageSrc } from '@/utils/imageSrc';

interface ProductImageProps {
  product: Pick<Product, 'image' | 'imgBase64'>;
  imgClassName?: string;
  fallbackClassName?: string;
}

/**
 * Artwork when there is any, the emoji otherwise. Resolution order is
 * `imgBase64` (inline) → `image` (a URL) → `image` rendered as the emoji it
 * usually is. A broken image falls back to the emoji rather than an empty box.
 *
 * Categories run through here too (see CategoryCard), so both catalogues
 * resolve their pictures by exactly the same rule.
 */
export function ProductImage({ product, imgClassName, fallbackClassName }: ProductImageProps) {
  const [imageBroken, setImageBroken] = useState(false);

  const artwork = imageBroken
    ? null
    : toImageSrc(product.imgBase64) ?? toImageSrc(product.image);

  if (!artwork) {
    return <span className={fallbackClassName}>{product.image}</span>;
  }

  return (
    <img
      src={artwork}
      alt=""
      loading="lazy"
      onError={() => setImageBroken(true)}
      className={imgClassName}
    />
  );
}
