import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { styles } from '../../assets/styles/home.styles';

// Cleaned: No Alpha Vantage code, no unused variables, no commented-out legacy code.

// Yahoo Finance API functions
const fetchYahooQuote = async (symbol: string) => {
  try {
    const quoteResponse = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,shortName,longName,marketState,preMarketPrice,preMarketChange,preMarketChangePercent,postMarketPrice,postMarketChange,postMarketChangePercent,quoteType`
    );
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      
      if (quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result[0]) {
        const quote = quoteData.quoteResponse.result[0];
        
        const price = quote.regularMarketPrice ?? 0;
        const change = quote.regularMarketChange ?? 0;
        let changePercent = quote.regularMarketChangePercent ?? 0;
        let previousClose = quote.regularMarketPreviousClose ?? price;

        // For cryptocurrencies, use a fallback previous close to avoid infinity%
        if (quote.quoteType === 'CRYPTOCURRENCY' && previousClose === 0) {
          // Fallback to the last price from chart data or use price as previousClose
          const chartResponse = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?region=US&lang=en-US&includePrePost=true&interval=1d&range=5d&corsDomain=finance.yahoo.com`
          );
          const chartData = await chartResponse.json();
          if (chartData.chart && chartData.chart.result && chartData.chart.result[0]) {
            const result = chartData.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];
            if (timestamps && quotes && timestamps.length > 1) {
              const latestIndex = timestamps.length - 1;
              previousClose = quotes.close[latestIndex - 1] ?? price; // Use previous day's close
              changePercent = previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : 0;
            } else {
              changePercent = 0;
            }
          } else {
            changePercent = 0;
          }
        }

        // Final fallback: if still a crypto and previousClose is 0, set change and changePercent to 0
        let finalChange = change;
        let finalChangePercent = changePercent;
        if (quote.quoteType === 'CRYPTOCURRENCY' && previousClose === 0) {
          finalChange = 0;
          finalChangePercent = 0;
        }

        // Pre-market and after-hours data
        const preMarketPrice = quote.preMarketPrice ?? 0;
        const preMarketChange = quote.preMarketChange ?? 0;
        const preMarketChangePercent = quote.preMarketChangePercent ?? 0;
        const postMarketPrice = quote.postMarketPrice ?? 0;
        const postMarketChange = quote.postMarketChange ?? 0;
        const postMarketChangePercent = quote.postMarketChangePercent ?? 0;

        return {
          symbol: quote.symbol || symbol,
          name: quote.longName || quote.shortName || symbol,
          price: price,
          change: finalChange,
          changePercent: finalChangePercent,
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
          postMarketChangePercent: postMarketChangePercent,
          quoteType: quote.quoteType || 'EQUITY',
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
        postMarketChangePercent: meta.postMarketChangePercent ?? 0,
        quoteType: meta.quoteType || 'EQUITY'
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
      postMarketChangePercent: meta.postMarketChangePercent ?? 0,
      quoteType: meta.quoteType || 'EQUITY'
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
  quoteType: string;
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
  // Change watchlist initialization
  const defaultWatchlist = [
    ...marketIndices.map(index => index.symbol),
    ...applePresetStocks.slice(0, 5)
  ];
  const [watchlist, setWatchlist] = useState<string[] | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<any>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  // Store Animated.Value per symbol
  const checkmarkAnims = useRef<{ [symbol: string]: Animated.Value }>({});
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
  const [marketStatusDisplay, setMarketStatusDisplay] = useState<{text: string, color: string}>({text: '', color: SESSION_COLORS['closed']});
  const quoteCache = React.useRef<{ [symbol: string]: { data: StockQuote, timestamp: number } }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const isFocused = useIsFocused();
  const [priceHighlights, setPriceHighlights] = useState<Record<string, { color: string; timeout: ReturnType<typeof setTimeout> | null }>>({});
  const lastPrices = useRef<Record<string, number>>({});
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  const [removalAnims, setRemovalAnims] = useState<Record<string, Animated.Value>>( {} );
  const cryptoScrollRef = useRef<ScrollView>(null);
  const stocksScrollRef = useRef<ScrollView>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderWatchlist, setReorderWatchlist] = useState<string[]>([]);
  // Add this state near the other useState hooks
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down' | null>>({});

  // Load watchlist from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('watchlist');
        if (stored) {
          const parsed = JSON.parse(stored);
          setWatchlist(parsed);
          loadQuotes(parsed);
        } else {
          setWatchlist(defaultWatchlist);
          loadQuotes(defaultWatchlist);
        }
      } catch (e) {
        console.error('Failed to load watchlist from storage', e);
        setWatchlist(defaultWatchlist);
        loadQuotes(defaultWatchlist);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save watchlist to AsyncStorage whenever it changes
  useEffect(() => {
    if (watchlist) {
      AsyncStorage.setItem('watchlist', JSON.stringify(watchlist)).catch(e => {
        console.error('Failed to save watchlist to storage', e);
      });
    }
  }, [watchlist]);

  // Only use Yahoo for all price/session data
  const loadQuotes = async (symbols: string[] = watchlist ?? []) => {
    try {
      const now = Date.now();
      const data: Record<string, StockQuote> = {};
      // Remove Python FastAPI server code, use only Yahoo
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
            postMarketChangePercent: 0,
            quoteType: 'EQUITY' // Default to EQUITY if quoteType is not available
          };
        }
      });
      await Promise.all(promises);
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

  // Replace addToWatchlist with async version
  const addToWatchlist = async (symbol: string) => {
    if (!watchlist || watchlist.includes(symbol)) return;
    const newWatchlist = [...watchlist, symbol];
    setWatchlist(newWatchlist);
    try {
      await AsyncStorage.setItem('watchlist', JSON.stringify(newWatchlist));
      console.log('Watchlist saved:', newWatchlist);
      fetchYahooQuote(symbol)
        .then(quote => {
          setQuotes(prev => ({ ...prev, [symbol]: quote }));
        })
        .catch(err => console.error(`Failed to load ${symbol}`, err));
    } catch (e) {
      console.error('Failed to save watchlist to storage', e);
      Alert.alert('Error', 'Failed to save stock to watchlist. Please try again.');
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Replace addToWatchlistWithCheck to await addToWatchlist
  const addToWatchlistWithCheck = (symbol: string, isSearch = false) => {
    if (!watchlist) return;
    setJustAdded(symbol);
    if (!isSearch) setPendingRemoval((prev) => [...prev, symbol]);
    if (!checkmarkAnims.current[symbol]) {
      checkmarkAnims.current[symbol] = new Animated.Value(0);
    }
    const anim = checkmarkAnims.current[symbol];
    anim.setValue(0);
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
        }).start(async () => {
          setTimeout(() => setJustAdded(null), 0); // <-- Fix: defer state update
          await addToWatchlist(symbol);
          if (!isSearch) setPendingRemoval((prev) => prev.filter((s) => s !== symbol));
        });
      }, 700);
    });
  };

  const removeFromWatchlist = (symbol: string) => {
    if (!watchlist) return;
    
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mark item as removing
    setRemovingItems(prev => new Set(prev).add(symbol));
    
    // Close the swipeable
    if (swipeableRefs.current[symbol]) {
      swipeableRefs.current[symbol]?.close();
    }
    
    // Delay removal for smooth animation
    setTimeout(() => {
      setWatchlist(prev => prev ? prev.filter(s => s !== symbol) : prev);
      setQuotes(prev => {
        const newQuotes = { ...prev };
        delete newQuotes[symbol];
        return newQuotes;
      });
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }, 300);
  };

  const handleRemoveWithAnimation = (symbol: string) => {
    if (!removalAnims[symbol]) {
      setRemovalAnims(prev => ({ ...prev, [symbol]: new Animated.Value(1) }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(removalAnims[symbol] || new Animated.Value(1), {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      removeFromWatchlist(symbol);
      setRemovalAnims(prev => {
        const copy = { ...prev };
        delete copy[symbol];
        return copy;
      });
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

  // Replace the auto-refresh useEffect with a robust version
  useEffect(() => {
    if (!watchlist) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    function getIntervalMs() {
      const mins = getETMinutesSinceMidnight();
      if (mins >= 570 && mins < 960) {
        // Regular hours: 5 seconds
        return 5000;
      } else if ((mins >= 240 && mins < 570) || (mins >= 960 && mins < 1200)) {
        // Pre-market or after-hours: 1 minute
        return 60000;
      } else {
        // Closed: 5 minutes
        return 300000;
      }
    }
    let lastInterval = getIntervalMs();
    async function tick() {
      if (watchlist) {
        quoteCache.current = {}; // Clear cache before each auto-refresh
        await loadQuotes(watchlist);
      }
      // Check if interval needs to change
      const newInterval = getIntervalMs();
      if (newInterval !== lastInterval) {
        if (intervalId) clearInterval(intervalId);
        lastInterval = newInterval;
        intervalId = setInterval(tick, lastInterval);
      }
    }
    intervalId = setInterval(tick, lastInterval);
    // Initial tick
    tick();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [watchlist]);

  useEffect(() => {
    const timeoutId: any = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 2. Refactor getMarketStatus
  const getMarketStatus = (quote?: StockQuote) => {
    if (!quote) return 'CLOSED';
    if (quote.quoteType === 'CRYPTOCURRENCY') return '24/7';

    const now = new Date();
    const nyTime = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
    const [, timePart] = nyTime.split(', ');
    const [nyHour, nyMinute] = timePart.split(':').map(Number);
    const minsSinceMidnight = nyHour * 60 + nyMinute;

    if (minsSinceMidnight >= 240 && minsSinceMidnight < 570) return 'PM'; // 4:00 AM - 9:29 AM ET
    if (minsSinceMidnight >= 570 && minsSinceMidnight < 960) return 'OPEN'; // 9:30 AM - 4:00 PM ET
    if (minsSinceMidnight >= 960 && minsSinceMidnight < 1200) return 'AH'; // 4:00 PM - 8:00 PM ET
    if (quote.marketState === 'POST' || quote.marketState === 'POSTPOST') return 'AH';
    if (quote.marketState === 'PRE' || quote.marketState === 'PREPRE') return 'PM';
    return 'CLOSED';
  };

  // 3. Refactor updateMarketStatusText
  function updateMarketStatusText() {
    const now = new Date();
    const nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
    const nyParts = nyFormatter.formatToParts(now);
    const nyHours = parseInt(nyParts.find(p => p.type === 'hour')?.value || '0');
    const nyMinutes = parseInt(nyParts.find(p => p.type === 'minute')?.value || '0');
    const nyWeekday = nyParts.find(p => p.type === 'weekday')?.value || 'Sun';
    const nyDay = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[nyWeekday];

    const mins = nyHours * 60 + nyMinutes;
    const boundaries = {
      preMarket: 4 * 60, // 4:00 AM
      regularStart: 9 * 60 + 30, // 9:30 AM
      regularEnd: 16 * 60, // 4:00 PM
      afterHoursEnd: 20 * 60, // 8:00 PM
    };

    let session = 'closed';
    let nextSession = 'pre-market';
    let nextBoundaryMins = 0;

    if (nyDay === 0 || (nyDay === 6 && mins >= boundaries.afterHoursEnd)) {
      session = 'closed';
      nextSession = 'pre-market';
      nextBoundaryMins = ((nyDay === 0 ? 1 : 2) * 24 * 60) + boundaries.preMarket - mins;
    } else if (nyDay === 6) {
      session = 'closed';
      nextSession = 'pre-market';
      nextBoundaryMins = (2 * 24 * 60) + boundaries.preMarket - mins;
    } else if (mins < boundaries.preMarket) {
      session = 'closed';
      nextSession = 'pre-market';
      nextBoundaryMins = boundaries.preMarket - mins;
    } else if (mins < boundaries.regularStart) {
      session = 'pre-market';
      nextSession = 'regular session';
      nextBoundaryMins = boundaries.regularStart - mins;
    } else if (mins < boundaries.regularEnd) {
      session = 'open';
      nextSession = 'after hours';
      nextBoundaryMins = boundaries.regularEnd - mins;
    } else if (mins < boundaries.afterHoursEnd) {
      session = 'after hours';
      nextSession = 'market close';
      nextBoundaryMins = boundaries.afterHoursEnd - mins;
    } else {
      session = 'closed';
      nextSession = 'pre-market';
      nextBoundaryMins = (nyDay === 5 ? 3 * 24 * 60 : 24 * 60) + boundaries.preMarket - mins;
    }

    const hours = Math.floor(nextBoundaryMins / 60);
    const minsLeft = nextBoundaryMins % 60;
    const sessionNames: { [key: string]: string } = {
      open: 'Market Open',
      closed: 'Market Closed',
      'pre-market': 'Pre-market',
      'after hours': 'After hours',
    };
    const nextSessionNames: { [key: string]: string } = {
      'regular session': 'market open',
      'after hours': 'after hours',
      'market close': 'market close',
      'pre-market': 'pre-market',
    };
    const color = SESSION_COLORS[session];
    const timeDisplay = hours > 0 ? `${hours}h ${minsLeft}m` : `${minsLeft}m`;
    const text = session === 'open'
      ? `${Math.floor((boundaries.regularEnd - mins) / 60)}h ${(boundaries.regularEnd - mins) % 60}m until market close`
      : `${sessionNames[session]} • ${timeDisplay} until ${nextSessionNames[nextSession]}`;

    setMarketStatusDisplay({ text, color });
  }

  // 4. Consolidate getCurrentPrice, getCurrentChange, getCurrentChangePercent
  const getCurrentQuoteData = (quote?: StockQuote) => {
    if (!quote) return { price: 0, change: 0, changePercent: 0 };
    // For cryptocurrencies, always use regular market data
    if (quote.quoteType === 'CRYPTOCURRENCY') {
      return {
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
      };
    }
    // For stocks/indices, use session-based logic
    const marketStatus = getMarketStatus(quote);
    return {
      price: marketStatus === 'AH' && quote.postMarketPrice ? quote.postMarketPrice :
             marketStatus === 'PM' && quote.preMarketPrice ? quote.preMarketPrice : quote.price,
      change: marketStatus === 'AH' && quote.postMarketChange ? quote.postMarketChange :
              marketStatus === 'PM' && quote.preMarketChange ? quote.preMarketChange : quote.change,
      changePercent: marketStatus === 'AH' && quote.postMarketChangePercent ? quote.postMarketChangePercent :
                     marketStatus === 'PM' && quote.preMarketChangePercent ? quote.preMarketChangePercent : quote.changePercent,
    };
  };

  // Helper to get display name and type for a symbol
  const getItemMeta = (symbol: string) => {
    const idx = marketIndices.find(i => i.symbol === symbol);
    if (idx) return { name: idx.name, isIndex: true, isCrypto: false };
    const crypto = popularCryptos.find(c => c.symbol === symbol);
    if (crypto) return { name: crypto.name, isIndex: false, isCrypto: true };
    const quote = quotes[symbol];
    // Use quoteType from actual quote data for more accurate detection
    const isCrypto = quote?.quoteType === 'CRYPTOCURRENCY';
    return { name: quote?.name || symbol, isIndex: false, isCrypto: isCrypto };
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
      if (session === 'open') {
        // Calculate time until market close (4:00pm ET)
        const closeMins = 16 * 60; // 4:00pm
        const minsLeft = regularEnd - mins;
        const hours = Math.floor(minsLeft / 60);
        const minsLeftDisplay = minsLeft % 60;
        const text = `${hours}h ${minsLeftDisplay}m until market close`;
        setMarketStatusDisplay({ text, color });
        return;
      }
      const text = `${sessionNames[session]} • ${timeDisplay} until ${nextSessionText}`;
      setMarketStatusDisplay({ text, color });
    }
    updateMarketStatusText();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let appStateListener: any = null;

    function startPreciseTimer() {
      // Clear any existing timers
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      // Calculate ms until next second
      const now = new Date();
      const msToNextSecond = 1000 - now.getMilliseconds();
      timeoutId = setTimeout(() => {
        updateMarketStatusText();
        intervalId = setInterval(updateMarketStatusText, 1000);
      }, msToNextSecond);
    }

    updateMarketStatusText();
    startPreciseTimer();

    // Resync timer when app comes to foreground
    appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateMarketStatusText();
        startPreciseTimer();
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      if (appStateListener) appStateListener.remove();
    };
  }, []);

  // Helper: is US stock (not index/crypto)
  const isUSStock = (symbol: string) => {
    return !symbol.startsWith('^') && !symbol.endsWith('-USD');
  };

  // Fetch Alpha Vantage prices every 1 minute for stocks
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    async function fetchAllAlphaVantage() {
      if (!watchlist) return;
      const updates: Record<string, number> = {};
      await Promise.all(watchlist.map(async (symbol) => {
        if (isUSStock(symbol)) {
          // const av = await fetchAlphaVantagePrice(symbol); // Removed Alpha Vantage call
          // if (av && av.price) updates[symbol] = av.price; // Removed Alpha Vantage state
        }
      }));
      // setAlphaVantagePrices(prev => ({ ...prev, ...updates })); // Removed Alpha Vantage state
    }
    fetchAllAlphaVantage();
    interval = setInterval(fetchAllAlphaVantage, 60000);
    return () => clearInterval(interval);
  }, [watchlist]);

  // Track scroll position
  const handleScroll = (event: any) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  // Restore scroll position when focused
  useEffect(() => {
    if (isFocused && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollOffsetRef.current, animated: false });
      }, 0);
    }
  }, [isFocused]);

  useEffect(() => {
    if (!watchlist) return;
    watchlist.forEach(symbol => {
      const currentPrice = quotes[symbol]?.price;
      const prevPrice = lastPrices.current[symbol];
      if (prevPrice !== undefined && prevPrice !== currentPrice) {
        const direction = currentPrice > prevPrice ? 'up' : 'down';
        setPriceFlash(prev => ({ ...prev, [symbol]: direction }));
        setTimeout(() => {
          setPriceFlash(prev => ({ ...prev, [symbol]: null }));
        }, 700);
      }
      lastPrices.current[symbol] = currentPrice;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, watchlist]);

  if (watchlist === null || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 16, color: colors.textSecondary, fontSize: 16 }}>Loading stocks...</Text>
      </View>
    );
  }

  // 1. Create a HeaderComponent for all header content above the watchlist
    const WatchlistHeader = () => {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, backgroundColor: colors.background }}>
        {/* Market Status Display */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
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
      </View>
    );
  };


  // 2. Use a single ScrollView for everything to scroll from the top
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Fixed Header - Watchlist Title and Search */}
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.background }}>
          {/* Header with title and buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                Watchlist
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
                Last updated: {lastUpdate.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} ET
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setReorderWatchlist([...watchlist!]);
                  setShowReorderModal(true);
                }}
                style={{
                  backgroundColor: colors.buttonBackground,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  alignSelf: 'flex-start',
                  marginTop: 4,
                }}
              >
                <Ionicons name="reorder-three" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSearch(!showSearch)}
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 12,
                  padding: 10,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: colors.accent + '33',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                activeOpacity={0.8}
              >
                {/* Gradient Background */}
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: colors.accent,
                  opacity: 0.15,
                  borderRadius: 12,
                }} />
                <Ionicons 
                  name={showSearch ? "close" : "search"} 
                  size={24} 
                  color={colors.accent} 
                  style={{
                    transform: [{ scale: showSearch ? 0.9 : 1 }],
                    transitionProperty: 'transform',
                    transitionDuration: '200ms',
                  }} 
                />
              </TouchableOpacity>
            </View>
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
        </View>

        {/* Market Status Display - Above Crypto */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
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
        </View>

        {/* Popular Cryptos Section - Fixed Position */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.background }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
            Popular Cryptos
          </Text>
          <ScrollView 
            ref={cryptoScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ paddingBottom: 4 }}
            key="crypto-scroll"
          >
            {popularCryptos.filter(crypto => !watchlist || !watchlist.includes(crypto.symbol) || pendingRemoval.includes(crypto.symbol)).map((crypto) => (
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

        {/* Popular Stocks Section - Fixed Position */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.background }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
            Popular Stocks
          </Text>
          <ScrollView 
            ref={stocksScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ paddingBottom: 4 }}
            key="stocks-scroll"
          >
            {applePresetStocks.filter(symbol => !watchlist || !watchlist.includes(symbol) || pendingRemoval.includes(symbol)).map((symbol) => {
              const quote = quotes[symbol];
              const name = quote?.name || symbol;
              const currentPrice = getCurrentQuoteData(quote).price;
              const currentChange = getCurrentQuoteData(quote).change;
              const currentChangePercent = getCurrentQuoteData(quote).changePercent;
              const isPositive = currentChange >= 0;
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

        {/* Watchlist Items */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 48 }}>
          {watchlist.map((symbol, index) => {
            const quote = quotes[symbol];
            if (!quote) return null;
            return (
              <WatchlistItem
                key={symbol}
                symbol={symbol}
                quote={quote}
                colors={colors}
                colorScheme={colorScheme}
                router={router}
                getItemMeta={getItemMeta}
                getCurrentQuoteData={getCurrentQuoteData}
                getMarketStatus={getMarketStatus}
                formatPrice={formatPrice}
                formatLargeNumber={formatLargeNumber}
                removalAnims={removalAnims}
                swipeableRefs={swipeableRefs}
                handleRemoveWithAnimation={handleRemoveWithAnimation}
                priceHighlights={priceHighlights}
                priceFlash={priceFlash}
              />
            );
          })}
        </View>
      </ScrollView>

            {/* Reorder Modal */}
      <Modal
        visible={showReorderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReorderModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Modal Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 60,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                Reorder Watchlist
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                Long press and drag to reorder
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowReorderModal(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: colors.buttonBackground,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setWatchlist(reorderWatchlist);
                  AsyncStorage.setItem('watchlist', JSON.stringify(reorderWatchlist));
                  setShowReorderModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: colors.accent,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ color: colors.buttonText, fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Instructions */}
          <View style={{ 
            paddingHorizontal: 20, 
            paddingVertical: 16, 
            backgroundColor: colors.sectionBackground,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                backgroundColor: colors.accent, 
                borderRadius: 12, 
                padding: 8, 
                marginRight: 12 
              }}>
                <Ionicons name="information-circle" size={16} color={colors.buttonText} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>
                Drag items to reorder your watchlist. The order will be saved when you tap Save.
              </Text>
            </View>
          </View>

          {/* Draggable List */}
          <View style={{ flex: 1 }}>
            <DraggableFlatList
              data={reorderWatchlist}
              keyExtractor={(item: string) => item}
              onDragEnd={({ data }: { data: string[] }) => {
                setReorderWatchlist(data);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              renderItem={({ item: symbol, drag, isActive }: { item: string; drag: () => void; isActive: boolean }) => {
                const quote = quotes[symbol];
                const { name, isIndex, isCrypto } = getItemMeta(symbol);
                const currentPrice = getCurrentQuoteData(quote).price;
                const currentChange = getCurrentQuoteData(quote).change;
                const currentChangePercent = getCurrentQuoteData(quote).changePercent;
                const isPositive = currentChange >= 0;
                const marketStatus = getMarketStatus(quote);

                return (
                  <Animated.View
                    style={{
                      opacity: isActive ? 0.9 : 1,
                      transform: [
                        { scale: isActive ? 1.02 : 1 },
                        { rotateZ: isActive ? '2deg' : '0deg' }
                      ],
                      shadowOpacity: isActive ? 0.3 : 0.1,
                      shadowRadius: isActive ? 8 : 4,
                      elevation: isActive ? 6 : 2,
                    }}
                  >
                    <TouchableOpacity
                      onLongPress={() => {
                        drag();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                      style={{
                        backgroundColor: isActive ? colors.accent + '20' : colors.searchBackground,
                        borderRadius: 16,
                        padding: 16,
                        marginHorizontal: 20,
                        marginBottom: 8,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isActive ? 0.3 : 0.1,
                        shadowRadius: isActive ? 8 : 4,
                        elevation: isActive ? 6 : 2,
                        borderWidth: 1,
                        borderColor: isActive ? colors.accent + '40' : colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      {/* Drag Handle */}
                      <View style={{ 
                        padding: 8, 
                        marginRight: 12,
                        backgroundColor: isActive ? colors.accent + '30' : colors.buttonBackground,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isActive ? colors.accent + '50' : colors.border,
                      }}>
                        <Ionicons 
                          name="reorder-three" 
                          size={18} 
                          color={isActive ? colors.accent : colors.textSecondary} 
                        />
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ 
                            fontSize: isIndex ? 16 : 18, 
                            fontWeight: '700', 
                            color: colors.text 
                          }}>
                            {name}
                          </Text>
                          {isCrypto ? (
                            <View style={{
                              marginLeft: 8,
                              backgroundColor: '#2563eb', // blue-700
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6
                            }}>
                              <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>24/7</Text>
                            </View>
                          ) : (
                            <View style={{
                              marginLeft: 8,
                              backgroundColor: marketStatus === 'OPEN' ? '#10B981' : marketStatus === 'PM' ? '#F59E42' : marketStatus === 'AH' ? '#8B5CF6' : colors.textSecondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6
                            }}>
                              <Text style={{ fontSize: 10, color: colors.buttonText, fontWeight: '700' }}>{marketStatus}</Text>
                            </View>
                          )}
                          {isIndex && (
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>
                              ({symbol})
                            </Text>
                          )}
                          {isCrypto && (
                            <Text style={{ fontSize: 12, color: '#FBBF24', marginLeft: 8 }}>
                              Crypto
                            </Text>
                          )}
                        </View>
                        {!isIndex && (
                          <Text style={{ 
                            fontSize: 13, 
                            color: colors.textSecondary, 
                            marginBottom: 4 
                          }} numberOfLines={1}>
                            {symbol}
                          </Text>
                        )}
                        {/* Price with flashing font color on update */}
                        <Text style={{ 
                          fontSize: 24,
                          fontWeight: 'bold', 
                          color: priceFlash[symbol] === 'up' ? '#10B981' : priceFlash[symbol] === 'down' ? '#EF4444' : colors.text,
                          marginBottom: 2,
                        }}>
                          ${formatPrice(currentPrice)}
                        </Text>
                        <Text style={{ 
                          fontSize: 13, 
                          fontWeight: '600', 
                          color: isPositive ? '#10B981' : '#EF4444' 
                        }}>
                          {isPositive ? '+' : ''}${currentChange.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
                        </Text>
                      </View>

                      {/* Drag indicator */}
                      <View style={{ 
                        padding: 4,
                        opacity: isActive ? 1 : 0.3,
                      }}>
                        <Ionicons 
                          name="chevron-up" 
                          size={16} 
                          color={colors.textSecondary} 
                        />
                        <Ionicons 
                          name="chevron-down" 
                          size={16} 
                          color={colors.textSecondary} 
                        />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }}
              containerStyle={{ paddingTop: 8, paddingBottom: 20 }}
              activationDistance={10}
              autoscrollThreshold={60}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 5. Extract WatchlistItem component
const WatchlistItem = ({ symbol, quote, colors, colorScheme, router, getItemMeta, getCurrentQuoteData, getMarketStatus, formatPrice, formatLargeNumber, removalAnims, swipeableRefs, handleRemoveWithAnimation, priceHighlights, priceFlash }: {
  symbol: string;
  quote: StockQuote;
  colors: any;
  colorScheme: string | null | undefined;
  router: any;
  getItemMeta: (symbol: string) => { name: string; isIndex: boolean; isCrypto: boolean };
  getCurrentQuoteData: (quote?: StockQuote) => { price: number; change: number; changePercent: number };
  getMarketStatus: (quote?: StockQuote) => string;
  formatPrice: (price: number) => string;
  formatLargeNumber: (num: number) => string;
  removalAnims: Record<string, Animated.Value>;
  swipeableRefs: React.MutableRefObject<{ [key: string]: Swipeable | null }>;
  handleRemoveWithAnimation: (symbol: string) => void;
  priceHighlights: Record<string, { color: string; timeout: ReturnType<typeof setTimeout> | null }>;
  priceFlash: Record<string, 'up' | 'down' | null>;
}) => {
  const { name, isIndex, isCrypto } = getItemMeta(symbol);
  const { price: currentPrice, change: currentChange, changePercent: currentChangePercent } = getCurrentQuoteData(quote);
  const isPositive = currentChange >= 0;
  const marketStatus = getMarketStatus(quote);
  const anim = removalAnims[symbol] || new Animated.Value(1);

  return (
    <Animated.View
      key={symbol}
      style={{
        opacity: anim,
        transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
      }}
      className=""
    >
      <Swipeable
        renderRightActions={() => (
          <View className="w-20 h-full bg-red-600 rounded-tr-2xl rounded-br-2xl shadow-md justify-center items-center border-l border-white/10">
            <TouchableOpacity
              onPress={() => handleRemoveWithAnimation(symbol)}
              className="w-full h-full justify-center items-center shadow"
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
        rightThreshold={40}
        ref={(ref) => { swipeableRefs.current[symbol] = ref; }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/chart?symbol=${symbol}&from=watchlist`)}
          style={styles.card}
        >
          <View
            className="flex-row items-center justify-between"
          >
            <View className="flex-1">
              <View className="flex-row items-center mb-0.5">
                <Text className={isIndex ? "text-lg font-bold text-zinc-900 dark:text-zinc-100" : "text-2xl font-bold text-zinc-900 dark:text-zinc-100"}>{name}</Text>
                {/* Session-style pill for 24/7 if crypto, else normal */}
                {isCrypto ? (
                    <>
                      <Text className="text-xs text-zinc-400 ml-2">Crypto</Text>
                      <View className="ml-1.5 bg-blue-700 px-2 py-1 rounded">
                        <Text className="text-[10px] text-white font-bold tracking-wider">24/7</Text>
                      </View>
                    </>
                  ) : (
                    <View className={
                      `ml-2 px-2 py-1 rounded ${
                        marketStatus === 'OPEN' ? 'bg-emerald-500' :
                        marketStatus === 'PM' ? 'bg-orange-400' :
                        marketStatus === 'AH' ? 'bg-purple-500' :
                        'bg-zinc-400'
                      }`
                    }>
                      <Text className="text-[10px] font-bold" style={{ color: colors.buttonText }}>{marketStatus}</Text>
                    </View>
                  )}
                {isIndex && <Text className="text-xs text-zinc-400 ml-2">({symbol})</Text>}
                {/* No extra crypto badge here, banner above */}
              </View>
              {!isIndex && (
                <Text className="text-sm text-zinc-400 mb-1" numberOfLines={1}>
                  {symbol}
                </Text>
              )}
              {/* Price with flashing font color on update */}
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: priceFlash[symbol] === 'up' ? '#10B981' : priceFlash[symbol] === 'down' ? '#EF4444' : colors.text,
                marginBottom: 2,
              }}>
                ${formatPrice(currentPrice)}
              </Text>
              <Text className={isPositive ? "text-lg font-semibold text-emerald-500" : "text-lg font-semibold text-red-500"}>
                {isPositive ? '+' : ''}${currentChange.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
              </Text>
              {!isIndex && !isCrypto && (
                <Text className="text-sm text-zinc-400 mt-1">
                  H: ${formatPrice(quote.dayHigh)} | L: ${formatPrice(quote.dayLow)} | Vol: {formatLargeNumber(quote.volume)}
                </Text>
              )}
              {/* Only show pre/post-market data for non-crypto assets */}
              {!isCrypto && (quote.postMarketPrice > 0 || quote.preMarketPrice > 0) && marketStatus !== 'OPEN' && (
                <Text className={marketStatus === 'AH' ? "text-xs text-purple-500 mt-0.5" : "text-xs text-orange-500 mt-0.5"}>
                  {marketStatus === 'AH' && quote.postMarketPrice > 0 ? `After Hours: $${formatPrice(quote.postMarketPrice)}` : ''}
                  {marketStatus === 'PM' && quote.preMarketPrice > 0 ? `Pre-Market: $${formatPrice(quote.preMarketPrice)}` : ''}
                </Text>
              )}
            </View>
            <View className="p-2 ml-2">
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
};

export { fetchYahooQuote };
