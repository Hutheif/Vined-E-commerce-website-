(function () {
  "use strict";

  /* ==============================================================
               CONFIG
               ============================================================== */
  const TILL_NUMBER = "000000"; // Replace with actual Paybill
  const ADMIN_PASSCODE = "vined2026";
  const STORAGE_PREFIX = "vined_";
  const SOCIAL_PROOF_PAGES = ["home", "about"]; // social proof only shows here

  const PRODUCTS = [
    {
      id: "p1",
      name: "Gold Fringe Set",
      price: 5500,
      img: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&auto=format&fit=crop",
      vid: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      sizes: ["XS", "S", "M", "L", "XL"],
      inStock: true,
      description:
        "Handmade gold sequin fringe top and mini skirt. Perfect for a night out.",
    },
    {
      id: "p2",
      name: "Ivory Crochet Top",
      price: 3200,
      img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop",
      vid: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      sizes: ["XS", "S", "M", "L", "XL"],
      inStock: true,
      description:
        "Hand-crocheted top in ivory. Breathable and stylish for warm days.",
    },
    {
      id: "p3",
      name: "Sequin Mini Skirt",
      price: 4100,
      img: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop",
      vid: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      sizes: ["XS", "S", "M", "L", "XL"],
      inStock: true,
      description:
        "Shimmering sequin mini skirt. A statement piece for any occasion.",
    },
    {
      id: "p4",
      name: "Resort Wrap Dress",
      price: 6800,
      img: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&auto=format&fit=crop",
      vid: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      sizes: ["XS", "S", "M", "L", "XL"],
      inStock: false, // sold out
      description:
        "Elegant wrap dress in a vibrant resort print. Perfect for vacations.",
    },
  ];

  /* ==============================================================
               STORAGE
               ============================================================== */
  const storage = {
    _key(k) {
      return STORAGE_PREFIX + k;
    },
    set(key, value) {
      try {
        localStorage.setItem(this._key(key), value);
        return true;
      } catch (_) {
        return false;
      }
    },
    get(key) {
      try {
        return localStorage.getItem(this._key(key));
      } catch (_) {
        return null;
      }
    },
    list(prefix) {
      try {
        const full = this._key(prefix);
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(full)) keys.push(k.replace(STORAGE_PREFIX, ""));
        }
        return keys;
      } catch (_) {
        return [];
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(this._key(key));
        return true;
      } catch (_) {
        return false;
      }
    },
  };

  /* ==============================================================
               TOAST
               ============================================================== */
  const toastEl = document.getElementById("toast");
  let toastTimer;

  function showToast(msg, type) {
    type = type || "";
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className = "toast " + type + " show";
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  /* ==============================================================
               ANALYTICS — visitor tracking
               ============================================================== */
  function getSessionId() {
    let id = sessionStorage.getItem("ma_session_id");
    if (!id) {
      id =
        "sess_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 6);
      sessionStorage.setItem("ma_session_id", id);
    }
    return id;
  }

  function trackEvent(type, data) {
    const events = JSON.parse(storage.get("analytics") || "[]");
    events.push({
      type: type,
      data: { sessionId: getSessionId(), ...data },
      timestamp: new Date().toISOString(),
    });
    if (events.length > 2000) events.shift();
    storage.set("analytics", JSON.stringify(events));
  }

  function trackPageView() {
    trackEvent("pageview", { page: window.location.hash || "/" });
  }

  function getAnalyticsStats() {
    const events = JSON.parse(storage.get("analytics") || "[]");
    const sessions = new Set();
    let pageviews = 0;
    events.forEach((e) => {
      if (e.data && e.data.sessionId) sessions.add(e.data.sessionId);
      if (e.type === "pageview") pageviews++;
    });
    return { uniqueVisitors: sessions.size, pageviews };
  }

  /* ==============================================================
               WISHLIST
               ============================================================== */
  function getWishlist() {
    try {
      return JSON.parse(storage.get("wishlist") || "[]");
    } catch (_) {
      return [];
    }
  }

  function setWishlist(list) {
    storage.set("wishlist", JSON.stringify(list));
    updateWishlistUI();
  }

  function toggleWishlist(productId) {
    let list = getWishlist();
    const idx = list.indexOf(productId);
    if (idx > -1) {
      list.splice(idx, 1);
      showToast("Removed from wishlist", "");
    } else {
      list.push(productId);
      showToast("Added to wishlist ♡", "success");
    }
    setWishlist(list);
  }

  function isWishlisted(productId) {
    return getWishlist().includes(productId);
  }

  function updateWishlistUI() {
    const count = getWishlist().length;
    document.getElementById("wishlistCount").textContent = count;
    // Update hearts on cards
    document.querySelectorAll(".product-card").forEach((card) => {
      const pid = card.dataset.productId;
      if (pid) {
        const heart = card.querySelector(".product-card-wishlist");
        if (heart) {
          heart.classList.toggle("wishlisted", isWishlisted(pid));
          heart.textContent = isWishlisted(pid) ? "❤" : "♡";
        }
      }
    });
  }

  /* ==============================================================
               CART — real ecommerce cart (multiple items, quantities)
               ============================================================== */
  function getCart() {
    try {
      return JSON.parse(storage.get("cart") || "[]");
    } catch (_) {
      return [];
    }
  }

  function setCart(items) {
    storage.set("cart", JSON.stringify(items));
    updateCartUI();
  }

  function addToCart(productId, size, qty) {
    qty = qty || 1;
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    if (!product.inStock) {
      showToast("Sorry, this item is sold out.", "error");
      return;
    }
    if (!size) {
      showToast("Please select a size first.", "error");
      return;
    }
    let cart = getCart();
    const existing = cart.find(
      (i) => i.productId === productId && i.size === size,
    );
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, size, qty });
    }
    setCart(cart);
    showToast(product.name + " added to cart", "success");
    trackEvent("add_to_cart", { productId, size, qty });
    openCart();
  }

  function removeFromCart(productId, size) {
    const cart = getCart().filter(
      (i) => !(i.productId === productId && i.size === size),
    );
    setCart(cart);
  }

  function updateCartQty(productId, size, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.productId === productId && i.size === size);
    if (item) item.qty = Math.max(1, qty);
    setCart(cart);
  }

  function clearCart() {
    setCart([]);
  }

  function getCartTotals() {
    const cart = getCart();
    let subtotal = 0,
      deposit = 0,
      count = 0;
    cart.forEach((i) => {
      const p = PRODUCTS.find((pp) => pp.id === i.productId);
      if (p) {
        subtotal += p.price * i.qty;
        deposit += Math.round(p.price * 0.7) * i.qty;
        count += i.qty;
      }
    });
    return { subtotal, deposit, balance: subtotal - deposit, count };
  }

  function updateCartUI() {
    const totals = getCartTotals();
    document.getElementById("cartCount").textContent = totals.count;
    renderCartDrawer();
  }

  function renderCartDrawer() {
    const cart = getCart();
    const itemsEl = document.getElementById("cartItems");
    const footerEl = document.getElementById("cartFooter");
    if (cart.length === 0) {
      itemsEl.innerHTML =
        '<div class="cart-empty">Your cart is empty.<br/>Add a piece from the shop to get started.</div>';
      footerEl.style.display = "none";
      return;
    }
    footerEl.style.display = "block";
    itemsEl.innerHTML = cart
      .map((i) => {
        const p = PRODUCTS.find((pp) => pp.id === i.productId);
        if (!p) return "";
        return `<div class="cart-item" data-product-id="${p.id}" data-size="${i.size}">
                    <img src="${p.img}" alt="${p.name}" />
                    <div class="cart-item-info">
                        <div class="cart-item-name">${p.name}</div>
                        <div class="cart-item-meta">Size: ${i.size} · KES ${p.price.toLocaleString()}</div>
                        <div class="cart-item-qty">
                            <button class="cart-qty-btn cart-qty-minus" aria-label="Decrease quantity">−</button>
                            <span>${i.qty}</span>
                            <button class="cart-qty-btn cart-qty-plus" aria-label="Increase quantity">+</button>
                        </div>
                        <button class="cart-item-remove">Remove</button>
                    </div>
                </div>`;
      })
      .join("");

    const totals = getCartTotals();
    document.getElementById("cartSummary").innerHTML = `
                <div class="row"><span>Subtotal</span><span>KES ${totals.subtotal.toLocaleString()}</span></div>
                <div class="row"><span>Pay now (70% deposit)</span><span>KES ${totals.deposit.toLocaleString()}</span></div>
                <div class="row total"><span>Balance on completion</span><span>KES ${totals.balance.toLocaleString()}</span></div>
            `;

    itemsEl.querySelectorAll(".cart-item").forEach((row) => {
      const pid = row.dataset.productId;
      const size = row.dataset.size;
      row.querySelector(".cart-qty-minus").addEventListener("click", () => {
        const cart = getCart();
        const item = cart.find((i) => i.productId === pid && i.size === size);
        if (!item) return;
        if (item.qty <= 1) {
          removeFromCart(pid, size);
        } else {
          updateCartQty(pid, size, item.qty - 1);
        }
      });
      row.querySelector(".cart-qty-plus").addEventListener("click", () => {
        const cart = getCart();
        const item = cart.find((i) => i.productId === pid && i.size === size);
        if (item) updateCartQty(pid, size, item.qty + 1);
      });
      row.querySelector(".cart-item-remove").addEventListener("click", () => {
        removeFromCart(pid, size);
        showToast("Removed from cart", "");
      });
    });
  }

  function openCart() {
    document.getElementById("cartOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
    renderCartDrawer();
  }

  function closeCart() {
    document.getElementById("cartOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  // quickAddToCart is used by product cards, PDP, and quick view —
  // it now adds the item to the real cart and opens the cart drawer,
  // just like a normal ecommerce "Add to Cart" button.
  function quickAddToCart(productId, size) {
    addToCart(productId, size, 1);
  }

  /* ==============================================================
               NAVIGATION (SPA)
               ============================================================== */
  const navLinks = document.querySelectorAll("[data-page]");
  const pages = {
    home: document.getElementById("page-home"),
    shop: document.getElementById("page-shop"),
    product: document.getElementById("page-product"),
    size: document.getElementById("page-size"),
    shipping: document.getElementById("page-shipping"),
    contact: document.getElementById("page-contact"),
    about: document.getElementById("page-about"),
    admin: document.getElementById("page-admin"),
  };

  let currentPage = "home";

  /* --- Glassmorphic nav: transparent over a full-bleed hero, solid once scrolled --- */
  const navbarEl = document.querySelector(".navbar");
  const HERO_PAGES = ["home", "shop"];
  function updateNavAppearance() {
    const overHero = HERO_PAGES.includes(currentPage) && window.scrollY < 80;
    navbarEl.classList.toggle("navbar--transparent", overHero);
  }
  window.addEventListener("scroll", updateNavAppearance, { passive: true });

  function updateSocialProofVisibility(pageId) {
    const el = document.getElementById("socialProof");
    if (!el) return;
    el.style.display = SOCIAL_PROOF_PAGES.includes(pageId) ? "" : "none";
  }

  function goTo(pageId, data) {
    // Hide all pages
    Object.keys(pages).forEach((id) => {
      pages[id].classList.toggle("active", id === pageId);
    });
    // Update nav
    document.querySelectorAll(".nav-links a").forEach((a) => {
      a.classList.toggle("active", a.dataset.page === pageId);
    });
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Track pageview
    trackPageView();
    // Close mobile nav
    document.getElementById("navLinks").classList.remove("open");
    document.getElementById("navToggle").setAttribute("aria-expanded", "false");

    currentPage = pageId;
    updateNavAppearance();
    updateSocialProofVisibility(pageId);

    // If product page, render product
    if (pageId === "product" && data && data.productId) {
      renderProductDetail(data.productId);
    }
    // If shipping page, refresh the cart-based order summary
    if (pageId === "shipping") {
      renderShippingFromCart();
    }
    // If admin, maybe refresh data
    if (
      pageId === "admin" &&
      document.getElementById("adminDash").classList.contains("open")
    ) {
      loadAdminOrders();
    }
  }

  navLinks.forEach((el) => {
    el.addEventListener("click", () => {
      const page = el.dataset.page;
      if (page) goTo(page);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const page = el.dataset.page;
        if (page) goTo(page);
      }
    });
  });

  // Mobile nav toggle
  document.getElementById("navToggle").addEventListener("click", function () {
    const nav = document.getElementById("navLinks");
    const expanded = this.getAttribute("aria-expanded") === "true";
    nav.classList.toggle("open");
    this.setAttribute("aria-expanded", !expanded);
  });

  // Wishlist icon click - show wishlist items (simple toast for demo)
  document
    .getElementById("wishlistIcon")
    .addEventListener("click", function () {
      const list = getWishlist();
      if (list.length === 0) {
        showToast("Your wishlist is empty.", "");
      } else {
        const names = list
          .map((id) => {
            const p = PRODUCTS.find((prod) => prod.id === id);
            return p ? p.name : id;
          })
          .join(", ");
        showToast("Wishlist: " + names, "");
      }
    });

  // Cart icon opens the cart drawer
  document.getElementById("cartIcon").addEventListener("click", openCart);
  document.getElementById("cartIcon").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openCart();
    }
  });
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document
    .getElementById("cartOverlay")
    .addEventListener("click", function (e) {
      if (e.target === this) closeCart();
    });
  document
    .getElementById("cartCheckoutBtn")
    .addEventListener("click", function () {
      if (getCart().length === 0) return;
      closeCart();
      goTo("shipping");
    });

  /* ==============================================================
               SEARCH
               ============================================================== */
  function renderSearchResults(query) {
    const resultsEl = document.getElementById("searchResults");
    const q = query.trim().toLowerCase();
    if (!q) {
      resultsEl.innerHTML =
        '<div class="search-empty">Start typing to search products…</div>';
      return;
    }
    const matches = PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
    if (matches.length === 0) {
      resultsEl.innerHTML =
        '<div class="search-empty">No products match "' +
        query.replace(/</g, "&lt;") +
        '".</div>';
      return;
    }
    resultsEl.innerHTML = matches
      .map(
        (p) => `
                <div class="search-result-item" data-product-id="${p.id}" tabindex="0" role="button">
                    <img src="${p.img}" alt="${p.name}" />
                    <div>
                        <div class="search-result-name">${p.name}</div>
                        <div class="search-result-price">KES ${p.price.toLocaleString()}${!p.inStock ? " · Sold out" : ""}</div>
                    </div>
                </div>`,
      )
      .join("");
    resultsEl.querySelectorAll(".search-result-item").forEach((el) => {
      const go = () => {
        const pid = el.dataset.productId;
        closeSearch();
        goTo("product", { productId: pid });
      };
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  }

  function openSearch() {
    document.getElementById("searchOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
    const input = document.getElementById("searchInput");
    input.value = "";
    renderSearchResults("");
    setTimeout(() => input.focus(), 60);
  }

  function closeSearch() {
    document.getElementById("searchOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  document.getElementById("searchIcon").addEventListener("click", openSearch);
  document.getElementById("searchClose").addEventListener("click", closeSearch);
  document
    .getElementById("searchOverlay")
    .addEventListener("click", function (e) {
      if (e.target === this) closeSearch();
    });
  document.getElementById("searchInput").addEventListener("input", function () {
    renderSearchResults(this.value);
  });

  /* ==============================================================
               PRODUCT RENDERING (Grid & Detail)
               ============================================================== */
  function renderCardHTML(p, inComplementary = false) {
    const deposit = Math.round(p.price * 0.7);
    const outOfStock = !p.inStock;
    return `
                    <div class="product-card ${outOfStock ? "out-of-stock" : ""}" tabindex="0" role="button"
                         aria-label="${p.name} — KES ${p.price.toLocaleString()}"
                         data-product-id="${p.id}">
                        <div class="product-card-media">
                            <img src="${p.img}" alt="${p.name}" loading="lazy" decoding="async" />
                            ${!outOfStock ? `<video src="${p.vid}" muted loop playsinline preload="none" aria-hidden="true"></video>` : ""}
                            <div class="play-indicator" aria-hidden="true">▶</div>
                            <div class="sold-out-badge">Sold out</div>
                            <button class="product-card-wishlist" aria-label="Wishlist" data-product-id="${p.id}">
                                ${isWishlisted(p.id) ? "❤" : "♡"}
                            </button>
                            ${!outOfStock ? `<button class="product-card-quickview" data-product-id="${p.id}">Quick View</button>` : ""}
                        </div>
                        <div class="product-card-info">
                            <div class="product-card-name">${p.name}</div>
                            <div class="product-card-price">KES ${p.price.toLocaleString()}</div>
                            <div class="product-card-deposit">70% deposit: KES ${deposit.toLocaleString()}</div>
                            ${
                              !outOfStock
                                ? `
                                <div class="product-card-size">
                                    <select aria-label="Select size for ${p.name}" data-product-id="${p.id}">
                                        <option value="">Select size</option>
                                        ${p.sizes.map((s) => `<option value="${s}">${s}</option>`).join("")}
                                    </select>
                                </div>
                                <button class="product-card-quickbuy" data-product-id="${p.id}" data-size="">Add to Cart</button>
                            `
                                : `
                                <button class="product-card-quickbuy" disabled>Sold Out</button>
                            `
                            }
                        </div>
                    </div>
                `;
  }

  function renderProductGrid(containerId, products) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = products.map((p) => renderCardHTML(p)).join("");
    attachCardListeners(el);
  }

  function attachCardListeners(container) {
    container.querySelectorAll(".product-card").forEach((card) => {
      const vid = card.querySelector("video");
      if (vid) vid.load();

      // Click on card (excluding buttons/selects) goes to PDP
      card.addEventListener("click", function (e) {
        // Ignore if click on interactive elements
        if (
          e.target.closest(".product-card-quickbuy") ||
          e.target.closest(".product-card-size") ||
          e.target.closest(".product-card-wishlist") ||
          e.target.closest(".product-card-quickview")
        )
          return;
        const pid = this.dataset.productId;
        goTo("product", { productId: pid });
      });

      // Quick view button
      const qvBtn = card.querySelector(".product-card-quickview");
      if (qvBtn) {
        qvBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          openQuickView(this.dataset.productId);
        });
      }

      // Keyboard support
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const pid = this.dataset.productId;
          goTo("product", { productId: pid });
        }
      });

      // Wishlist button
      const wishBtn = card.querySelector(".product-card-wishlist");
      if (wishBtn) {
        wishBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          const pid = this.dataset.productId;
          toggleWishlist(pid);
        });
      }

      // Size select - update quick buy button
      const sizeSelect = card.querySelector(".product-card-size select");
      const quickBuyBtn = card.querySelector(".product-card-quickbuy");
      if (sizeSelect && quickBuyBtn) {
        sizeSelect.addEventListener("change", function () {
          quickBuyBtn.dataset.size = this.value;
          quickBuyBtn.disabled = !this.value;
        });
        // Add to cart click
        quickBuyBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          const pid = this.dataset.productId;
          const size = this.dataset.size;
          if (pid && size) {
            quickAddToCart(pid, size);
          } else {
            showToast("Please select a size first.", "error");
          }
        });
      }

      // Video on hover (desktop)
      card.addEventListener("mouseenter", function () {
        if (vid && !this.classList.contains("out-of-stock")) {
          vid.play().catch(() => {});
        }
      });
      card.addEventListener("mouseleave", function () {
        if (
          vid &&
          !this.classList.contains("out-of-stock") &&
          !this.classList.contains("video-playing")
        ) {
          vid.pause();
          vid.currentTime = 0;
        }
      });
      card.addEventListener("focus", function () {
        if (vid && !this.classList.contains("out-of-stock")) {
          vid.play().catch(() => {});
        }
      });
      card.addEventListener("blur", function () {
        if (
          vid &&
          !this.classList.contains("out-of-stock") &&
          !this.classList.contains("video-playing")
        ) {
          vid.pause();
          vid.currentTime = 0;
        }
      });

      // Touch: tap to play for 3s
      card.addEventListener(
        "touchstart",
        function (e) {
          if (
            e.target.closest(".product-card-media") &&
            !this.classList.contains("out-of-stock") &&
            !this.classList.contains("video-playing")
          ) {
            e.preventDefault();
            this.classList.add("video-playing");
            if (vid) vid.play().catch(() => {});
            clearTimeout(this._vt);
            this._vt = setTimeout(() => {
              this.classList.remove("video-playing");
              if (vid) {
                vid.pause();
                vid.currentTime = 0;
              }
            }, 3000);
          }
        },
        { passive: false },
      );
    });
  }

  /* ==============================================================
               QUICK VIEW MODAL
               ============================================================== */
  const qvOverlay = document.getElementById("qvOverlay");
  const qvPanel = document.getElementById("qvPanel");
  const qvImg = document.getElementById("qvImg");
  const qvVid = document.getElementById("qvVid");
  const qvMedia = document.getElementById("qvMedia");
  const qvMediaToggle = document.getElementById("qvMediaToggle");
  const qvName = document.getElementById("qvName");
  const qvPrice = document.getElementById("qvPrice");
  const qvDeposit = document.getElementById("qvDeposit");
  const qvDesc = document.getElementById("qvDesc");
  const qvSizeGrid = document.getElementById("qvSizeGrid");
  const qvAddToCart = document.getElementById("qvAddToCart");
  const qvWishlistBtn = document.getElementById("qvWishlistBtn");
  const qvFullDetails = document.getElementById("qvFullDetails");
  const qvClose = document.getElementById("qvClose");

  let qvCurrentProduct = null;
  let qvSelectedSize = null;
  let qvLastFocused = null;

  function openQuickView(productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    qvCurrentProduct = product;
    qvSelectedSize = null;

    const deposit = Math.round(product.price * 0.7);
    qvImg.src = product.img;
    qvImg.alt = product.name;
    qvVid.src = product.vid || "";
    qvVid.load();
    qvMedia.classList.remove("playing");
    qvName.textContent = product.name;
    qvPrice.textContent = "KES " + product.price.toLocaleString();
    qvDeposit.textContent = "70% deposit: KES " + deposit.toLocaleString();
    qvDesc.textContent = product.description || "";

    qvSizeGrid.innerHTML = product.sizes
      .map((s) => `<button class="qv-size-btn" data-size="${s}">${s}</button>`)
      .join("");
    qvSizeGrid.querySelectorAll(".qv-size-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        qvSizeGrid
          .querySelectorAll(".qv-size-btn")
          .forEach((b) => b.classList.remove("selected"));
        this.classList.add("selected");
        qvSelectedSize = this.dataset.size;
        qvAddToCart.disabled = false;
        qvAddToCart.textContent = "Add to Cart — " + qvSelectedSize;
      });
    });

    qvAddToCart.disabled = true;
    qvAddToCart.textContent = "Select a size";

    const wishlisted = isWishlisted(product.id);
    qvWishlistBtn.classList.toggle("wishlisted", wishlisted);
    qvWishlistBtn.textContent = wishlisted ? "❤" : "♡";

    qvLastFocused = document.activeElement;
    qvOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    trackEvent("quick_view", {
      productId: product.id,
      productName: product.name,
    });
    setTimeout(() => qvClose.focus(), 50);
  }

  function closeQuickView() {
    qvOverlay.classList.remove("open");
    document.body.style.overflow = "";
    qvVid.pause();
    qvVid.currentTime = 0;
    qvMedia.classList.remove("playing");
    qvCurrentProduct = null;
    if (qvLastFocused) qvLastFocused.focus();
  }

  qvClose.addEventListener("click", closeQuickView);
  qvOverlay.addEventListener("click", function (e) {
    if (e.target === qvOverlay) closeQuickView();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (qvOverlay.classList.contains("open")) closeQuickView();
    if (document.getElementById("searchOverlay").classList.contains("open"))
      closeSearch();
    if (document.getElementById("cartOverlay").classList.contains("open"))
      closeCart();
  });

  qvMediaToggle.addEventListener("click", function () {
    if (!qvVid.src) return;
    const playing = qvMedia.classList.toggle("playing");
    if (playing) {
      qvVid.play().catch(() => {});
      this.textContent = "❚❚";
    } else {
      qvVid.pause();
      qvVid.currentTime = 0;
      this.textContent = "▶";
    }
  });

  qvWishlistBtn.addEventListener("click", function () {
    if (!qvCurrentProduct) return;
    toggleWishlist(qvCurrentProduct.id);
    const wishlisted = isWishlisted(qvCurrentProduct.id);
    this.classList.toggle("wishlisted", wishlisted);
    this.textContent = wishlisted ? "❤" : "♡";
  });

  qvAddToCart.addEventListener("click", function () {
    if (!qvCurrentProduct || !qvSelectedSize) return;
    closeQuickView();
    quickAddToCart(qvCurrentProduct.id, qvSelectedSize);
  });

  qvFullDetails.addEventListener("click", function () {
    if (!qvCurrentProduct) return;
    const pid = qvCurrentProduct.id;
    closeQuickView();
    goTo("product", { productId: pid });
  });

  /* ==============================================================
               PRODUCT DETAIL PAGE
               ============================================================== */
  function renderProductDetail(productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      document.getElementById("pdp-content").innerHTML =
        "<p>Product not found.</p>";
      return;
    }
    const deposit = Math.round(product.price * 0.7);
    const outOfStock = !product.inStock;

    const html = `
                    <div class="pdp-layout">
                        <div class="pdp-media">
                            <img src="${product.img}" alt="${product.name}" style="width:100%;height:auto;border-radius:var(--radius);" />
                            ${!outOfStock ? `<video src="${product.vid}" muted loop playsinline controls style="width:100%;height:auto;border-radius:var(--radius);margin-top:var(--space-sm);"></video>` : ""}
                            <div class="media-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-sm);margin-top:var(--space-sm);">
                                <img src="${product.img}" alt="" />
                                <img src="${product.img}" alt="" />
                            </div>
                        </div>
                        <div class="pdp-info">
                            <h1 class="pdp-title">${product.name}</h1>
                            <div class="pdp-price">KES ${product.price.toLocaleString()}</div>
                            ${outOfStock ? '<div style="color:var(--color-error);font-weight:600;">Sold out</div>' : ""}
                            <div class="pdp-description">${product.description || "A beautiful piece from our collection."}</div>
                            <div class="pdp-size-select">
                                <label for="pdpSize">Size</label>
                                <select id="pdpSize">
                                    <option value="">Select size</option>
                                    ${product.sizes.map((s) => `<option value="${s}">${s}</option>`).join("")}
                                </select>
                            </div>
                            <button class="pdp-add-to-cart" id="pdpAddToCart" ${outOfStock ? "disabled" : ""}>
                                ${outOfStock ? "Sold Out" : "Add to Cart"}
                            </button>
                            <div style="font-size:0.8rem;color:var(--color-text-soft);">
                                70% deposit: KES ${deposit.toLocaleString()} · 30% balance on completion
                            </div>
                            <button class="pdp-back" id="pdpBack">← Back to Shop</button>
                        </div>
                    </div>
                `;
    document.getElementById("pdp-content").innerHTML = html;

    // PDP add to cart
    const addBtn = document.getElementById("pdpAddToCart");
    const sizeSelect = document.getElementById("pdpSize");
    if (addBtn && sizeSelect) {
      sizeSelect.addEventListener("change", function () {
        addBtn.disabled = !this.value || outOfStock;
      });
      addBtn.addEventListener("click", function () {
        const size = sizeSelect.value;
        if (!size) {
          showToast("Please select a size.", "error");
          return;
        }
        quickAddToCart(product.id, size);
      });
    }

    // Back button
    document.getElementById("pdpBack").addEventListener("click", function () {
      goTo("shop");
    });

    // Render complementary products
    renderComplementary(product.id);
  }

  function renderComplementary(currentProductId) {
    const grid = document.getElementById("complementaryGrid");
    const others = PRODUCTS.filter((p) => p.id !== currentProductId);
    if (others.length === 0) {
      grid.innerHTML = '<p class="muted">No other products found.</p>';
      return;
    }
    // Take up to 4
    const comps = others.slice(0, 4);
    grid.innerHTML = comps.map((p) => renderCardHTML(p, true)).join("");
    attachCardListeners(grid);
  }

  /* ==============================================================
               SHIPPING / PREORDER — built from the real cart
               ============================================================== */
  function renderShippingFromCart() {
    const cart = getCart();
    const emptyState = document.getElementById("shippingEmptyState");
    const formWrap = document.getElementById("orderFormWrap");

    if (cart.length === 0) {
      emptyState.style.display = "block";
      formWrap.style.display = "none";
      return;
    }
    emptyState.style.display = "none";
    formWrap.style.display = "block";

    const itemsListEl = document.getElementById("shippingItemsList");
    itemsListEl.innerHTML = cart
      .map((i) => {
        const p = PRODUCTS.find((pp) => pp.id === i.productId);
        if (!p) return "";
        return `<div class="shipping-item-row">
                    <img src="${p.img}" alt="${p.name}" />
                    <div class="si-name">${p.name}</div>
                    <div class="si-meta">Size ${i.size} · Qty ${i.qty}</div>
                    <div class="si-meta">KES ${(p.price * i.qty).toLocaleString()}</div>
                </div>`;
      })
      .join("");

    const totals = getCartTotals();
    document.getElementById("orderSummary").innerHTML = `
                <div class="row"><span>Subtotal (${totals.count} item${totals.count === 1 ? "" : "s"})</span><span>KES ${totals.subtotal.toLocaleString()}</span></div>
                <div class="row"><span>Pay now (70% deposit)</span><span>KES ${totals.deposit.toLocaleString()}</span></div>
                <div class="row"><span>Pay on completion (30% balance)</span><span>KES ${totals.balance.toLocaleString()}</span></div>
            `;
    document.getElementById("tillDisplay").textContent =
      "Paybill: " + TILL_NUMBER + " · Account: [Your Reference]";
    document.getElementById("tillConfirm").textContent = TILL_NUMBER;
  }

  document
    .getElementById("shippingShopBtn")
    .addEventListener("click", function () {
      goTo("shop");
    });
  document
    .getElementById("shippingEditCart")
    .addEventListener("click", function () {
      openCart();
    });

  // Validation and submit
  const nameInput = document.getElementById("ofName");
  const phoneInput = document.getElementById("ofPhone");
  const agreeCheck = document.getElementById("ofAgree");
  const submitBtn = document.getElementById("ofSubmit");

  function isValidKenyanPhone(phone) {
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    return /^(\+254|0)[17]\d{8}$/.test(cleaned);
  }

  function validateForm() {
    const nameOk = nameInput.value.trim().length >= 2;
    const phoneOk = isValidKenyanPhone(phoneInput.value.trim());
    const agreed = agreeCheck.checked;
    nameInput.classList.toggle("invalid", nameInput.value.trim() && !nameOk);
    document
      .getElementById("errName")
      .classList.toggle("visible", nameInput.value.trim() && !nameOk);
    phoneInput.classList.toggle("invalid", phoneInput.value.trim() && !phoneOk);
    document
      .getElementById("errPhone")
      .classList.toggle("visible", phoneInput.value.trim() && !phoneOk);
    const ok = nameOk && phoneOk && agreed && getCart().length > 0;
    submitBtn.disabled = !ok;
    return ok;
  }
  [nameInput, phoneInput].forEach((el) => {
    el.addEventListener("input", validateForm);
    el.addEventListener("blur", validateForm);
  });
  agreeCheck.addEventListener("change", validateForm);
  validateForm();

  submitBtn.addEventListener("click", async function () {
    if (!validateForm()) return;
    const btn = this;
    btn.classList.add("loading");
    btn.disabled = true;
    document.getElementById("ofError").textContent = "";

    const cart = getCart();
    const totals = getCartTotals();
    const items = cart
      .map((i) => {
        const p = PRODUCTS.find((pp) => pp.id === i.productId);
        return p
          ? {
              itemId: p.id,
              item: p.name,
              size: i.size,
              qty: i.qty,
              price: p.price,
            }
          : null;
      })
      .filter(Boolean);

    const order = {
      id: "ORD-" + Date.now().toString(36).toUpperCase(),
      items: items,
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      total: totals.subtotal,
      deposit: totals.deposit,
      balance: totals.balance,
      status: "awaiting_deposit",
      createdAt: new Date().toISOString(),
      sessionId: getSessionId(),
    };
    try {
      const saved = storage.set("order:" + order.id, JSON.stringify(order));
      if (!saved) throw new Error("Storage unavailable");
      document.getElementById("orderFormWrap").style.display = "none";
      document.getElementById("orderConfirm").style.display = "block";
      document.getElementById("confRef").textContent = order.id;
      document.getElementById("confRefShort").textContent = order.id;
      document.getElementById("ofError").textContent = "";
      showToast("Preorder saved! Reference: " + order.id, "success");
      trackEvent("order_placed", {
        orderId: order.id,
        items: items.length,
        amount: totals.subtotal,
      });
      clearCart();
    } catch (e) {
      document.getElementById("ofError").textContent =
        "Something went wrong — please try again.";
      showToast("Failed to save order.", "error");
    } finally {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  });

  document.getElementById("copyRef").addEventListener("click", function () {
    const ref = document.getElementById("confRef").textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(ref)
        .then(() => {
          this.textContent = "✓ Copied!";
          this.classList.add("copied");
          setTimeout(() => {
            this.textContent = "📋 Copy Reference";
            this.classList.remove("copied");
          }, 2000);
        })
        .catch(() =>
          showToast("Could not copy — please copy manually.", "error"),
        );
    } else {
      const range = document.createRange();
      range.selectNode(document.getElementById("confRef"));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      showToast("Reference selected — copy it manually.", "");
    }
  });

  document.getElementById("ofNew").addEventListener("click", function () {
    document.getElementById("orderFormWrap").style.display = "block";
    document.getElementById("orderConfirm").style.display = "none";
    nameInput.value = "";
    phoneInput.value = "";
    agreeCheck.checked = false;
    nameInput.classList.remove("invalid");
    phoneInput.classList.remove("invalid");
    document.getElementById("errName").classList.remove("visible");
    document.getElementById("errPhone").classList.remove("visible");
    document.getElementById("ofError").textContent = "";
    validateForm();
    renderShippingFromCart();
  });

  /* ==============================================================
               REELS — TikTok-style horizontal autoplay scroller
               ============================================================== */
  function setupReelAutoplay() {
    const scrollEl = document.getElementById("reelScroll");
    const videos = document.querySelectorAll("#reelScroll video.reel-video");
    if (!videos.length) return;

    if (!("IntersectionObserver" in window)) {
      videos.forEach((v) => v.play().catch(() => {}));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { root: scrollEl, threshold: [0, 0.6, 1] },
    );
    videos.forEach((v) => obs.observe(v));

    // Sound toggle per reel (videos start muted, like TikTok autoplay)
    document.querySelectorAll(".reel-sound-toggle").forEach((btn) => {
      btn.addEventListener("click", function () {
        const vid = this.parentElement.querySelector("video");
        if (!vid) return;
        vid.muted = !vid.muted;
        this.textContent = vid.muted ? "🔇" : "🔊";
      });
    });
  }

  document.getElementById("backToTop").addEventListener("click", function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ==============================================================
               ADMIN
               ============================================================== */
  const adminPass = document.getElementById("adminPass");
  const adminLoginBtn = document.getElementById("adminLogin");
  const adminLock = document.getElementById("adminLock");
  const adminDash = document.getElementById("adminDash");
  const adminError = document.getElementById("adminError");

  function doAdminLogin() {
    if (adminPass.value === ADMIN_PASSCODE) {
      adminLock.style.display = "none";
      adminDash.classList.add("open");
      adminError.textContent = "";
      loadAdminOrders();
      loadAdminStats();
      renderAdminProducts();
      showToast("Welcome to the admin dashboard.", "success");
    } else {
      adminError.textContent = "Incorrect passcode.";
      adminPass.classList.add("invalid");
      setTimeout(() => adminPass.classList.remove("invalid"), 1500);
    }
  }
  adminLoginBtn.addEventListener("click", doAdminLogin);
  adminPass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doAdminLogin();
    }
  });

  document
    .getElementById("adminRefresh")
    .addEventListener("click", function () {
      loadAdminOrders();
      loadAdminStats();
      showToast("Refreshed.", "");
    });

  document
    .getElementById("adminAddProduct")
    .addEventListener("click", function () {
      showToast("Edit the PRODUCTS array in the code to add products.", "");
    });

  const STATUS_FLOW = [
    "awaiting_deposit",
    "deposit_confirmed",
    "in_production",
    "awaiting_balance",
    "balance_confirmed",
    "ready_for_pickup",
  ];
  const STATUS_LABEL = {
    awaiting_deposit: "Awaiting deposit",
    deposit_confirmed: "Deposit confirmed",
    in_production: "In production",
    awaiting_balance: "Awaiting balance",
    balance_confirmed: "Balance confirmed",
    ready_for_pickup: "Ready for pickup",
  };

  function orderItemsSummary(order) {
    // Supports both the new multi-item orders and any legacy single-item
    // orders that might already be saved in a returning visitor's browser.
    if (Array.isArray(order.items) && order.items.length) {
      return order.items
        .map((i) => `${i.item} (${i.size} × ${i.qty})`)
        .join("<br/>");
    }
    return `${order.item || "—"} (${order.size || "—"})`;
  }

  function loadAdminOrders() {
    const wrap = document.getElementById("adminOrders");
    wrap.innerHTML = '<span class="muted">Loading…</span>';
    try {
      const keys = storage.list("order:");
      const orders = [];
      keys.forEach((k) => {
        const raw = storage.get(k);
        if (raw) {
          try {
            orders.push(JSON.parse(raw));
          } catch (_) {}
        }
      });
      if (orders.length === 0) {
        wrap.innerHTML =
          '<div style="padding:var(--space-xl) 0;text-align:center;color:var(--color-text-soft);">📭 No orders yet.</div>';
        return;
      }
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      let html = `<table class="admin-table">
                        <thead><tr>
                            <th>Ref</th><th>Items</th><th>Customer</th>
                            <th>Deposit</th><th>Balance</th><th>Status</th>
                        </tr></thead><tbody>`;
      orders.forEach((o) => {
        html += `<tr>
                            <td><strong>${o.id}</strong><br/><span class="muted">${new Date(o.createdAt).toLocaleDateString()}</span></td>
                            <td>${orderItemsSummary(o)}</td>
                            <td>${o.name}<br/><span class="muted">${o.phone}</span></td>
                            <td>KES ${o.deposit.toLocaleString()}</td>
                            <td>KES ${o.balance.toLocaleString()}</td>
                            <td>
                                <select class="status-select" data-order-id="${o.id}" aria-label="Update status for ${o.id}">
                                    ${STATUS_FLOW.map(
                                      (s) =>
                                        `<option value="${s}" ${s === o.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`,
                                    ).join("")}
                                </select>
                            </td>
                        </tr>`;
      });
      html += "</tbody></table>";
      wrap.innerHTML = html;

      wrap.querySelectorAll(".status-select").forEach((sel) => {
        sel.addEventListener("change", function () {
          const orderId = this.dataset.orderId;
          updateOrderStatus(orderId, this.value);
        });
      });
    } catch (e) {
      wrap.innerHTML =
        '<div style="padding:var(--space-xl) 0;text-align:center;color:var(--color-error);">Could not load orders.</div>';
    }
  }

  function updateOrderStatus(orderId, newStatus) {
    const raw = storage.get("order:" + orderId);
    if (!raw) {
      showToast("Order not found.", "error");
      return;
    }
    try {
      const order = JSON.parse(raw);
      order.status = newStatus;
      storage.set("order:" + orderId, JSON.stringify(order));
      showToast(`Order ${orderId} → ${STATUS_LABEL[newStatus]}`, "success");
      loadAdminOrders();
      loadAdminStats();
    } catch (_) {
      showToast("Failed to update.", "error");
    }
  }

  function loadAdminStats() {
    const keys = storage.list("order:");
    let total = 0,
      revenue = 0;
    keys.forEach((k) => {
      const raw = storage.get(k);
      if (raw) {
        try {
          const o = JSON.parse(raw);
          total++;
          if (
            o.status === "balance_confirmed" ||
            o.status === "ready_for_pickup"
          ) {
            revenue += o.total;
          }
        } catch (_) {}
      }
    });
    document.getElementById("statOrders").textContent = total;
    document.getElementById("statRevenue").textContent =
      "KES " + revenue.toLocaleString();

    const stats = getAnalyticsStats();
    document.getElementById("statVisitors").textContent = stats.uniqueVisitors;
    document.getElementById("statPageviews").textContent = stats.pageviews;
  }

  function renderAdminProducts() {
    const tbody = document.getElementById("adminProductsBody");
    tbody.innerHTML = PRODUCTS.map(
      (p) =>
        `<tr>
                        <td><code>${p.id}</code></td>
                        <td>${p.name}</td>
                        <td>${p.price.toLocaleString()}</td>
                        <td><span class="muted" style="font-size:0.7rem;">edit in code</span></td>
                    </tr>`,
    ).join("");
  }

  /* ==============================================================
               INIT
               ============================================================== */
  // Render initial grids
  renderProductGrid("homeGrid", PRODUCTS.slice(0, 4));
  renderProductGrid("shopGrid", PRODUCTS);
  document.getElementById("productCount").textContent =
    PRODUCTS.length + " products";

  // Update wishlist & cart UI
  updateWishlistUI();
  updateCartUI();

  // Social proof: visible on Home by default
  updateSocialProofVisibility(currentPage);

  // Reels autoplay
  setupReelAutoplay();

  // Track initial pageview
  trackPageView();
  updateNavAppearance();

  console.log("🏷️ VINED — Production-ready, Stay Vain");
  console.log("📦 Products:", PRODUCTS.length);
  console.log("🔑 Admin: " + ADMIN_PASSCODE);
  console.log("📊 Analytics tracking active");

  // Expose some useful things for debugging
  window.__ma = {
    storage,
    PRODUCTS,
    goTo,
    showToast,
    toggleWishlist,
    getCart,
    addToCart,
  };
})();
