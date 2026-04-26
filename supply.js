// Try to load products from backend; fallback to static list
let productsData = [
  { _id: 's1', name: 'MacBook Pro 16"', price: '$2,499.00', image: 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2', category: 'Laptops', stockQuantity: 0, status: 'out_of_stock' },
  { _id: 's2', name: 'Dell UltraSharp Monitor', price: '$899.00', image: 'https://images.unsplash.com/photo-1611648694931-1aeda329f9da', category: 'Monitors', stockQuantity: 0, status: 'out_of_stock' },
  { _id: 's3', name: 'Mechanical Keyboard', price: '$149.00', image: 'https://images.unsplash.com/photo-1674471361344-209ca7fbfbf1', category: 'Accessories', stockQuantity: 0, status: 'out_of_stock' },
  { _id: 's4', name: 'Wireless Headphones', price: '$349.00', image: 'https://images.unsplash.com/photo-1658927420987-488ade098001', category: 'Accessories', stockQuantity: 0, status: 'out_of_stock' },
  { _id: 's5', name: 'HP EliteBook Laptop', price: '$1,799.00', image: 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2', category: 'Laptops', stockQuantity: 0, status: 'out_of_stock' },
  { _id: 's6', name: 'Samsung Curved Monitor', price: '$699.00', image: 'https://images.unsplash.com/photo-1611648694931-1aeda329f9da', category: 'Monitors', stockQuantity: 0, status: 'out_of_stock' },
  { _id: 's7', name: 'Chair', price: '$199.00', image: 'https://images.unsplash.com/photo-1670946839270-cc4febd43b09', category: 'Accessories', stockQuantity: 0, status: 'out_of_stock' }
];

function buildOptions(list){
  const select = document.getElementById('productId');
  select.innerHTML = list.map(p => {
    const stock = typeof p.stockQuantity !== 'undefined' ? p.stockQuantity : '';
    const status = p.status || '';
    const isDb = String(p._id).match(/^[a-fA-F0-9]{24}$/) ? 'true' : 'false';
    return `<option value="${p._id}" data-name="${escapeHtml(p.name)}" data-category="${escapeHtml(p.category||'')}" data-price="${escapeHtml(String(p.price||''))}" data-image="${escapeHtml(p.image||'') }" data-stock="${stock}" data-status="${status}" data-db="${isDb}">${escapeHtml(p.name)}</option>`;
  }).join('');
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function updateProductPreview(){
  const select = document.getElementById('productId');
  const selected = select.options[select.selectedIndex];
  if(!selected) return;
  const previewImg = document.getElementById('productPreview');
  const name = document.getElementById('productName');
  const category = document.getElementById('productCategory');
  const price = document.getElementById('productPrice');
  const stock = document.getElementById('productStock');
  const status = document.getElementById('productStatus');

  previewImg.src = selected.dataset.image || 'https://via.placeholder.com/200';
  name.textContent = selected.dataset.name || 'Product';
  category.textContent = selected.dataset.category ? 'Category: ' + selected.dataset.category : '';
  price.textContent = selected.dataset.price ? 'Price: ' + selected.dataset.price : '';
  if (stock) stock.textContent = 'Stock: ' + (selected.dataset.stock || '-');
  if (status) status.textContent = 'Status: ' + (selected.dataset.status || '-');
}

document.getElementById('productId').addEventListener('change', updateProductPreview);

async function loadProducts(){
  try{
    const res = await fetch('/api/products');
    if(res.ok){
      const db = await res.json();
      if(Array.isArray(db) && db.length>0){
        // merge DB products with static ones, prefer DB entries when IDs match
        const map = {};
        productsData.forEach(p=>{ map[String(p._id)] = p; });
        db.forEach(p=>{ map[String(p._id)] = p; });
        productsData = Object.values(map);
      }
    }
  }catch(e){ /* ignore, use fallback */ }

  buildOptions(productsData);
  updateProductPreview();
}

// submit handler
document.getElementById('supply-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = e.target;
  const productId = form.productId.value;
  const quantity = Number(form.quantity.value);
  const supplier = form.supplier ? form.supplier.value : '';

  if (!productId) return alert('Please select a product');
  if (!Number.isFinite(quantity) || quantity < 0) return alert('Quantity must not be negative');
  if (quantity === 0) return alert('Quantity must be greater than zero');

  const isDbId = String(productId).match(/^[a-fA-F0-9]{24}$/);

  // If product is static (non-DB), perform local supply (update UI immediately)
  if (!isDbId) {
    const idx = productsData.findIndex(p => String(p._id) === String(productId));
    if (idx !== -1) {
      const p = productsData[idx];
      p.stockQuantity = (typeof p.stockQuantity === 'number' ? p.stockQuantity : 0) + quantity;
      // recalc status
      if (p.stockQuantity === 0) p.status = 'out_of_stock';
      else if (p.stockQuantity > 0 && p.stockQuantity <= 5) p.status = 'low_stock';
      else p.status = 'in_stock';
      // update option dataset
      const opt = document.querySelector(`#productId option[value='${productId}']`);
      if (opt) { opt.dataset.stock = String(p.stockQuantity); opt.dataset.status = p.status; }
      updateProductPreview();
      alert('Product supplied successfully (local).');
    } else {
      alert('Product not found locally');
    }

    // still try to post to backend (non-blocking)
    try{
      fetch('/api/supply', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ productId, supplyQuantity: quantity, supplier }) });
    }catch(e){}

    form.quantity.value = '1';
    return;
  }

  // DB-backed product: call API and update UI from response
  try{
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch('/api/supply', {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId, supplyQuantity: quantity, supplier })
    });
    const data = await res.json().catch(()=>({ message: 'Invalid response' }));
    if (!res.ok){
      if (res.status === 401) return alert('Unauthorized: please login as an admin to add supplies.');
      return alert(data.message || 'Supply failed');
    }

    alert('Product supplied successfully!');
    const updated = data.product;
    if(updated){
      const opt = document.querySelector(`#productId option[value='${updated._id}']`);
      if(opt){ opt.dataset.stock = String(typeof updated.stockQuantity !== 'undefined' ? updated.stockQuantity : ''); opt.dataset.status = updated.status || ''; }
      const idx2 = productsData.findIndex(p => String(p._id) === String(updated._id));
      if(idx2 !== -1) productsData[idx2] = Object.assign({}, productsData[idx2], updated);
      updateProductPreview();
    }
    form.quantity.value = '1';
  }catch(err){
    console.error(err);
    alert('Error while supplying product: ' + (err.message || ''));
  }
});

document.addEventListener('DOMContentLoaded', ()=>{ loadProducts(); });
