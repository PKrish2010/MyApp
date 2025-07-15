import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
const quoteCache = React.useRef<{ [symbol: string]: { data: StockQuote, timestamp: number } }>({});

export default function StocksPage() {
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

  // Only use Yahoo for all price/session data
  const loadQuotes = async (symbols: string[] = watchlist) => {
    try {
      const now = Date.now();
      const data: Record<string, StockQuote> = {};
      const promises = symbols.map(async (symbol) => {
        // Check cache
        if (
          quoteCache.current[symbol] &&
          now - quoteCache.current[symbol].timestamp < TTL_MS
        ) {
          data[symbol] = quoteCache.current[symbol].data;
          return;
        }
        // Fetch from Yahoo if not cached or expired
        try {
          const quote = await fetchYahooQuote(symbol);
          data[symbol] = quote;
          quoteCache.current[symbol] = { data: quote, timestamp: now };
        } catch (err) {
          // fallback or error handling as before
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
    if (price >= 1000) {
      return price.toFixed(2);
    }
    return price.toFixed(2);
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

  // Auto-refresh every 5 seconds
  useEffect(() => {
    loadQuotes();
    
    // Set up interval for auto-refresh
    intervalRef.current = setInterval(() => {
      loadQuotes();
    }, 5000); // 5 seconds

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
    if (quote.marketState === 'REGULAR') {
      return 'OPEN';
    } else if (quote.marketState === 'PRE' || quote.marketState === 'PREPRE') {
      return 'PM';
    } else if (quote.marketState === 'POST' || quote.marketState === 'POSTPOST') {
      return 'AH';
    } else if (quote.marketState === 'CLOSED') {
      return 'CLOSED';
    }
    return 'CLOSED';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E1F5FE' }}>
        <ActivityIndicator size="large" color="#0288D1" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading stocks...</Text>
      </View>
    );
  }

  // In the UI, only render stocks in the watchlist that have a valid quote
  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#E1F5FE' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'black' }}>Stocks</Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Last updated: {formatTime(lastUpdate)}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowSearch(!showSearch)}
            style={{ backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              {showSearch ? 'Cancel' : 'Add Stock'}
            </Text>
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View style={{ marginBottom: 24 }}>
            <TextInput
              style={{ backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: 'black', marginBottom: 16 }}
              placeholder="Search stocks... (e.g., AAPL, Tesla)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
            />
            
            {searchLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator size="small" color="#0288D1" />
              </View>
            )}
            
            {searchResults.length > 0 && (
              <View style={{ backgroundColor: 'white', borderRadius: 8, maxHeight: 240 }}>
                <ScrollView>
                  {searchResults.map((stock, index) => (
                    <TouchableOpacity
                      key={`${stock.symbol}-${index}`}
                      onPress={() => addToWatchlist(stock.symbol)}
                      style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                    >
                      <Text style={{ fontWeight: '600', color: 'black' }}>{stock.symbol}</Text>
                      <Text style={{ color: '#666', fontSize: 14 }} numberOfLines={1}>
                        {stock.name}
                      </Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{stock.exchange}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'black', marginBottom: 12 }}>
            Market Indices
          </Text>
          
          {marketIndices.map((index) => {
            const quote = quotes[index.symbol];
            if (!quote) return null;
            
            const currentPrice = getCurrentPrice(quote);
            const currentChange = getCurrentChange(quote);
            const currentChangePercent = getCurrentChangePercent(quote);
            const isPositive = currentChange >= 0;
            const marketStatus = getMarketStatus(quote);
            
            return (
              <View key={index.symbol} style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: '600', color: 'black' }}>{index.name}</Text>
                      <View style={{ marginLeft: 8, backgroundColor: marketStatus === 'OPEN' ? '#10B981' : marketStatus === 'PM' ? '#F59E0B' : marketStatus === 'AH' ? '#8B5CF6' : '#9CA3AF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>{marketStatus}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{index.symbol}</Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'black' }}>
                      {formatPrice(currentPrice)}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: isPositive ? '#10B981' : '#EF4444' }}>
                      {isPositive ? '+' : ''}{currentChange.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
                    </Text>
                    {/* Show extended hours data if available */}
                    {(quote.postMarketPrice > 0 || quote.preMarketPrice > 0) && (
                      <Text style={{ fontSize: 12, color: '#8B5CF6', marginTop: 2 }}>
                        {quote.postMarketPrice > 0 ? `AH: $${formatPrice(quote.postMarketPrice)}` : ''}
                        {quote.preMarketPrice > 0 ? `PM: $${formatPrice(quote.preMarketPrice)}` : ''}
                      </Text>
                    )}
                  </View>
                  
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#666', fontSize: 14 }}>
                      H: {formatPrice(quote.dayHigh)}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 14 }}>
                      L: {formatPrice(quote.dayLow)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'black', marginBottom: 12 }}>
            My Watchlist ({watchlist.length - marketIndices.length})
          </Text>
          
          {watchlist.filter(symbol => !marketIndices.some(index => index.symbol === symbol)).map((symbol) => {
            const quote = quotes[symbol];
            if (!quote) return null;
            
            const currentPrice = getCurrentPrice(quote);
            const currentChange = getCurrentChange(quote);
            const currentChangePercent = getCurrentChangePercent(quote);
            const isPositive = currentChange >= 0;
            const marketStatus = getMarketStatus(quote);
            
            return (
              <View key={symbol} style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '600', color: 'black' }}>{symbol}</Text>
                      <View style={{ marginLeft: 8, backgroundColor: marketStatus === 'OPEN' ? '#10B981' : marketStatus === 'PM' ? '#F59E0B' : marketStatus === 'AH' ? '#8B5CF6' : '#9CA3AF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>{marketStatus}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }} numberOfLines={1}>
                      {quote.name}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'black' }}>
                      ${formatPrice(currentPrice)}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: isPositive ? '#10B981' : '#EF4444' }}>
                      {isPositive ? '+' : ''}${currentChange.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
                    </Text>
                    {/* Show extended hours data if available */}
                    {(quote.postMarketPrice > 0 || quote.preMarketPrice > 0) && (
                      <Text style={{ fontSize: 12, color: '#8B5CF6', marginTop: 2 }}>
                        {quote.postMarketPrice > 0 ? `AH: $${formatPrice(quote.postMarketPrice)}` : ''}
                        {quote.preMarketPrice > 0 ? `PM: $${formatPrice(quote.preMarketPrice)}` : ''}
                      </Text>
                    )}
                    <Text style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
                      H: ${formatPrice(quote.dayHigh)} | L: ${formatPrice(quote.dayLow)} | Vol: {formatLargeNumber(quote.volume)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => removeFromWatchlist(symbol)}
                    style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 20 }}
                  >
                    <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ marginBottom: 50 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'black', marginBottom: 12 }}>
            Popular Stocks
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {applePresetStocks.filter(stock => !watchlist.includes(stock)).map((symbol) => (
              <TouchableOpacity
                key={symbol}
                onPress={() => addToWatchlist(symbol)}
                style={{ backgroundColor: 'white', borderRadius: 8, padding: 12, marginRight: 12, minWidth: 80, alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '600', color: 'black', fontSize: 14 }}>{symbol}</Text>
                <Text style={{ color: '#3B82F6', fontSize: 12, marginTop: 4 }}>+ Add</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}