import React from 'react';

type Product = {
  id: number;
  name: string;
  sku: string;
  vendor_code: string;
  price: number;
  sale_price?: number | null;
  category_names?: string[];
  is_active: boolean;
  image_url?: string;
};

type Props = {
  product: Product;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
};

const AdminProductCard: React.FC<Props> = ({ product, onEdit, onDelete }) => {
  const {
    id,
    name,
    sku,
    vendor_code,
    price,
    sale_price,
    category_names,
    is_active,
    image_url,
  } = product;

  return (
    <div className="border rounded-lg shadow-sm hover:shadow-md transition p-4 flex flex-col">
      {/* Product Image */}
      <div className="w-full h-32 bg-gray-100 flex items-center justify-center mb-4">
        {image_url ? (
          <img src={image_url} alt={name} className="object-cover h-full w-full rounded" />
        ) : (
          <span className="text-gray-400">No Image</span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-800 truncate">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">SKU: {sku}</p>
        <p className="text-sm text-gray-500">Vendor: {vendor_code}</p>
        {category_names && category_names.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Categories: {category_names.join(', ')}
          </p>
        )}

        <div className="mt-2 flex items-center space-x-2">
          {sale_price ? (
            <>
              <span className="text-red-600 font-bold">${sale_price.toFixed(2)}</span>
              <span className="line-through text-gray-400">${price.toFixed(2)}</span>
            </>
          ) : (
            <span className="text-gray-800 font-bold">${price.toFixed(2)}</span>
          )}
        </div>

        <p
          className={`mt-2 font-medium ${
            is_active ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {is_active ? 'Active' : 'Inactive'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => onEdit && onEdit(id)}
          className="bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600 transition"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete && onDelete(id)}
          className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default AdminProductCard;
