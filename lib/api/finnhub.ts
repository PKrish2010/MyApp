const API_KEY = 'd1q7r89r01qrh89omcd0d1q7r89r01qrh89omcdg'; // Replace with your real API key
const BASE_URL = 'https://finnhub.io/api/v1';

// ✅ Correct named export
export async function fetchStockQuote(symbol: string) {
  const res = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`);
  if (!res.ok) throw new Error('Failed to fetch stock quote');
  return res.json();
}
export const searchStocks = async (query: string) => {
  const response = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${API_KEY}`
  );
  const data = await response.json();
  return data.result || [];
};