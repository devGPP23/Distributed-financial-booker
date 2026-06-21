// app.js — Frontend dashboard logic
// 1. WebSocket se live updates leta hai
// 2. /api/stats se system metrics poll karta hai
// 3. Order aur login forms handle karta hai

// UI State variables
let currentSymbol = 'BTC'; 
let currentSide   = 'BUY'; 
let lastPrice     = null; 
let lastTradeCount = 0;
let lastTradeTime  = Date.now();

// WebSocket connection
const socket = io();

socket.on('connect', () => {
    console.log('[WS] Connected to server, socket ID:', socket.id);
    setConnectionStatus(true); // Connected status
});

socket.on('disconnect', () => {
    console.log('[WS] Disconnected from server');
    setConnectionStatus(false); // Disconnected status
});

// orderbook_update event jab bhi server se aaye
socket.on('orderbook_update', (payload) => {
    console.log('[WS] Order book update received:', payload.symbol);
    if (payload.symbol !== currentSymbol) return; // dusre markets ignore karo

    const { bids, asks, trades } = payload.data;
    renderOrderBook(bids, asks);
    updateTicker(bids, asks, trades);

    if (trades && trades.length > 0) {
        const latest = trades[trades.length - 1];
        appendTradeToFeed(latest);
    }
});

// Order Book HTML render karne ke liye
function renderOrderBook(bids = [], asks = []) {
    const asksEl = document.getElementById('book-asks');
    const bidsEl = document.getElementById('book-bids');

    // Max quantity find kar rahe depth bar ke liye
    const maxQty = Math.max(
        ...bids.map(o => o.quantity),
        ...asks.map(o => o.quantity),
        1  // prevent division by zero
    );

    // Asks render (Sellers)
    if (asks.length === 0) {
        asksEl.innerHTML = '<div class="book-empty">No asks yet…</div>';
    } else {
        asksEl.innerHTML = asks.slice(0, 8).map(order => `
            <div class="book-row ask" style="--depth: ${(order.quantity / maxQty * 70).toFixed(0)}%">
                <span class="book-price">$${Number(order.price).toLocaleString()}</span>
                <span class="book-qty">${order.quantity}</span>
                <span class="book-total">$${(order.price * order.quantity).toLocaleString()}</span>
            </div>
        `).join('');
    }

    // Bids render (Buyers)
    if (bids.length === 0) {
        bidsEl.innerHTML = '<div class="book-empty">No bids yet…</div>';
    } else {
        bidsEl.innerHTML = bids.slice(0, 8).map(order => `
            <div class="book-row bid" style="--depth: ${(order.quantity / maxQty * 70).toFixed(0)}%">
                <span class="book-price">$${Number(order.price).toLocaleString()}</span>
                <span class="book-qty">${order.quantity}</span>
                <span class="book-total">$${(order.price * order.quantity).toLocaleString()}</span>
            </div>
        `).join('');
    }

    // Spread bar update
    const bestAsk = asks[0]  ? asks[0].price  : null;
    const bestBid = bids[0]  ? bids[0].price  : null;

    if (bestAsk && bestBid) {
        const spread = (bestAsk - bestBid).toFixed(2);
        const mid    = ((bestAsk + bestBid) / 2).toFixed(2);
        document.getElementById('spread-value').textContent = `$${spread}`;
        document.getElementById('mid-price').textContent    = `$${Number(mid).toLocaleString()}`;
    } else {
        document.getElementById('spread-value').textContent = '—';
        document.getElementById('mid-price').textContent    = '—';
    }
}

// Top price ticker update karna
function updateTicker(bids, asks, trades) {
    const bestBid = bids[0] ? bids[0].price : null;
    const bestAsk = asks[0] ? asks[0].price : null;

    // Mid-price calculation
    const mid = bestBid && bestAsk
        ? (bestBid + bestAsk) / 2
        : (trades && trades.length > 0 ? trades[trades.length - 1].price : null);

    const priceEl = document.getElementById('ticker-price');

    if (mid !== null) {
        // Price change pe color flash karna
        if (lastPrice !== null) {
            priceEl.classList.remove('up', 'down');
            priceEl.classList.add(mid >= lastPrice ? 'up' : 'down');
            setTimeout(() => priceEl.classList.remove('up', 'down'), 1000);
        }
        lastPrice = mid;
        priceEl.textContent = `$${Number(mid.toFixed(2)).toLocaleString()}`;
    }

    document.getElementById('ticker-bid').textContent = bestBid ? `$${Number(bestBid).toLocaleString()}` : '—';
    document.getElementById('ticker-ask').textContent = bestAsk ? `$${Number(bestAsk).toLocaleString()}` : '—';

    const totalEl = document.getElementById('total-trades');
    if (trades) totalEl.textContent = trades.length;
}

// Live trade feed me naye trades dalna
const seenTradeIds = new Set(); 

function appendTradeToFeed(trade) {
    const key = `${trade.buyerId}-${trade.sellerId}-${trade.timestamp}`;
    if (seenTradeIds.has(key)) return; // already shown
    seenTradeIds.add(key);

    const feed = document.getElementById('trade-feed');

    // Placeholder remove karo
    const placeholder = feed.querySelector('.trade-empty');
    if (placeholder) placeholder.remove();

    const timeStr = new Date(trade.timestamp).toLocaleTimeString();
    const row = document.createElement('div');
    row.className = 'trade-row';
    row.innerHTML = `
        <span class="trade-symbol">${trade.symbol || currentSymbol}</span>
        <span class="trade-price">$${Number(trade.price).toLocaleString()}</span>
        <span class="trade-qty">${trade.quantity}</span>
        <span class="trade-time">${timeStr}</span>
    `;

    feed.insertBefore(row, feed.firstChild);

    // 50 se jyada rows mat rakho memory ke liye
    while (feed.children.length > 50) {
        feed.removeChild(feed.lastChild);
    }
}

// 6. STATS POLLING — /api/stats har 2 second me poll hota hai
async function fetchStats() {
    try {
        const res  = await fetch(`/api/stats?symbol=${currentSymbol}`);
        const data = await res.json();

        // Queue stats update
        document.getElementById('q-completed').textContent = data.queue.completed;
        document.getElementById('q-waiting').textContent   = data.queue.waiting;
        document.getElementById('q-failed').textContent    = data.queue.failed;

        document.getElementById('cache-status').textContent = data.cache.hit ? 'HIT ✓' : 'MISS ✗';
        document.getElementById('bids-count').textContent = data.orderBook.bids;
        document.getElementById('asks-count').textContent = data.orderBook.asks;

        const mins = Math.floor(data.uptime / 60);
        const secs = data.uptime % 60;
        document.getElementById('uptime').textContent = `${mins}m ${secs}s`;
        document.getElementById('memory').textContent = `${data.memoryMB} MB`;
        document.getElementById('total-trades').textContent = data.orderBook.totalTrades;

        // Market summary updates
        const bidsN = data.orderBook.bids || 0;
        const asksN = data.orderBook.asks || 0;
        document.getElementById('book-depth').textContent = bidsN + asksN;

        // Orders per second calc
        const now = Date.now();
        const elapsed = (now - lastTradeTime) / 1000;
        const newTrades = data.orderBook.totalTrades - lastTradeCount;
        if (elapsed > 0 && newTrades >= 0) {
            const ops = elapsed > 2 ? (newTrades / elapsed).toFixed(1) : '0';
            document.getElementById('orders-per-sec').textContent = ops;
        }
        lastTradeCount = data.orderBook.totalTrades;
        lastTradeTime = now;

        // Agar recent trades hai toh feed me dalo
        if (data.orderBook.recentTrades) {
            data.orderBook.recentTrades.forEach(appendTradeToFeed);
        }

    } catch (err) {
        // Server might not be running — fail silently, no crash
        console.error('[Stats Poll] Error:', err.message);
    }
}

// Start polling immediately and then every 2000ms
fetchStats();
setInterval(fetchStats, 2000);

// Views aur tabs switch karne ke liye
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-container').forEach(el => el.classList.add('hidden'));
    
    // Deactivate all view tabs
    document.querySelectorAll('.view-tab').forEach(el => el.classList.remove('active'));
    
    // Show selected view
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    // Activate clicked tab
    document.querySelector(`.view-tab[data-view="${viewName}"]`).classList.add('active');
}

// Naya order place karne ka function
async function placeOrder() {
    const token    = document.getElementById('jwt-token').value.trim();
    const type     = document.getElementById('order-type').value;
    const symbol   = document.getElementById('order-symbol').value;
    const price    = parseFloat(document.getElementById('order-price').value);
    const quantity = parseFloat(document.getElementById('order-quantity').value);
    const resultEl = document.getElementById('form-result');
    const btnEl    = document.getElementById('submit-btn');
    const spinnerEl= document.getElementById('submit-spinner');
    const labelEl  = document.getElementById('submit-label');

    // Validation
    if (!token) {
        showResult(resultEl, 'error', '⚠ Please login first and paste your JWT token above.');
        return;
    }
    if (!quantity || quantity <= 0) {
        showResult(resultEl, 'error', '⚠ Please enter a valid quantity.');
        return;
    }
    if (type === 'LIMIT' && (!price || price <= 0)) {
        showResult(resultEl, 'error', '⚠ LIMIT orders require a price.');
        return;
    }

    // Loading state dikhao
    labelEl.textContent   = 'Placing order…';
    spinnerEl.classList.remove('hidden');
    btnEl.disabled = true;

    try {
        const startTime = performance.now();
        const res = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ side: currentSide, type, symbol, price, quantity }),
        });
        const latencyMs = (performance.now() - startTime).toFixed(0);
        document.getElementById('engine-latency').textContent = `${latencyMs}ms`;

        const data = await res.json();

        if (res.ok) {
            const tradeCount = data.trades ? data.trades.length : 0;
            showResult(resultEl, 'success',
                `✓ ${currentSide} order placed! ${tradeCount > 0 ? `${tradeCount} trade(s) matched instantly.` : 'Order added to book.'}`
            );
            // track in my orders
            addToMyOrders(currentSide, symbol, price, quantity);

            // update spread % from current best bid/ask
            const bestBid = document.getElementById('ticker-bid').textContent;
            const bestAsk = document.getElementById('ticker-ask').textContent;
            updateSpreadPct(bestBid, bestAsk);
        } else {
            showResult(resultEl, 'error', `✕ ${data.error || 'Request failed'}`);
        }

    } catch (err) {
        showResult(resultEl, 'error', `✕ Network error: ${err.message}`);
    } finally {
        // Reset button state
        btnEl.disabled = false;
        spinnerEl.classList.add('hidden');
        labelEl.textContent = `Place ${currentSide} Order`;
    }
}

// Result show karne ke liye helper
function showResult(el, type, msg) {
    el.className = `form-result ${type}`;
    el.textContent = msg;
    el.classList.remove('hidden');
    // Auto-hide after 5 seconds
    setTimeout(() => el.classList.add('hidden'), 5000);
}

// Auth functions - login & signup
async function login() {
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const resultEl = document.getElementById('auth-result');

    try {
        // Login API call
        const res  = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok && data.token) {
            // Token form me dal do aaram ke liye
            document.getElementById('jwt-token').value = data.token;
            
            try {
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                const displayName = payload.name || 'User';
                document.getElementById('sidebar-name').textContent = displayName;
                document.getElementById('sidebar-role').textContent = payload.email || 'Authenticated';
                document.getElementById('sidebar-avatar').textContent = displayName.charAt(0).toUpperCase();
            } catch (e) {
                document.getElementById('sidebar-name').textContent = 'Authenticated User';
                document.getElementById('sidebar-role').textContent = email;
            }

            showAuthResult(resultEl, 'success',
                `✓ Logged in! Token pasted into order form.\n${data.token.substring(0, 40)}…`
            );
        } else {
            showAuthResult(resultEl, 'error', `✕ ${data.error}`);
        }
    } catch (err) {
        showAuthResult(resultEl, 'error', `✕ Network error`);
    }
}

async function signup() {
    const name     = document.getElementById('signup-name').value;
    const email    = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const resultEl = document.getElementById('auth-result');

    try {
        // Signup API call
        const res  = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (res.ok) {
            showAuthResult(resultEl, 'success', `✓ Account created! Now login to get your token.`);
            showAuth('login');
        } else {
            showAuthResult(resultEl, 'error', `✕ ${data.error}`);
        }
    } catch (err) {
        showAuthResult(resultEl, 'error', `✕ Network error`);
    }
}

function showAuthResult(el, type, msg) {
    el.className = `auth-result ${type}`;
    el.textContent = msg;
    el.classList.remove('hidden');
}

// UI control helpers
// Buy/Sell switch
function setSide(side) {
    currentSide = side;
    const buyBtn   = document.getElementById('side-buy');
    const sellBtn  = document.getElementById('side-sell');
    const submitBtn= document.getElementById('submit-btn');
    const label    = document.getElementById('submit-label');

    if (side === 'BUY') {
        buyBtn.classList.add('active');
        sellBtn.classList.remove('active');
        submitBtn.className = 'submit-btn buy';
        label.textContent   = 'Place BUY Order';
    } else {
        sellBtn.classList.add('active');
        buyBtn.classList.remove('active');
        submitBtn.className = 'submit-btn sell';
        label.textContent   = 'Place SELL Order';
    }
}

// Market orders ke liye price field hide karo
function togglePriceField() {
    const type     = document.getElementById('order-type').value;
    const priceEl  = document.getElementById('price-field');
    if (type === 'MARKET') {
        priceEl.classList.add('hidden');
    } else {
        priceEl.classList.remove('hidden');
    }
}

// Active symbol switch karo
function switchSymbol(symbol) {
    currentSymbol = symbol;
    lastPrice     = null; // reset price direction tracker

    // Update header tabs
    document.querySelectorAll('.symbol-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.symbol === symbol);
    });

    // Update ticker symbol display
    document.getElementById('ticker-symbol').textContent = `${symbol}/USD`;
    document.getElementById('ticker-price').textContent  = '—';
    document.getElementById('ticker-bid').textContent    = '—';
    document.getElementById('ticker-ask').textContent    = '—';

    // Reset the order book display
    document.getElementById('book-bids').innerHTML = '<div class="book-empty">Loading…</div>';
    document.getElementById('book-asks').innerHTML = '<div class="book-empty">Loading…</div>';

    // Fetch fresh stats for the new symbol
    fetchStats();

    // Try to load from Redis cache via the book endpoint
    fetchOrderBookSnapshot(symbol);
}

// Initial orderbook snapshot fetch karo
async function fetchOrderBookSnapshot(symbol) {
    try {
        const res  = await fetch(`/api/order/book?symbol=${symbol}`);
        const data = await res.json();
        renderOrderBook(data.bids || [], data.asks || []);
        updateTicker(data.bids || [], data.asks || [], data.trades || []);
        if (data.trades) {
            data.trades.slice(-5).forEach(appendTradeToFeed);
            document.getElementById('total-trades').textContent = data.trades.length;
        }
    } catch (err) {
        console.error('[Snapshot] Error fetching order book:', err.message);
    }
}

// Auth panels switch karo
function showAuth(panel) {
    document.getElementById('auth-login').classList.toggle('hidden', panel !== 'login');
    document.getElementById('auth-signup').classList.toggle('hidden', panel !== 'signup');
    document.querySelectorAll('.auth-tab').forEach((tab, i) => {
        tab.classList.toggle('active', (i === 0 && panel === 'login') || (i === 1 && panel === 'signup'));
    });
}

// Connection status badge update
function setConnectionStatus(isConnected) {
    const dot    = document.getElementById('status-dot');
    const text   = document.getElementById('status-text');
    const badge  = document.getElementById('ws-status');

    dot.className = `status-dot ${isConnected ? 'connected' : 'disconnected'}`;
    text.textContent = isConnected ? 'Live' : 'Disconnected';
}

// Page load hone par snapshot lao
fetchOrderBookSnapshot(currentSymbol);

// My Orders tracker - session me placed orders dikhata hai
function addToMyOrders(side, symbol, price, quantity) {
    const list = document.getElementById('my-orders-list');
    const placeholder = list.querySelector('.book-empty');
    if (placeholder) placeholder.remove();

    const timeStr = new Date().toLocaleTimeString();
    const row = document.createElement('div');
    row.className = 'my-order-row';
    row.innerHTML = `
        <span class="my-order-side ${side.toLowerCase()}">${side}</span>
        <span class="my-order-price">$${Number(price).toLocaleString()}</span>
        <span class="my-order-qty">${quantity}</span>
        <span class="my-order-time">${timeStr}</span>
    `;
    list.insertBefore(row, list.firstChild);

    // Max 20 orders
    while (list.children.length > 20) {
        list.removeChild(list.lastChild);
    }
}

// Spread % calculation
function updateSpreadPct(bidStr, askStr) {
    const bid = parseFloat(bidStr.replace(/[$,]/g, ''));
    const ask = parseFloat(askStr.replace(/[$,]/g, ''));
    const el = document.getElementById('spread-pct');
    if (bid && ask && bid > 0) {
        const pct = (((ask - bid) / bid) * 100).toFixed(2);
        el.textContent = `${pct}%`;
    } else {
        el.textContent = '\u2014';
    }
}
