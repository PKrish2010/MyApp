import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';

// Yahoo Finance API functions
const fetchYahooQuote = async (symbol: string) => {
  try {
    // Try the quote endpoint first - it's more reliable for current data
    const quoteResponse = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,shortName,longName,marketState,preMarketPrice,preMarketChange,preMarketChangePercent,postMarketPrice,postMarketChange,postMarketChangePercent`
    );
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      
      if (quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result[0]) {
        const quote = quoteData.quoteResponse.result[0];
        
        const price = quote.regularMarketPrice ?? 0;
        const change = quote.regularMarketChange ?? 0;
        const changePercent = quote.regularMarketChangePercent ?? 0;
        const previousClose = quote.regularMarketPreviousClose ?? price;
        
        // Pre-market data
        const preMarketPrice = quote.preMarketPrice ?? 0;
        const preMarketChange = quote.preMarketChange ?? 0;
        const preMarketChangePercent = quote.preMarketChangePercent ?? 0;
        
        // After-hours data
        const postMarketPrice = quote.postMarketPrice ?? 0;
        const postMarketChange = quote.postMarketChange ?? 0;
        const postMarketChangePercent = quote.postMarketChangePercent ?? 0;
        
        return {
          symbol: quote.symbol || symbol,
          name: quote.longName || quote.shortName || symbol,
          price: price,
          change: change,
          changePercent: changePercent,
          previousClose: previousClose,
          dayHigh: quote.regularMarketDayHigh ?? price,
          dayLow: quote.regularMarketDayLow ?? price,
          volume: quote.regularMarketVolume ?? 0,
          marketState: quote.marketState || 'CLOSED',
          preMarketPrice: preMarketPrice,
          preMarketChange: preMarketChange,
          preMarketChangePercent: preMarketChangePercent,
          postMarketPrice: postMarketPrice,
          postMarketChange: postMarketChange,
          postMarketChangePercent: postMarketChangePercent
        };
      }
    }
    
    // Fallback to chart endpoint if quote endpoint fails
    const chartResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?region=US&lang=en-US&includePrePost=true&interval=1d&range=5d&corsDomain=finance.yahoo.com`
    );
    const chartData = await chartResponse.json();
    
    if (!chartData.chart || !chartData.chart.result || !chartData.chart.result[0]) {
      throw new Error('Invalid API response structure');
    }
    
    const result = chartData.chart.result[0];
    const meta = result.meta;
    
    // Get the latest price data from the chart
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    if (timestamps && quotes && timestamps.length > 0) {
      const latestIndex = timestamps.length - 1;
      const currentPrice = quotes.close[latestIndex] ?? meta.regularMarketPrice ?? 0;
      const previousPrice = latestIndex > 0 ? quotes.close[latestIndex - 1] : meta.previousClose ?? currentPrice;
      
      const change = currentPrice - previousPrice;
      const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
      
      return {
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        previousClose: previousPrice,
        dayHigh: meta.regularMarketDayHigh ?? currentPrice,
        dayLow: meta.regularMarketDayLow ?? currentPrice,
        volume: meta.regularMarketVolume ?? 0,
        marketState: meta.marketState || 'CLOSED',
        preMarketPrice: meta.preMarketPrice ?? 0,
        preMarketChange: meta.preMarketChange ?? 0,
        preMarketChangePercent: meta.preMarketChangePercent ?? 0,
        postMarketPrice: meta.postMarketPrice ?? 0,
        postMarketChange: meta.postMarketChange ?? 0,
        postMarketChangePercent: meta.postMarketChangePercent ?? 0
      };
    }
    
    // Last resort - use meta data only
    const price = meta.regularMarketPrice ?? 0;
    const previousClose = meta.previousClose ?? price;
    const change = price - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
    
    return {
      symbol: meta.symbol || symbol,
      name: meta.longName || meta.shortName || symbol,
      price: price,
      change: change,
      changePercent: changePercent,
      previousClose: previousClose,
      dayHigh: meta.regularMarketDayHigh ?? price,
      dayLow: meta.regularMarketDayLow ?? price,
      volume: meta.regularMarketVolume ?? 0,
      marketState: meta.marketState || 'CLOSED',
      preMarketPrice: meta.preMarketPrice ?? 0,
      preMarketChange: meta.preMarketChange ?? 0,
      preMarketChangePercent: meta.preMarketChangePercent ?? 0,
      postMarketPrice: meta.postMarketPrice ?? 0,
      postMarketChange: meta.postMarketChange ?? 0,
      postMarketChangePercent: meta.postMarketChangePercent ?? 0
    };
    
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
};

const searchYahooStocks = async (query: string) => {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query`
    );
    const data = await response.json();
    
    return data.quotes?.filter((quote: any) => 
      quote.quoteType === 'EQUITY' && 
      quote.exchange === 'NMS' || quote.exchange === 'NYQ' || quote.exchange === 'NCM'
    ).map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname,
      exchange: quote.exchange,
      type: quote.quoteType
    })) || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// Market indices with Yahoo Finance symbols
const marketIndices = [
  { symbol: '^GSPC', name: 'S&P 500', type: 'index' },
  { symbol: '^DJI', name: 'Dow Jones', type: 'index' },
  { symbol: '^IXIC', name: 'NASDAQ', type: 'index' },
  { symbol: '^RUT', name: 'Russell 2000', type: 'index' },
  { symbol: '^VIX', name: 'VIX', type: 'index' }
];

// Apple's preset stocks (popular stocks)
const applePresetStocks = [
  // FAANG + Popular Tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NFLX', 'NVDA',
  
  // Other Popular Stocks
  'BRK-B', 'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA',
  'DIS', 'PYPL', 'ADBE', 'CRM', 'INTC', 'CMCSA', 'VZ', 'T',
  'PFE', 'KO', 'PEP', 'WMT', 'MRK', 'ABT', 'COST', 'AVGO'
];

// Popular cryptos (Yahoo symbols)
const popularCryptos = [
  { symbol: 'BTC-USD', shortName: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH-USD', shortName: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL-USD', shortName: 'SOL', name: 'Solana' },
  { symbol: 'DOGE-USD', shortName: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ADA-USD', shortName: 'ADA', name: 'Cardano' },
  { symbol: 'XRP-USD', shortName: 'XRP', name: 'XRP' },
  { symbol: 'LTC-USD', shortName: 'LTC', name: 'Litecoin' },
  { symbol: 'AVAX-USD', shortName: 'AVAX', name: 'Avalanche' },
  { symbol: 'BNB-USD', shortName: 'BNB', name: 'Binance Coin' },
  { symbol: 'SHIB-USD', shortName: 'SHIB', name: 'Shiba Inu' }
];

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketState: string;
  preMarketPrice: number;
  preMarketChange: number;
  preMarketChangePercent: number;
  postMarketPrice: number;
  postMarketChange: number;
  postMarketChangePercent: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

const TTL_MS = 60 * 1000; // 1 minute TTL

// Add these colors for the session indicator
const SESSION_COLORS: { [key: string]: string } = {
  'open': '#10B981',        // green
  'closed': '#6B7280',      // gray
  'pre-market': '#F59E42',  // orange
  'after hours': '#A78BFA', // purple
};

export default function StocksPage() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark'
    ? {
        background: '#000',
        cardBackground: '#18181b',
        sectionBackground: '#18181b',
        text: '#fafafa',
        textSecondary: '#a1a1aa',
        border: '#27272a',
        accent: '#3B82F6',
        shadow: '#000',
        searchBackground: '#18181b',
        searchBorder: '#27272a',
        buttonBackground: '#27272a',
        buttonText: '#fafafa',
      }
    : {
        background: '#f1f5f9',
        cardBackground: '#fff',
        sectionBackground: '#f3f4f6',
        text: '#18181b',
        textSecondary: '#52525b',
        border: '#e5e7eb',
        accent: '#3B82F6',
        shadow: '#64748B',
        searchBackground: '#fff',
        searchBorder: '#e5e7eb',
        buttonBackground: '#3B82F6',
        buttonText: '#fff',
      };
  const router = useRouter();
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([
    ...marketIndices.map(index => index.symbol),
    ...applePresetStocks.slice(0, 5)
  ]);
  const [showSearch, setShowSearch] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<any>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  // Store Animated.Value per symbol
  const checkmarkAnims = useRef<{ [symbol: string]: Animated.Value }>({});
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
  const [marketStatusDisplay, setMarketStatusDisplay] = useState<{text: string, color: string}>({text: '', color: SESSION_COLORS['closed']});
  const quoteCache = React.useRef<{ [symbol: string]: { data: StockQuote, timestamp: number } }>({});

  // Only use Yahoo for all price/session data
  const loadQuotes = async (symbols: string[] = watchlist) => {
    try {
      const now = Date.now();
      const data: Record<string, StockQuote> = {};
      // Try Python FastAPI server first
      try {
        const res = await fetch(`http://localhost:8000/quotes?symbols=${symbols.join(',')}`);
        if (!res.ok) throw new Error('Python API error');
        const results = await res.json();
        console.log('API results:', results); // Debug: see what fields are present
        results.forEach((q: any) => {
          // Compute change and percent if not present
          const price = q.regularMarketPrice ?? 0;
          const previousClose = q.regularMarketPreviousClose ?? 0;
          const change = q.regularMarketChange ?? (price - previousClose);
          const changePercent = q.regularMarketChangePercent ?? (previousClose ? ((price - previousClose) / previousClose) * 100 : 0);
          data[q.symbol] = {
            symbol: q.symbol,
            name: q.longName || q.shortName || q.symbol,
            price,
            change,
            changePercent,
            previousClose,
            dayHigh: q.regularMarketDayHigh ?? 0,
            dayLow: q.regularMarketDayLow ?? 0,
            volume: q.regularMarketVolume ?? 0,
            marketState: q.marketState || 'CLOSED',
            preMarketPrice: q.preMarketPrice ?? 0,
            preMarketChange: q.preMarketChange ?? 0,
            preMarketChangePercent: q.preMarketChangePercent ?? 0,
            postMarketPrice: q.postMarketPrice ?? 0,
            postMarketChange: q.postMarketChange ?? 0,
            postMarketChangePercent: q.postMarketChangePercent ?? 0
          };
          quoteCache.current[q.symbol] = { data: data[q.symbol], timestamp: now };
        });
      } catch (err) {
        // Fallback to Yahoo if Python server fails
        const promises = symbols.map(async (symbol) => {
          // Check cache
          if (
            quoteCache.current[symbol] &&
            now - quoteCache.current[symbol].timestamp < TTL_MS
          ) {
            data[symbol] = quoteCache.current[symbol].data;
            return;
          }
          try {
            const quote = await fetchYahooQuote(symbol);
            data[symbol] = quote;
            quoteCache.current[symbol] = { data: quote, timestamp: now };
          } catch (err) {
            data[symbol] = {
              symbol,
              name: symbol,
              price: 0,
              change: 0,
              changePercent: 0,
              previousClose: 0,
              dayHigh: 0,
              dayLow: 0,
              volume: 0,
              marketState: 'CLOSED',
              preMarketPrice: 0,
              preMarketChange: 0,
              preMarketChangePercent: 0,
              postMarketPrice: 0,
              postMarketChange: 0,
              postMarketChangePercent: 0
            };
          }
        });
        await Promise.all(promises);
      }
      setQuotes(prev => ({ ...prev, ...data }));
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load quotes', err);
      Alert.alert('Error', 'Failed to load stock data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchYahooStocks(query);
      setSearchResults(results.slice(0, 20)); // Limit to 20 results
    } catch (err) {
      console.error('Search failed', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addToWatchlist = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      const newWatchlist = [...watchlist, symbol];
      setWatchlist(newWatchlist);
      
      // Load quote for new symbol
      fetchYahooQuote(symbol)
        .then(quote => {
          setQuotes(prev => ({ ...prev, [symbol]: quote }));
        })
        .catch(err => console.error(`Failed to load ${symbol}`, err));
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
    setQuotes(prev => {
      const newQuotes = { ...prev };
      delete newQuotes[symbol];
      return newQuotes;
    });
  };

  const formatPrice = (price: number) => {
    if (price === undefined || price === null) return '--';
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const onRefresh = async () => {
    quoteCache.current = {}; // Clear cache on manual refresh
    setRefreshing(true);
    await loadQuotes();
  };

  // Helper to get ET minutes since midnight
  const getETMinutesSinceMidnight = () => {
    const now = new Date();
    const nyTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
    const timePart = nyTimeString.split(', ')[1];
    const [nyHour, nyMinute] = timePart.split(':').map(Number);
    return nyHour * 60 + nyMinute;
  };

  // Auto-refresh: 5s during regular hours, 1min during PM/AH, none during closed
  useEffect(() => {
    loadQuotes();
    const setAppropriateInterval = () => {
      const mins = getETMinutesSinceMidnight();
      // 4:00 AM = 240, 9:30 AM = 570, 4:00 PM = 960, 8:00 PM = 1200
      if (mins >= 570 && mins < 960) {
        // Regular hours: 5 seconds
        return 5000;
      } else if ((mins >= 240 && mins < 570) || (mins >= 960 && mins < 1200)) {
        // Pre-market or after-hours: 1 minute
        return 60000;
      } else {
        // Closed: no auto-refresh
        return null;
      }
    };
    let interval = setAppropriateInterval();
    let intervalRefId: any = null;
    if (interval) {
      intervalRefId = setInterval(() => {
        loadQuotes();
        // Check if interval needs to change (e.g., market opens/closes)
        const newInterval = setAppropriateInterval();
        if (newInterval !== interval) {
          if (intervalRefId) clearInterval(intervalRefId);
          interval = newInterval;
          if (interval) {
            intervalRefId = setInterval(() => loadQuotes(), interval);
          }
        }
      }, interval);
    }
    // Cleanup interval on unmount
    return () => {
      if (intervalRefId) {
        clearInterval(intervalRefId);
      }
    };
  }, []);

  useEffect(() => {
    const timeoutId: any = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Show after-hours/pre-market prices if available
  const getCurrentPrice = (quote: StockQuote) => {
    if (quote.marketState === 'POST' && quote.postMarketPrice) return quote.postMarketPrice;
    if (quote.marketState === 'PRE' && quote.preMarketPrice) return quote.preMarketPrice;
    return quote.price;
  };
  const getCurrentChange = (quote: StockQuote) => {
    if (quote.marketState === 'POST' && quote.postMarketChange) return quote.postMarketChange;
    if (quote.marketState === 'PRE' && quote.preMarketChange) return quote.preMarketChange;
    return quote.change;
  };
  const getCurrentChangePercent = (quote: StockQuote) => {
    if (quote.marketState === 'POST' && quote.postMarketChangePercent) return quote.postMarketChangePercent;
    if (quote.marketState === 'PRE' && quote.preMarketChangePercent) return quote.preMarketChangePercent;
    return quote.changePercent;
  };

  const getMarketStatus = (quote: StockQuote) => {
    // Get current time in America/New_York robustly
    const now = new Date();
    const nyTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
    // nyTimeString is like '6/8/2024, 05:50:00' or '6/8/2024, 5:50:00'
    const timePart = nyTimeString.split(', ')[1];
    const [nyHour, nyMinute] = timePart.split(':').map(Number);
    const minsSinceMidnight = nyHour * 60 + nyMinute;
    if (minsSinceMidnight >= 240 && minsSinceMidnight < 570) {
      // 4:00 AM to 9:29 AM ET
      return 'PM';
    }
    if (minsSinceMidnight >= 570 && minsSinceMidnight < 960) {
      // 9:30 AM to 3:59 PM ET
      return 'OPEN';
    }
    if (minsSinceMidnight >= 960 && minsSinceMidnight < 1200) {
      // 4:00 PM to 8:00 PM ET
      return 'AH';
    }
    if (quote.marketState === 'POST' || quote.marketState === 'POSTPOST') {
      return 'AH';
    } else if (quote.marketState === 'PRE' || quote.marketState === 'PREPRE') {
      return 'PM';
    } else if (quote.marketState === 'CLOSED') {
      return 'CLOSED';
    }
    return 'CLOSED';
  };

  // Helper to get display name and type for a symbol
  const getItemMeta = (symbol: string) => {
    const idx = marketIndices.find(i => i.symbol === symbol);
    if (idx) return { name: idx.name, isIndex: true, isCrypto: false };
    const crypto = popularCryptos.find(c => c.symbol === symbol);
    if (crypto) return { name: crypto.name, isIndex: false, isCrypto: true };
    const quote = quotes[symbol];
    return { name: quote?.name || symbol, isIndex: false, isCrypto: false };
  };

  const addToWatchlistWithCheck = (symbol: string, isSearch = false) => {
    setJustAdded(symbol);
    if (!isSearch) setPendingRemoval((prev) => [...prev, symbol]);
    if (!checkmarkAnims.current[symbol]) {
      checkmarkAnims.current[symbol] = new Animated.Value(0);
    }
    const anim = checkmarkAnims.current[symbol];
    anim.setValue(0);
    console.log('Triggering checkmark animation for', symbol);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setJustAdded(null);
          addToWatchlist(symbol);
          if (!isSearch) setPendingRemoval((prev) => prev.filter((s) => s !== symbol));
        });
      }, 700);
    });
  };

  useEffect(() => {
    function getNextSessionBoundary(nyTime: Date) {
      const day = nyTime.getDay();
      const hour = nyTime.getHours();
      const minute = nyTime.getMinutes();
      const mins = hour * 60 + minute;
      // Session boundaries in minutes since midnight
      const preMarketStart = 4 * 60;      // 4:00am
      const regularStart = 9 * 60 + 30;   // 9:30am
      const regularEnd = 16 * 60;         // 4:00pm
      const afterHoursEnd = 20 * 60;      // 8:00pm

      let session = 'closed';
      let nextSession = 'pre-market';
      let nextBoundary = new Date(nyTime);

      // Helper to set nextBoundary to a specific time (hour, min) and optionally add days
      function setBoundary(h: number, m: number, addDays: number = 0) {
        nextBoundary.setHours(h, m, 0, 0);
        if (addDays > 0) nextBoundary.setDate(nextBoundary.getDate() + addDays);
        if (nextBoundary <= nyTime) nextBoundary.setDate(nextBoundary.getDate() + 1); // always in future
      }

      // Weekend handling
      if (day === 0 || (day === 6 && mins >= afterHoursEnd)) {
        // Sunday or Saturday after 8pm: next is Monday 4:00am
        session = 'closed';
        nextSession = 'pre-market';
        // Days until Monday
        const daysUntilMonday = (8 - day) % 7;
        setBoundary(4, 0, daysUntilMonday);
      } else if (day === 6) {
        // Saturday before 8pm: next is Monday 4:00am
        session = 'closed';
        nextSession = 'pre-market';
        setBoundary(4, 0, 2);
      } else if (mins < preMarketStart) {
        // Closed (before 4am)
        session = 'closed';
        nextSession = 'pre-market';
        setBoundary(4, 0);
      } else if (mins < regularStart) {
        // Pre-market
        session = 'pre-market';
        nextSession = 'regular session';
        setBoundary(9, 30);
      } else if (mins < regularEnd) {
        // Regular
        session = 'open';
        nextSession = 'after hours';
        setBoundary(16, 0);
      } else if (mins < afterHoursEnd) {
        // After hours
        session = 'after hours';
        nextSession = 'market close';
        setBoundary(20, 0);
      } else {
        // Closed (after 8pm)
        session = 'closed';
        nextSession = 'pre-market';
        // If Friday after 8pm, next is Monday 4am
        if (day === 5) {
          setBoundary(4, 0, 3); // Friday + 3 days = Monday
        } else {
          setBoundary(4, 0, 1);
        }
      }
      return { session, nextSession, nextBoundary };
    }

    function updateMarketStatusText() {
      const now = new Date();

      // Get current time in NY timezone more reliably
      const nyFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short'
      });

      const nyParts = nyFormatter.formatToParts(now);
      const nyHours = parseInt(nyParts.find(p => p.type === 'hour')?.value || '0');
      const nyMinutes = parseInt(nyParts.find(p => p.type === 'minute')?.value || '0');
      const nyWeekday = nyParts.find(p => p.type === 'weekday')?.value;

      // Convert weekday to number (0=Sunday, 1=Monday, etc.)
      const weekdayMap: { [key: string]: number } = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      };
      const nyDay = weekdayMap[nyWeekday || 'Sun'];

      const mins = nyHours * 60 + nyMinutes;

      // Session boundaries in minutes since midnight
      const preMarketStart = 4 * 60;      // 4:00am
      const regularStart = 9 * 60 + 30;   // 9:30am
      const regularEnd = 16 * 60;         // 4:00pm
      const afterHoursEnd = 20 * 60;      // 8:00pm

      let session = 'closed';
      let nextSession = 'pre-market';
      let nextBoundaryMins = 0;

      // Weekend handling
      if (nyDay === 0 || (nyDay === 6 && mins >= afterHoursEnd)) {
        // Sunday or Saturday after 8pm: next is Monday 4:00am
        session = 'closed';
        nextSession = 'pre-market';
        const daysUntilMonday = nyDay === 0 ? 1 : 2; // Sunday->Monday=1, Saturday->Monday=2
        nextBoundaryMins = (daysUntilMonday * 24 * 60) + preMarketStart - mins;
      } else if (nyDay === 6) {
        // Saturday before 8pm: next is Monday 4:00am
        session = 'closed';
        nextSession = 'pre-market';
        const daysUntilMonday = 2; // Saturday->Monday=2
        nextBoundaryMins = (daysUntilMonday * 24 * 60) + preMarketStart - mins;
      } else if (mins < preMarketStart) {
        // Closed (before 4am on weekday)
        session = 'closed';
        nextSession = 'pre-market';
        nextBoundaryMins = preMarketStart - mins;
      } else if (mins < regularStart) {
        // Pre-market
        session = 'pre-market';
        nextSession = 'regular session';
        nextBoundaryMins = regularStart - mins;
      } else if (mins < regularEnd) {
        // Regular hours
        session = 'open';
        nextSession = 'after hours';
        nextBoundaryMins = regularEnd - mins;
      } else if (mins < afterHoursEnd) {
        // After hours
        session = 'after hours';
        nextSession = 'market close';
        nextBoundaryMins = afterHoursEnd - mins;
      } else {
        // Closed (after 8pm)
        session = 'closed';
        nextSession = 'pre-market';
        // If Friday after 8pm, next is Monday 4am
        if (nyDay === 5) {
          nextBoundaryMins = (3 * 24 * 60) + preMarketStart - mins; // Friday + 3 days = Monday
        } else {
          nextBoundaryMins = (24 * 60) + preMarketStart - mins; // Next day 4am
        }
      }

      // Convert minutes to hours and minutes
      const hours = Math.floor(nextBoundaryMins / 60);
      const minsLeft = nextBoundaryMins % 60;

      // Friendly session names
      const sessionNames: { [key: string]: string } = {
        'open': 'Market Open',
        'closed': 'Market Closed',
        'pre-market': 'Pre-market',
        'after hours': 'After hours',
      };

      // Friendly next session names
      const nextSessionNames: { [key: string]: string } = {
        'regular session': 'market open',
        'after hours': 'after hours',
        'market close': 'market close',
        'pre-market': 'pre-market',
      };

      const color = SESSION_COLORS[session];
      const nextSessionText = nextSessionNames[nextSession] || nextSession;

      // Format the time display
      let timeDisplay = '';
      if (hours > 0) {
        timeDisplay = `${hours}h ${minsLeft}m`;
      } else {
        timeDisplay = `${minsLeft}m`;
      }

      // Remove the extra dot and use only the colored circle
      const text = `${sessionNames[session]} • ${timeDisplay} until ${nextSessionText}`;
      setMarketStatusDisplay({ text, color });
    }
    updateMarketStatusText();
    const interval = setInterval(updateMarketStatusText, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 16, color: colors.textSecondary, fontSize: 16 }}>Loading stocks...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                Watchlist
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {/* Colored circle for session */}
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: marketStatusDisplay.color,
                  marginRight: 8,
                }} />
                <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600' }}>
                  {marketStatusDisplay.text}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Last updated: {lastUpdate.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} ET
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              style={{
                backgroundColor: colors.accent,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                alignSelf: 'flex-start',
                marginTop: 4,
              }}
            >
              {showSearch ? (
                <Text style={{ color: colors.buttonText, fontWeight: '600' }}>Cancel</Text>
              ) : (
                <Ionicons name="search-outline" size={22} color={colors.buttonText} />
              )}
            </TouchableOpacity>
          </View>

          {/* Modern Search Bar */}
          {showSearch && (
            <View style={{ marginBottom: 20 }}>
              <View style={{
                backgroundColor: colors.searchBackground,
                borderRadius: 16,
                padding: 4,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: colors.accent,
                shadowOpacity: 0.15,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
                borderWidth: 1,
                borderColor: colors.searchBorder,
              }}>
                <View style={{
                  backgroundColor: colors.searchBackground,
                  borderRadius: 12,
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}>
                  <Ionicons 
                    name="search" 
                    size={24} 
                    color={colors.accent} 
                    style={{ 
                      marginRight: 12, 
                      backgroundColor: 'rgba(0,0,0,0.15)', 
                      borderRadius: 8, 
                      padding: 6, 
                      shadowColor: colors.shadow, 
                      shadowOpacity: 0.10, 
                      shadowRadius: 6, 
                      shadowOffset: { width: 0, height: 2 }, 
                      elevation: 4, 
                    }} 
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: '500',
                      backgroundColor: 'transparent',
                    }}
                    placeholder="Search stocks, ETFs, or crypto..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    selectionColor={colors.accent}
                  />
                  {searchLoading && (
                    <ActivityIndicator 
                      size="small" 
                      color={colors.accent} 
                      style={{ marginLeft: 8 }} 
                    />
                  )}
                  {searchQuery.length > 0 && !searchLoading && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      style={{
                        marginLeft: 8,
                        padding: 4,
                        borderRadius: 8,
                        backgroundColor: colors.searchBorder,
                      }}
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Search Results with improved styling */}
              {searchResults.length > 0 && (
                <View style={{
                  backgroundColor: colors.searchBackground,
                  borderRadius: 16,
                  marginTop: 8,
                  maxHeight: 280,
                  overflow: 'hidden',
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 4,
                  borderWidth: 1,
                  borderColor: colors.searchBorder,
                }}>
                  <ScrollView 
                    style={{ maxHeight: 260 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {searchResults.map((stock, index) => (
                      <TouchableOpacity
                        key={`${stock.symbol}-${index}`}
                        onPress={() => addToWatchlistWithCheck(stock.symbol, true)}
                        style={{
                          padding: 16,
                          borderBottomWidth: index < searchResults.length - 1 ? 1 : 0,
                          borderBottomColor: colors.searchBorder,
                          position: 'relative',
                          backgroundColor: 'transparent',
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{
                                fontWeight: '700',
                                color: colors.text,
                                fontSize: 16,
                                marginRight: 8
                              }}>
                                {stock.symbol}
                              </Text>
                              <View style={{
                                backgroundColor: colors.searchBackground,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: colors.searchBorder,
                              }}>
                                <Text style={{
                                  color: colors.textSecondary,
                                  fontSize: 10,
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}>
                                  {stock.exchange}
                                </Text>
                              </View>
                            </View>
                            <Text style={{
                              color: colors.textSecondary,
                              fontSize: 14,
                              fontWeight: '500'
                            }} numberOfLines={1}>
                              {stock.name}
                            </Text>
                          </View>
                          <Ionicons 
                            name="add-circle-outline" 
                            size={24} 
                            color={colors.accent} 
                            style={{ marginLeft: 12 }}
                          />
                        </View>
                        
                        {justAdded === stock.symbol && checkmarkAnims.current[stock.symbol] && (
                          <Animated.View
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              left: 0,
                              bottom: 0,
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 2,
                              opacity: checkmarkAnims.current[stock.symbol],
                              transform: [{
                                scale: checkmarkAnims.current[stock.symbol].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.5, 1]
                                })
                              }],
                              backgroundColor: 'rgba(16,185,129,0.2)',
                              borderRadius: 12,
                            }}
                          >
                            <View style={{
                              backgroundColor: '#10B981',
                              borderRadius: 20,
                              padding: 8,
                            }}>
                              <Ionicons name="checkmark" size={24} color={colors.buttonText} />
                            </View>
                          </Animated.View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Search footer with result count */}
                  <View style={{
                    backgroundColor: colors.searchBackground,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.searchBorder,
                  }}>
                    <Text style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      textAlign: 'center',
                      fontWeight: '500'
                    }}>
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </Text>
                  </View>
                </View>
              )}
              
              {/* No results message */}
              {searchQuery.length > 0 && !searchLoading && searchResults.length === 0 && (
                <View style={{
                  backgroundColor: colors.searchBackground,
                  borderRadius: 16,
                  marginTop: 8,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.searchBorder,
                }}>
                  <Ionicons name="search-outline" size={32} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                  <Text style={{
                    color: colors.textSecondary,
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 4
                  }}>
                    No results found
                  </Text>
                  <Text style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    textAlign: 'center'
                  }}>
                    Try searching for a different stock symbol or company name
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Popular Cryptos Section */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              Popular Cryptos
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 4 }}>
              {popularCryptos.filter(crypto => !watchlist.includes(crypto.symbol) || pendingRemoval.includes(crypto.symbol)).map((crypto) => (
                <TouchableOpacity
                  key={crypto.symbol}
                  onPress={() => addToWatchlistWithCheck(crypto.symbol)}
                  style={{
                    backgroundColor: colors.searchBackground,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginRight: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 60,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{crypto.shortName}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{crypto.name}</Text>
                  {justAdded === crypto.symbol && checkmarkAnims.current[crypto.symbol] && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        left: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                        opacity: checkmarkAnims.current[crypto.symbol],
                        transform: [{ scale: checkmarkAnims.current[crypto.symbol].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                        backgroundColor: 'rgba(16,185,129,0.25)',
                        borderRadius: 8,
                      }}
                    >
                      <Ionicons name="checkmark" size={28} color={colors.accent} />
                    </Animated.View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Popular Stocks Section */}
          <View style={{ marginBottom: 24, marginTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              Popular Stocks
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 4 }}>
              {applePresetStocks.filter(symbol => !watchlist.includes(symbol) || pendingRemoval.includes(symbol)).map((symbol) => {
                const quote = quotes[symbol];
                const name = quote?.name || symbol;
                return (
                  <TouchableOpacity
                    key={symbol}
                    onPress={() => addToWatchlistWithCheck(symbol)}
                    style={{
                      backgroundColor: colors.searchBackground,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      marginRight: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 60,
                      position: 'relative',
                      overflow: 'visible',
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{symbol}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{name}</Text>
                    {justAdded === symbol && checkmarkAnims.current[symbol] && (
                      <Animated.View
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          left: 0,
                          bottom: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                          opacity: checkmarkAnims.current[symbol],
                          transform: [{ scale: checkmarkAnims.current[symbol].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                          backgroundColor: 'rgba(16,185,129,0.25)',
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons name="checkmark" size={28} color={colors.accent} />
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Unified Watchlist */}
          <View style={{ marginBottom: 48 }}>
            {watchlist.map((symbol) => {
              const quote = quotes[symbol];
              if (!quote) return null;
              const { name, isIndex, isCrypto } = getItemMeta(symbol);
              const currentPrice = getCurrentPrice(quote);
              const currentChange = getCurrentChange(quote);
              const currentChangePercent = getCurrentChangePercent(quote);
              const isPositive = currentChange >= 0;
              const marketStatus = getMarketStatus(quote);
              return (
                <TouchableOpacity
                  key={symbol}
                  onPress={() => router.push({ pathname: '/chart', params: { symbol, name } })}
                  style={{ backgroundColor: colors.searchBackground, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontSize: isIndex ? 18 : 22, fontWeight: '700', color: colors.text }}>{name}</Text>
                        <View style={{ marginLeft: 8, backgroundColor: marketStatus === 'OPEN' ? colors.accent : marketStatus === 'PM' ? '#F59E42' : marketStatus === 'AH' ? '#8B5CF6' : colors.textSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, color: colors.buttonText, fontWeight: '700' }}>{marketStatus}</Text>
                        </View>
                        {isIndex && (
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>({symbol})</Text>
                        )}
                        {isCrypto && (
                          <Text style={{ fontSize: 12, color: '#FBBF24', marginLeft: 8 }}>Crypto</Text>
                        )}
                      </View>
                      {!isIndex && (
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }} numberOfLines={1}>
                          {symbol}
                        </Text>
                      )}
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>
                        ${formatPrice(currentPrice)}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: isPositive ? colors.accent : '#EF4444' }}>
                        {isPositive ? '+' : ''}${currentChange.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
                      </Text>
                      {(quote.postMarketPrice > 0 || quote.preMarketPrice > 0) && (
                        <Text style={{ fontSize: 12, color: '#8B5CF6', marginTop: 2 }}>
                          {quote.postMarketPrice > 0 ? `AH: $${formatPrice(quote.postMarketPrice)}` : ''}
                          {quote.preMarketPrice > 0 ? `PM: $${formatPrice(quote.preMarketPrice)}` : ''}
                        </Text>
                      )}
                      {!isIndex && (
                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                          H: ${formatPrice(quote.dayHigh)} | L: ${formatPrice(quote.dayLow)} | Vol: {formatLargeNumber(quote.volume)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFromWatchlist(symbol)}
                      style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 20, marginLeft: 12 }}
                    >
                      <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}