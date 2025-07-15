import React, { useEffect, useState } from 'react';
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
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,shortName,longName,marketState`
    );
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      
      if (quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result[0]) {
        const quote = quoteData.quoteResponse.result[0];
        
        // Debug log to see what we're getting
        console.log('Quote data for', symbol, ':', quote);
        
        const price = quote.regularMarketPrice ?? 0;
        const change = quote.regularMarketChange ?? 0;
        const changePercent = quote.regularMarketChangePercent ?? 0;
        const previousClose = quote.regularMarketPreviousClose ?? price;
        
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
          marketState: quote.marketState || 'CLOSED'
        };
      }
    }
    
    // Fallback to chart endpoint if quote endpoint fails
    const chartResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?region=US&lang=en-US&includePrePost=false&interval=1d&range=5d&corsDomain=finance.yahoo.com`
    );
    const chartData = await chartResponse.json();
    
    console.log('Chart data for', symbol, ':', JSON.stringify(chartData, null, 2));
    
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
        marketState: meta.marketState || 'CLOSED'
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
      marketState: meta.marketState || 'CLOSED'
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
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

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

  const loadQuotes = async (symbols: string[] = watchlist) => {
    try {
      const data: Record<string, StockQuote> = {};
      
      // Load quotes in parallel for better performance
      const promises = symbols.map(async (symbol) => {
        try {
          const quote = await fetchYahooQuote(symbol);
          data[symbol] = quote;
        } catch (err) {
          console.error(`Failed to load ${symbol}`, err);
          // Create placeholder data for failed requests
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
            marketState: 'CLOSED'
          };
        }
      });

      await Promise.all(promises);
      setQuotes(data);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuotes();
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#E1F5FE]">
        <ActivityIndicator size="large" color="#0288D1" />
        <Text className="mt-4 text-gray-600">Loading stocks...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-[#E1F5FE]"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="px-4 py-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-black">Stocks</Text>
          <TouchableOpacity 
            onPress={() => setShowSearch(!showSearch)}
            className="bg-blue-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">
              {showSearch ? 'Cancel' : 'Add Stock'}
            </Text>
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View className="mb-6">
            <TextInput
              className="bg-white rounded-lg px-4 py-3 text-black mb-4"
              placeholder="Search stocks... (e.g., AAPL, Tesla)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
            />
            
            {searchLoading && (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#0288D1" />
              </View>
            )}
            
            {searchResults.length > 0 && (
              <View className="bg-white rounded-lg max-h-60">
                <ScrollView>
                  {searchResults.map((stock, index) => (
                    <TouchableOpacity
                      key={`${stock.symbol}-${index}`}
                      onPress={() => addToWatchlist(stock.symbol)}
                      className="p-4 border-b border-gray-200"
                    >
                      <Text className="font-semibold text-black">{stock.symbol}</Text>
                      <Text className="text-gray-600 text-sm" numberOfLines={1}>
                        {stock.name}
                      </Text>
                      <Text className="text-gray-500 text-xs">{stock.exchange}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        <View className="mb-6">
          <Text className="text-lg font-semibold text-black mb-3">
            Market Indices
          </Text>
          
          {marketIndices.map((index) => {
            const quote = quotes[index.symbol];
            if (!quote) return null;
            
            const isPositive = quote.change >= 0;
            const isMarketOpen = quote.marketState === 'REGULAR';
            
            return (
              <View key={index.symbol} className="bg-white rounded-xl p-4 mb-3 shadow">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-lg font-semibold text-black">{index.name}</Text>
                      {!isMarketOpen && (
                        <View className="ml-2 bg-gray-200 px-2 py-1 rounded">
                          <Text className="text-xs text-gray-600">CLOSED</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-gray-600 mb-1">{index.symbol}</Text>
                    <Text className="text-2xl font-bold text-black">
                      {formatPrice(quote.price)}
                    </Text>
                    <Text className={`text-sm font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                    </Text>
                  </View>
                  
                  <View className="items-end">
                    <Text className="text-gray-600 text-sm">
                      H: {formatPrice(quote.dayHigh)}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      L: {formatPrice(quote.dayLow)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold text-black mb-3">
            My Watchlist ({watchlist.length - marketIndices.length})
          </Text>
          
          {watchlist.filter(symbol => !marketIndices.some(index => index.symbol === symbol)).map((symbol) => {
            const quote = quotes[symbol];
            if (!quote) return null;
            
            const isPositive = quote.change >= 0;
            const isMarketOpen = quote.marketState === 'REGULAR';
            
            return (
              <View key={symbol} className="bg-white rounded-xl p-4 mb-4 shadow">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-xl font-semibold text-black">{symbol}</Text>
                      {!isMarketOpen && (
                        <View className="ml-2 bg-gray-200 px-2 py-1 rounded">
                          <Text className="text-xs text-gray-600">CLOSED</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-gray-600 mb-1" numberOfLines={1}>
                      {quote.name}
                    </Text>
                    <Text className="text-2xl font-bold text-black">
                      ${formatPrice(quote.price)}
                    </Text>
                    <Text className={`text-sm font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? '+' : ''}${quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      H: ${formatPrice(quote.dayHigh)} | L: ${formatPrice(quote.dayLow)} | Vol: {formatLargeNumber(quote.volume)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => removeFromWatchlist(symbol)}
                    className="bg-red-100 p-2 rounded-full"
                  >
                    <Text className="text-red-600 font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold text-black mb-3">
            Popular Stocks
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {applePresetStocks.filter(stock => !watchlist.includes(stock)).map((symbol) => (
              <TouchableOpacity
                key={symbol}
                onPress={() => addToWatchlist(symbol)}
                className="bg-white rounded-lg p-3 mr-3 min-w-[80px] items-center"
              >
                <Text className="font-semibold text-black text-sm">{symbol}</Text>
                <Text className="text-blue-500 text-xs mt-1">+ Add</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}