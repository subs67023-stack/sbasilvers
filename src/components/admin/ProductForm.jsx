import { useState, useEffect } from 'react';
import api from '../../utils/api';

const convertDriveUrl = (url) => {
  if (!url) return '';

  let id = null;

  // 1) /file/d/FILE_ID/
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) id = fileMatch[1];

  // 2) open?id=FILE_ID
  const openMatch = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) id = openMatch[1];

  // 3) uc?id=FILE_ID
  const ucMatch = url.match(/uc\?id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) id = ucMatch[1];

  // 4) docs/anything/d/FILE_ID/
  const docsMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) id = docsMatch[1];

  // 5) thumbnail?id=FILE_ID
  const thumbMatch = url.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/);
  if (thumbMatch) id = thumbMatch[1];

  if (!id) return url;

  // FIX: image-previewable Google Drive link
  return `https://drive.google.com/uc?export=view&id=${id}`;
};

const ProductForm = ({ initialData, onSubmit, loading }) => {
  const [categories, setCategories] = useState([]);
  const [imageUrls, setImageUrls] = useState(['', '', '', '', '']);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    silverWeight: '',
    categoryId: '',
    stock: '',
    sku: '',
    isFeatured: false,
    isActive: true,
  });

  useEffect(() => {
    fetchCategories();
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || '',
        silverWeight: initialData.silverWeight || '',
        categoryId: initialData.categoryId || '',
        stock: initialData.stock || '',
        sku: initialData.sku || '',
        isFeatured: initialData.isFeatured || false,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
      
      if (initialData.images && Array.isArray(initialData.images)) {
        const loadedUrls = [...initialData.images];
        while (loadedUrls.length < 5) loadedUrls.push('');
        setImageUrls(loadedUrls.slice(0, 5));
      }
    }
  }, [initialData]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories');
      setCategories(response.data.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleImageChange = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validImages = imageUrls
      .filter(url => url.trim() !== '')
      .map(url => convertDriveUrl(url));

    if (validImages.length === 0) {
      alert('Please add at least one product image');
      return;
    }

    const submitData = {
      ...formData,
      images: validImages
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Elegant Silver Ring"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Elegant silver ring with intricate floral design..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price ($) *
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="42.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Silver Weight (grams) *
          </label>
          <input
            type="number"
            name="silverWeight"
            value={formData.silverWeight}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="8.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock Quantity *
          </label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            required
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="15"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SKU (Stock Keeping Unit)
          </label>
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="LAD-RING-001"
          />
        </div>

        <div className="md:col-span-2 space-y-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Images (4-5 images recommended) *
          </label>
          <p className="text-xs text-gray-500 mb-3">
            💡 Google Drive: Share link → Copy → Paste here (auto-converted)
          </p>
          
          {imageUrls.map((url, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600 w-20">
                Image {index + 1}:
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => handleImageChange(index, e.target.value)}
                required={index === 0}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={index === 0 ? "Required" : "Optional"}
              />
              {url && (
                <div className="w-12 h-12 border rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img 
                    src={convertDriveUrl(url)} 
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      e.target.style.display = 'block';
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<span class="text-xs text-gray-400">Preview unavailable</span>';
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="md:col-span-2 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isFeatured"
              checked={formData.isFeatured}
              onChange={handleChange}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Featured Product</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active Product</span>
          </label>
        </div>

      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Product'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
