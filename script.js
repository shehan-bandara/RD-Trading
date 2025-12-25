/* =========================================
   GLOBAL VARIABLES & CONSTANTS
   ========================================= */
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQqM7coEa0FULo0Aiw_Tmfl80pdTrUOC5nfO4GqciqasKmiL1q6EE2T3B8yW15Lpehy2nUejpkvSmUA/pub?output=csv';
let products = []; // Populated via fetchData
let slideIndex = 0;

/* =========================================
   PAGE INITIALIZATION
   ========================================= */
document.addEventListener("DOMContentLoaded", function () {
    // 1. Load Components
    loadHeader();
    loadComponent("footer-container", "footer.html");

    // 2. Initialize Data
    if (typeof fetchData === 'function') {
        fetchData();
    }

    // 3. Initialize UI Elements
    updateFavCount(); // Initial badge update
    initSlider();     // Start slider if present
});

/* =========================================
   DATA FETCHING & PROCESSING
   ========================================= */
async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        products = csvToJson(data);
        initPage(); // Render content after data is loaded
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback for demo purposes if fetch fails
        products = [
            { id: 1, category: 'whiteboard', name: 'Standard White Board', price: 3500, image: 'https://via.placeholder.com/250' },
            { id: 2, category: 'greenboard', name: 'Green Chalk Board', price: 4500, image: 'https://via.placeholder.com/250' }
        ];
        initPage();
    }
}

function csvToJson(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const obj = {};
        const currentline = lines[i].split(',');

        for (let j = 0; j < headers.length; j++) {
            let val = currentline[j] ? currentline[j].trim() : '';
            if (headers[j] === 'price' || headers[j] === 'id') {
                val = parseFloat(val) || 0;
            }
            obj[headers[j]] = val;
        }
        result.push(obj);
    }
    return result;
}

/* =========================================
   COMPONENT LOADERS
   ========================================= */
// Special Loader for Header (Needs extra logic like highlighting links)
function loadHeader() {
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    fetch("header.html")
        .then(response => {
            if (!response.ok) throw new Error("Could not load header.html");
            return response.text();
        })
        .then(html => {
            headerContainer.innerHTML = html;
            // Run post-load logic
            highlightActiveLinks();
            if (typeof updateFavCount === 'function') updateFavCount();
        })
        .catch(error => console.error("Header Error:", error));
}

// Generic Loader for simple components (like Footer)
function loadComponent(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error("Could not load " + filePath);
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
        })
        .catch(err => console.error("Error loading " + filePath, err));
}

/* =========================================
   RENDERING LOGIC
   ========================================= */
// Logic to decide which page renders
function initPage() {
    const shopGrid = document.getElementById('shop-grid');
    if (shopGrid) {
        renderShop(products);
    } else {
        renderHomePage();
    }
}

function renderHomePage() {
    // 1. Get all unique categories from your data
    const dynamicCategories = [...new Set(products.map(p => p.category))];

    // 2. Also include your hardcoded ones to be safe
    const hardcodedCategories = ['whiteboard', 'greenboard', 'partition', 'carrom', 'chess', 'noticeboard', 'easel', 'other'];

    // Combine them to cover all bases
    const allCategories = [...new Set([...dynamicCategories, ...hardcodedCategories])];

    allCategories.forEach(cat => {
        // Try to find a container with this ID (e.g., "whiteboard-grid")
        const container = document.getElementById(`${cat}-grid`);

        if (container) {
            const list = products.filter(p => p.category === cat).slice(0, 4);

            if (list.length > 0) {
                container.innerHTML = list.map(p => createCardHTML(p)).join('');
                // Ensure the parent section is visible
                if (container.closest('section')) {
                    container.closest('section').style.display = 'block';
                }
            } else {
                // If no products, hide the entire section so it doesn't look empty
                if (container.closest('section')) {
                    container.closest('section').style.display = 'none';
                }
            }
        } else {
            // Optional: Log if a category exists in sheets but has no HTML container
            console.warn(`Category found in sheet: "${cat}", but no <div id="${cat}-grid"> found in HTML.`);
        }
    });
}

// Shop Page Rendering
function renderShop(list) {
    const container = document.getElementById('shop-grid');
    const countSpan = document.getElementById('product-count');

    if (countSpan) countSpan.innerText = list.length;

    if (list.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <i class="fas fa-box-open" style="font-size: 40px; color: #ccc; margin-bottom: 20px;"></i>
                <p>No products found in this category.</p>
                <button onclick="filterProducts('all')" class="btn-options" style="max-width:200px; margin:auto; cursor:pointer;">View All Products</button>
            </div>`;
        return;
    }
    container.innerHTML = list.map(p => createCardHTML(p)).join('');
}

// Sidebar Filter Logic
window.filterProducts = function (category) {
    // 1. Update Active Class
    document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.category-list li')).find(li => li.textContent.toLowerCase().includes(category === 'all' ? 'all' : category));
    if (activeBtn) activeBtn.classList.add('active');

    // 2. Filter Data
    let filteredList = products;
    if (category !== 'all') {
        filteredList = products.filter(p => p.category === category);
    }

    renderShop(filteredList);

    // Close mobile menu if open
    toggleMobileMenu();
};

function createCardHTML(product) {
    let favorites = JSON.parse(localStorage.getItem('scanLankaFavs')) || [];
    const isFav = favorites.some(fav => fav.id === product.id) ? 'active' : '';

    return `
        <div class="product-card">
            <div class="btn-fav ${isFav}" onclick="toggleLike(${product.id}, this)">
                <i class="fas fa-heart"></i>
            </div>
            <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/250x200?text=No+Image'" loading="lazy">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">Rs.${product.price.toLocaleString()}.00</div>
            <a href="https://wa.me/94740611225?text=Hi RD Trading, I am interested in ${product.name}" class="btn-options" target="_blank">
                ENQUIRE NOW <i class="fab fa-whatsapp"></i>
            </a>
        </div>
    `;
}

/* =========================================
   FAVORITES SYSTEM
   ========================================= */
window.toggleLike = function (id, btnElement) {
    // Stop event bubbling so card click doesn't trigger
    if (window.event) window.event.stopPropagation();

    let favorites = JSON.parse(localStorage.getItem('scanLankaFavs')) || [];
    const product = products.find(p => p.id === id);
    const index = favorites.findIndex(fav => fav.id === id);

    if (index === -1) {
        if (product) favorites.push(product);
        btnElement.classList.add('active');
    } else {
        favorites.splice(index, 1);
        btnElement.classList.remove('active');
    }

    localStorage.setItem('scanLankaFavs', JSON.stringify(favorites));
    updateFavCount();

    // Refresh modal if open
    const modal = document.getElementById('favorites-modal');
    if (modal && modal.style.display === 'block') {
        renderFavoritesList();
    }
};

function updateFavCount() {
    let favorites = JSON.parse(localStorage.getItem('scanLankaFavs')) || [];
    document.querySelectorAll('.badge').forEach(el => {
        el.textContent = favorites.length;
    });
}

// Global Toggle Favorites (Handles modal display and rendering)
window.toggleFavorites = function () {
    const modal = document.getElementById("favorites-modal");
    if (!modal) return;

    if (modal.style.display === "block") {
        modal.style.display = "none";
        document.body.style.overflow = "";
    } else {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
        renderFavoritesList();
    }

    // Close mobile menu if open
    const sidebar = document.getElementById('mobileSidebar');
    if (sidebar && sidebar.classList.contains('open')) toggleMobileMenu();
};

window.renderFavoritesList = function () {
    let favorites = JSON.parse(localStorage.getItem('scanLankaFavs')) || [];
    const list = document.getElementById('favorites-list');

    if (!list) return;

    if (favorites.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Your wishlist is empty.</p>';
        return;
    }

    let html = '';
    favorites.forEach(item => {
        html += `
            <div class="fav-item" style="display:flex; flex-direction:column; gap:10px; border-bottom:1px solid #eee; padding:15px;">
                <div style="display:flex; align-items:center; gap:15px; width:100%;">
                    <img src="${item.image}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                    <div style="flex:1;">
                        <h4 style="margin:0; font-size:14px; color:#333;">${item.name}</h4>
                        <span style="font-weight:bold; color:var(--primary-green);">Rs ${item.price.toLocaleString()}</span>
                    </div>
                    <button onclick="toggleLike(${item.id}, this)" style="border:none; background:none; color:#e74c3c; cursor:pointer; font-size:18px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <a href="https://wa.me/94740611225?text=Hi RD Traders, I want to buy ${item.name} " 
                   class="btn-options" target="_blank" style="padding: 8px 12px; font-size: 12px; text-align:center;">
                    ENQUIRE NOW <i class="fab fa-whatsapp"></i>
                </a>
            </div>
        `;
    });
    list.innerHTML = html;
};

/* =========================================
   UI & NAVIGATION FUNCTIONS
   ========================================= */
// Function to highlight the current page link (Desktop & Mobile)
function highlightActiveLinks() {
    let currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "" || currentPage === "/") currentPage = "index.html";

    // 1. Highlight Desktop Link
    const activeDesktop = document.querySelector(`.navbar a[data-page="${currentPage}"]`);
    if (activeDesktop) activeDesktop.classList.add('active');

    // 2. Highlight Mobile Link
    const activeMobile = document.querySelector(`.mobile-links a[data-mobile-page="${currentPage}"]`);
    if (activeMobile) {
        activeMobile.style.color = "var(--primary-blue)";
        activeMobile.style.fontWeight = "bold";
    }
}

// Mobile Menu Functions (Open/Close by ID)
function openMobileMenu() {
    document.getElementById('mobileSidebar').classList.add('active');
    document.getElementById('mobileMenuOverlay').classList.add('active');
}

function closeMobileMenu() {
    document.getElementById('mobileSidebar').classList.remove('active');
    document.getElementById('mobileMenuOverlay').classList.remove('active');
}

// Mobile Menu Toggle (Toggles Class 'open')
window.toggleMobileMenu = function () {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.querySelector('.mobile-overlay');

    if (!sidebar) return;

    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const clickedBtn = window.event.target.closest('button');
    if (clickedBtn) clickedBtn.classList.add('active');

    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');
};

// Scroll To Top
window.onscroll = function () {
    const btn = document.getElementById("scrollTopBtn") || document.querySelector(".scroll-top");
    if (btn) {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            btn.style.opacity = "1";
            btn.style.visibility = "visible";
        } else {
            btn.style.opacity = "0";
            btn.style.visibility = "hidden";
        }
    }
};

window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================================
   HERO SLIDER
   ========================================= */
function initSlider() {
    if (document.getElementsByClassName("slide").length > 0) {
        showSlides(slideIndex);
        setInterval(() => window.moveSlide(1), 10000);
    }
}

window.moveSlide = function (n) {
    showSlides(slideIndex += n);
};

window.currentSlide = function (n) {
    showSlides(slideIndex = n);
};

function showSlides(n) {
    let slides = document.getElementsByClassName("slide");
    let dots = document.getElementsByClassName("dot");

    if (!slides || slides.length === 0) return;

    if (n >= slides.length) { slideIndex = 0; }
    if (n < 0) { slideIndex = slides.length - 1; }

    for (let i = 0; i < slides.length; i++) {
        slides[i].classList.remove("active");
        slides[i].style.display = "none";
    }
    if (dots.length > 0) {
        for (let i = 0; i < dots.length; i++) {
            dots[i].classList.remove("active");
        }
    }

    slides[slideIndex].classList.add("active");
    slides[slideIndex].style.display = "flex";

    if (dots.length > 0) {
        dots[slideIndex].classList.add("active");
    }
}
/* =========================================
   END OF SCRIPT
   ========================================= */