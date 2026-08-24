"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { medusaRequest } from "../lib/browser-medusa";

export type ProductModalVariant = {
  id: string;
  title: string;
  sku: string;
  price: number | null;
  originalPrice: number | null;
  image: string;
  inventoryQuantity: number;
};

export type ProductModalData = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  brand: string;
  category: string;
  image: string;
  images: string[];
  videoUrl: string;
  ingredients: string;
  usageInstructions: string;
  skinType: string;
  sellingPoint: string;
  netContent: string;
  shelfLife: string;
  periodAfterOpening: string;
  cprNumber: string;
  listingType: string;
  variants: ProductModalVariant[];
};

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  images: string[];
};

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const skinTypeLabels: Record<string, string> = {
  all: "All skin types",
  dry: "Dry skin",
  oily: "Oily skin",
  combination: "Combination skin",
  sensitive: "Sensitive skin",
  normal: "Normal skin",
};

export function ProductDetailsModal({ products }: { products: ProductModalData[] }) {
  const [productId, setProductId] = useState<string | null>(null);
  const [image, setImage] = useState("");
  const [variantId, setVariantId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const product = useMemo(
    () => products.find((item) => item.id === productId) || null,
    [productId, products],
  );
  const variant = product?.variants.find((item) => item.id === variantId) || product?.variants[0];

  useEffect(() => {
    const openProduct = (id: string) => {
      const selected = products.find((item) => item.id === id);
      if (!selected) return;
      setProductId(id);
      setImage(selected.image);
      setVariantId(selected.variants[0]?.id || "");
      setReviews([]);
      medusaRequest<{ reviews: Review[] }>(`/store/reviews?product_id=${encodeURIComponent(id)}`).then((data) => setReviews(data.reviews || [])).catch(() => setReviews([]));
    };
    const click = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest("[data-price], a, button, input, select, textarea")) return;
      const card = target.closest<HTMLElement>(".shop-card[data-product-id], .flash-product[data-product-id], .product-card[data-product-id]");
      if (card?.dataset.productId) openProduct(card.dataset.productId);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProductId(null);
      if ((event.key === "Enter" || event.key === " ") && event.target instanceof HTMLElement) {
        const card = event.target.closest<HTMLElement>(".shop-card[data-product-id], .flash-product[data-product-id], .product-card[data-product-id]");
        if (card?.dataset.productId) {
          event.preventDefault();
          openProduct(card.dataset.productId);
        }
      }
    };
    const requestedProductId = new URLSearchParams(window.location.search).get("product");
    if (requestedProductId) openProduct(requestedProductId);
    document.addEventListener("click", click);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("keydown", keydown);
    };
  }, [products]);

  useEffect(() => {
    if (!product) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [product]);

  useEffect(() => {
    if (!productId) return;
    requestAnimationFrame(() => document.dispatchEvent(new CustomEvent("km-cart-refresh")));
  }, [productId, variantId]);

  if (!product) return null;

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const details = [
    ["Skin type", skinTypeLabels[product.skinType] || product.skinType],
    ["Net content", product.netContent],
    ["Shelf life", product.shelfLife],
    ["After opening", product.periodAfterOpening],
    ["CPR number", product.cprNumber],
    ["Listing type", product.listingType],
  ].filter(([, value]) => value);

  return (
    <div className="product-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setProductId(null);
    }}>
      <section aria-labelledby="product-modal-title" aria-modal="true" className="product-modal" role="dialog">
        <button ref={closeButtonRef} className="product-modal-close" onClick={() => setProductId(null)} type="button" aria-label="Close product details">×</button>
        <div className="product-modal-top">
          <div className="product-modal-gallery">
            <div className="product-modal-main-media">
              <img src={image || product.image} alt={product.title} />
            </div>
            {product.images.length > 1 ? (
              <div className="product-modal-thumbs" aria-label="Product images">
                {product.images.map((url) => (
                  <button className={url === image ? "active" : ""} key={url} onClick={() => setImage(url)} type="button">
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="product-modal-summary">
            <span className="product-modal-brand">{product.brand} · {product.category}</span>
            <h2 id="product-modal-title">{product.title}</h2>
            {product.subtitle ? <p className="product-modal-subtitle">{product.subtitle}</p> : null}
            <button className="product-rating-summary" type="button" onClick={() => document.querySelector("#product-reviews")?.scrollIntoView({ behavior: "smooth" })}>
              <span aria-label={`${average.toFixed(1)} out of 5 stars`}>{reviews.length ? "★".repeat(Math.round(average)) + "☆".repeat(5 - Math.round(average)) : "☆☆☆☆☆"}</span>
              <b>{reviews.length ? average.toFixed(1) : "New"}</b>
              <small>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</small>
            </button>
            {product.sellingPoint ? <p className="product-modal-selling-point">{product.sellingPoint}</p> : null}
            {product.description ? <p className="product-modal-description">{product.description}</p> : null}
            {product.variants.length > 1 ? (
              <fieldset className="product-modal-variant">
                <legend>Choose an option</legend>
                <div className="product-variant-tiles">
                  {product.variants.map((item) => (
                    <button className={item.id === variant?.id ? "active" : ""} key={item.id} onClick={() => setVariantId(item.id)} type="button">
                      <img src={item.image || product.image} alt="" />
                      <span>{item.title}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div className="product-modal-price">
              <strong>{variant?.price === null || variant?.price === undefined ? "Price unavailable" : money.format(variant.price)}</strong>
              {variant?.originalPrice && variant.price !== null && variant.originalPrice > variant.price ? <del>{money.format(variant.originalPrice)}</del> : null}
              {variant?.sku ? <small>SKU {variant.sku}</small> : null}
            </div>
            <button className="product-modal-cart" type="button" data-price={variant?.price ?? 0} data-stock={variant?.inventoryQuantity ?? 0} data-name={`${product.title}${variant?.title ? ` · ${variant.title}` : ""}`} data-image={variant?.image || product.image} data-product-id={product.id} data-variant-id={variant?.id || ""} disabled={variant?.price === null || !variant?.id || !variant.inventoryQuantity}>{variant?.inventoryQuantity ? "Add to cart" : "Out of stock"}</button>
            {details.length ? <dl className="product-modal-facts">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
          </div>
        </div>

        <div className="product-modal-content">
          {product.ingredients ? <article><span>What’s inside</span><h3>Ingredients</h3><p>{product.ingredients}</p></article> : null}
          {product.usageInstructions ? <article><span>How to use</span><h3>Usage instructions</h3><p>{product.usageInstructions}</p></article> : null}
          {product.videoUrl ? <article className="product-modal-video"><span>See it in action</span><h3>Product video</h3><video controls preload="metadata" src={product.videoUrl} /></article> : null}
        </div>

        <section className="product-reviews" id="product-reviews">
          <div className="product-reviews-head">
            <div><span>Real customer feedback</span><h3>Ratings & reviews</h3></div>
            <div><strong>{reviews.length ? average.toFixed(1) : "—"}</strong><span>{reviews.length ? "★".repeat(Math.round(average)) + "☆".repeat(5 - Math.round(average)) : "☆☆☆☆☆"}</span><small>Based on {reviews.length} reviews</small></div>
          </div>
          <div className="product-reviews-grid product-reviews-readonly">
            <div className="product-review-list">
              {reviews.length ? reviews.map((review) => <article key={review.id}><div><b>{review.customer_name.slice(0, 1).toUpperCase()}</b><p><strong>{review.customer_name}</strong><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></p><time>{new Date(review.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</time></div><p>{review.comment}</p>{review.images?.length ? <div className="product-review-images">{review.images.map((url) => <a href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt="Customer review" /></a>)}</div> : null}</article>) : <div className="product-review-empty"><b>No customer reviews yet.</b><p>Verified customers can review this product from My Orders after delivery.</p></div>}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
