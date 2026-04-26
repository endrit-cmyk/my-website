// Produkte statike fillestare
const staticProducts = [
    { _id: 's1', name: 'MacBook Pro 16"', price: '$2,499.00', image: 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', description: 'High-performance laptop for professionals', category: 'Laptops' },
    { _id: 's2', name: 'Dell UltraSharp Monitor', price: '$899.00', image: 'https://images.unsplash.com/photo-1611648694931-1aeda329f9da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', description: '27" 4K display with accurate colors', category: 'Monitors' },
    { _id: 's3', name: 'Mechanical Keyboard', price: '$149.00', image: 'https://images.unsplash.com/photo-1674471361344-209ca7fbfbf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', description: 'Premium typing experience with RGB', category: 'Accessories' },
    { _id: 's4', name: 'Wireless Headphones', price: '$349.00', image: 'https://images.unsplash.com/photo-1658927420987-488ade098001?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', description: 'Noise-cancelling with premium sound', category: 'Accessories' },
    { _id: 's5', name: 'HP EliteBook Laptop', price: '$1,799.00', image: 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', description: 'Business-class performance and security', category: 'Laptops' },
    { _id: 's6', name: 'Samsung Curved Monitor', price: '$699.00', image: 'https://images.unsplash.com/photo-1611648694931-1aeda329f9da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', description: 'Immersive viewing experience', category: 'Monitors' },
    {_id: 's7', name: 'Chair', price: '$199.00', image: 'https://images.unsplash.com/photo-1670946839270-cc4febd43b09?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2hhaXIlMjBmb3IlMjBwY3xlbnwwfHwwfHx8MA%3D%3D', description: 'Ergonomic office chair', category: 'Accessories' }
    
];
    // Do not mark the first two static products as sold; they should only show Add to Cart
  
let allProducts = [...staticProducts]; // fillimisht produktet statike
let currentCategory = 'All';
let searchQuery = '';

// Renderimi i produkteve me butonin "Mark as Sold"

let userRole = localStorage.getItem('role') || 'client';
const firstTwoCartOnlyIds = [staticProducts[0]._id, staticProducts[1]._id];

function renderProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = currentCategory === 'All' || product.category === currentCategory;
        return matchesSearch && matchesCategory;
    });

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    productsGrid.innerHTML = filteredProducts.map(product => {
        const isCartOnly = firstTwoCartOnlyIds.includes(product._id);
        // Determine stock status: prefer explicit `status`, fallback to numeric stockQuantity
        const status = product.status || (typeof product.stockQuantity === 'number' ? (product.stockQuantity === 0 ? 'out_of_stock' : (product.stockQuantity > 0 && product.stockQuantity <=5 ? 'low_stock' : 'in_stock')) : null);
        const isOutOfStock = status === 'out_of_stock' || (typeof product.stockQuantity === 'number' && product.stockQuantity === 0);

        let saleButtonHTML = '';
        let cartButtonHTML = '';

        // Always show Add to Cart; disable if out of stock. Do not use `sold` to hide buttons.
        cartButtonHTML = `<button class="btn-cart" data-id="${product._id}" ${isOutOfStock ? 'disabled' : ''}><i class="fas fa-shopping-cart"></i> Add to Cart</button>`;

      
        return `
        <div class="product-card" data-id="${product._id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <p class="product-price">${product.price}</p>
                ${saleButtonHTML}
                ${cartButtonHTML}
            </div>
        </div>
        `;
    }).join('');

    // 'Mark as Sold' feature removed from UI; sales handled via cart/ backend only

    document.querySelectorAll('.btn-cart').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const productId = btn.dataset.id || e.currentTarget.dataset.id;
        try {
            const token = localStorage.getItem('token'); // token i ruajtur nga login
            if (!token) return alert('Ju duhet të identifikoheni për të shtuar produkt në shportë.');

            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ productId, quantity: 1 })
            });
            if(!res.ok) {
                const err = await res.json().catch(()=>({message:'Cart error'}));
                throw new Error(err.message || 'Cart error');
            }
            const resData = await res.json();
            // If server returned updated product, update local copy and UI
            const returnedProduct = resData.product || (resData.cart && resData.cart.product);
            if (returnedProduct) {
                const idx = allProducts.findIndex(p => String(p._id) === String(returnedProduct._id));
                if (idx !== -1) {
                    allProducts[idx].stockQuantity = returnedProduct.stockQuantity;
                    allProducts[idx].status = returnedProduct.status;
                }
            }
            const found = allProducts.find(p => String(p._id) === String(productId));
            alert(`${found ? found.name : 'Produkt'} was successfully added to the cart!`);
            renderProducts(allProducts);
            try { localStorage.setItem('cartUpdated', Date.now().toString()); } catch(e){}
        } catch(err) {
            console.error(err);
            alert('Gabim gjatë shtimit në shportë. ' + (err.message || ''));
        }
    });
});
};

// Filtrim & Kërkim
function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.category-btn[onclick*="${category}"]`)?.classList.add('active');
    renderProducts(allProducts);
}

function filterProducts() {
    searchQuery = document.getElementById('searchInput').value;
    renderProducts(allProducts);
}

// Shto produkt përmes API
document.getElementById('inventory-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;

    const newProduct = {
        name: form.name.value,
        category: form.category.value,
        price: '$' + parseFloat(form.price.value).toFixed(2),
        description: form.description.value,
        image: form.image.value || 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
    };

    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch('/api/products', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ...newProduct,
                price: parseFloat(form.price.value),
                stockQuantity: 0
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            alert('Error: ' + errData.message);
            return;
        }

        const resData = await res.json();
        const savedProduct = resData.data || resData; 
        allProducts.push(savedProduct);   // shtohet në array lokal
        renderProducts(allProducts);      // rifresko UI
        form.reset();
    } catch (err) {
        console.error(err);
        alert('Server error. Produkti nuk u shtua.');
    }
});

// Funksione mobile menu & scroll
function toggleMobileMenu() {
    const navMobile = document.getElementById('navMobile');
    const hamburger = document.getElementById('hamburger');
    navMobile.classList.toggle('active');
    hamburger.classList.toggle('active');
}

function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('navMobile').classList.remove('active');
    document.getElementById('hamburger').classList.remove('active');
}

// Update year footer
function updateYear() {
    document.getElementById('year').textContent = new Date().getFullYear();
}

// Load nga API dhe render në front-end
async function loadProductsFromAPI() {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const productsFromDB = await res.json();
        allProducts = [...staticProducts, ...productsFromDB]; // bashkon statike + DB
        renderProducts(allProducts);
    } catch (err) {
        console.error(err);
        allProducts = [...staticProducts]; // fallback në statike
        renderProducts(allProducts);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadProductsFromAPI();
    updateYear();
});
