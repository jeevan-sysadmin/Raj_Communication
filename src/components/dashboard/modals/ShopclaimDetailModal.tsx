import ClaimProductDetailModal from "./ClaimProductDetailModal";
import type { Order, Product } from "../types";

interface ShopclaimDetailModalProps {
  product: Product;
  relatedOrders: Order[];
  onClose: () => void;
}

const ShopclaimDetailModal = ({ product, relatedOrders, onClose }: ShopclaimDetailModalProps) => (
  <ClaimProductDetailModal
    product={product}
    relatedOrders={relatedOrders}
    title="Shop Claim Product"
    accentColor="#d97706"
    onClose={onClose}
  />
);

export default ShopclaimDetailModal;
