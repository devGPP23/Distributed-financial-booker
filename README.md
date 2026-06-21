# ⚡ Distributed Fin Book Order Matching Engine

> A **super fast trading engine** built with Node.js. It handles thousands of orders per second without crashing, making it perfect for distributed financial books or crypto trading!

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green)](https://nodejs.org)
[![Redis](https://img.shields.io/badge/Redis-7.x-red)](https://redis.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-blue)](https://postgresql.org)
[![Artillery](https://img.shields.io/badge/Load%20Tested-1000%20req%2Fs-orange)](https://artillery.io)

---

## 🌟 Why is this so fast?

We built this engine to solve hard problems in a simple way. Here is how it works under the hood:

*   **⚡ Lightning Fast Matching:** We keep all active orders in the server's memory (RAM) instead of a slow database. This means buyers and sellers are matched instantly!
*   **🚀 Handles Heavy Traffic:** Powered by Node.js, the engine can easily handle a massive rush of users (like a busy financial market) without freezing.
*   **🛡️ No Missing Trades:** Every time a trade happens, it is safely queued up and saved to PostgreSQL in the background. Even if the server restarts, no trades are ever lost or counted twice!
*   **🔌 Live Screen Updates:** When an order happens, we instantly push the update to your screen using WebSockets. Everyone sees the changes at the exact same time without refreshing the page!

---

## 🏗️ How it Works (Flowchart)

Here is a simple picture of how the data flows from your browser to the database:

```mermaid
graph TD
    Client["🖥️ Your Browser\n(The Dashboard)"]
    
    subgraph API_Layer["API Server"]
        HTTP["Express.js API"]
        Auth["Login Check"]
        RateLimit["Rate Limiter\n(Stops Spam)"]
    end
    
    subgraph Core_Engine["Super Fast Memory"]
        Engine["Matching Engine\n(Finds Deals)"]
        OrderBook["Order Book\n(List of Bids & Asks)"]
    end
    
    subgraph Messaging["Background Workers"]
        PubSub["Live Broadcaster"]
        Cache["Fast Cache (Redis)"]
        Queue["Background Tasks (BullMQ)"]
    end
    
    subgraph Persistence["Safe Storage"]
        Postgres["PostgreSQL Database\n(Saves Trades forever)"]
    end
    
    Client -->|"Places Order"| RateLimit
    RateLimit --> Auth
    Auth --> HTTP
    HTTP --> Engine
    Engine --> OrderBook
    Engine -->|"1. Put trade in queue"| Queue
    Engine -->|"2. Update fast cache"| Cache
    Engine -->|"3. Tell everyone"| PubSub
    PubSub -->|"Live update!"| Client
    Queue -->|"Save safely"| Postgres
    Cache -->|"Show fast order list"| HTTP
```

---

## 🚀 Getting Started

Want to run this on your own computer? It's easy! Just follow these steps.

### What you need first
Make sure you have Docker installed so we can run our databases easily.
```bash
# This starts up Redis and PostgreSQL for you!
docker-compose up -d
```

### Setup the code
```bash
# Download all the required packages
npm install

# Setup your database tables
npm run db:push
```

### Start the Servers
You will need to open two terminal windows to run this properly.

```bash
# Terminal 1 — Start the main web server
npm run dev

# Terminal 2 — Start the background worker (this saves trades)
npm run worker
```

Now open your browser and go to: **http://localhost:3000** 🎉

---

## 🔥 Stress Testing it!

Want to see how tough this engine is? You can run our "Artillery" stress test, which pretends to be hundreds of users clicking "Buy" and "Sell" at the same time.

```bash
# This shoots 1000 orders per second at your server!
npm run load:test

# Want to see a pretty report of how it went?
npm run load:report
# Then open load-test/report.html in your browser!
```

---

## 📡 For Developers (API Guide)

If you want to build your own bot or app on top of this engine, use these API links!

### 1. Place an Order
**POST `/api/order`**
```json
{
  "side":     "BUY",    // or "SELL"
  "type":     "LIMIT",  // or "MARKET"
  "symbol":   "BTC",
  "price":    47500,    // How much you want to pay
  "quantity": 5         // How many you want to buy
}
```
*(You need to be logged in and send your JWT Token in the headers!)*

### 2. See the Order Book
**GET `/api/order/book?symbol=BTC`**
Get the live list of buyers and sellers instantly.

### 3. See Server Health
**GET `/api/stats?symbol=BTC`**
See how fast the engine is running and how many trades are queued up.

---

## 📁 Project Folders Explained

Here is where everything lives in the code:

```
distributed-fin-book/
├── server.js                    # The main starting point of the app
├── public/                      # The Dashboard code (HTML/CSS)
├── src/
│   ├── engine/                  # The super fast matching algorithm!
│   ├── routes/                  # API URLs (like /api/order)
│   ├── controllers/             # The logic for placing orders
│   ├── workers/                 # The background worker saving to Postgres
│   ├── websockets/              # The live update broadcaster
│   └── config/                  # Database connections
└── docker-compose.yml           # Runs Postgres and Redis
```
