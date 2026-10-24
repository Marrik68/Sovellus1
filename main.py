from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return {"message": "Portfolio API running"}

@app.get("/api/price")
def get_price(ticker: str = Query(...)):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        price = info.get("regularMarketPrice") or info.get("currentPrice")
        prev = info.get("previousClose") or price
        change = (price - prev) / prev * 100 if prev else 0
        return {"ticker": ticker, "price": price, "changePercent": change}
    except Exception as e:
        return {"ticker": ticker, "price": None, "changePercent": 0, "error": str(e)}

@app.get("/api/history")
def get_history(ticker: str = Query(...), period: str = "1mo", interval: str = "1d"):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)
        if hist.empty:
            return {"ticker": ticker, "timestamps": [], "prices": []}
        prices = hist["Close"].tolist()
        ts = [str(i.date()) for i in hist.index]
        return {"ticker": ticker, "timestamps": ts[-30:], "prices": prices[-30:]}
    except Exception as e:
        return {"ticker": ticker, "timestamps": [], "prices": [], "error": str(e)}

@app.get("/api/news")
def get_news(ticker: str = Query(...), limit: int = 3):
    try:
        stock = yf.Ticker(ticker)
        news_list = stock.news
        formatted = []
        for item in news_list[:limit]:
            formatted.append({
                "title": item.get("title", ""),
                "publisher": item.get("publisher", "Unknown"),
                "link": item.get("link", "https://finance.yahoo.com"),
                "summary": item.get("summary", "")
            })
        return {"ticker": ticker, "news": formatted}
    except Exception as e:
        return {"ticker": ticker, "news": [], "error": str(e)}
