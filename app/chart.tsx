import { getColors } from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';

// Fetch all stock info from Yahoo v7/finance/quote endpoint (matches watchlist)
const fetchYahooQuote = async (symbol: string) => {
  try {
    // Try the quote endpoint first - it's more reliable for current data
    const quoteResponse = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,shortName,longName,marketState,preMarketPrice,preMarketChange,preMarketChangePercent,postMarketPrice,postMarketChange,postMarketChangePercent,regularMarketOpen,trailingPE,marketCap,averageDailyVolume3Month,trailingAnnualDividendYield,beta,epsTrailingTwelveMonths,fiftyTwoWeekHigh,fiftyTwoWeekLow,quoteType`
    );
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      
      if (quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result[0]) {
        const quote = quoteData.quoteResponse.result[0];
        
        return {
          open: quote.regularMarketOpen ?? null,
          high: quote.regularMarketDayHigh ?? null,
          low: quote.regularMarketDayLow ?? null,
          volume: quote.regularMarketVolume ?? null,
          pe: quote.trailingPE ?? null,
          marketCap: quote.marketCap ?? null,
          avgVol: quote.averageDailyVolume3Month ?? null,
          yield: quote.trailingAnnualDividendYield ?? null,
          beta: quote.beta ?? null,
          eps: quote.epsTrailingTwelveMonths ?? null,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
          // After-hours data
          preMarketPrice: quote.preMarketPrice ?? null,
          preMarketChange: quote.preMarketChange ?? null,
          preMarketChangePercent: quote.preMarketChangePercent ?? null,
          postMarketPrice: quote.postMarketPrice ?? null,
          postMarketChange: quote.postMarketChange ?? null,
          postMarketChangePercent: quote.postMarketChangePercent ?? null,
          marketState: quote.marketState || 'CLOSED',
          currentPrice: quote.regularMarketPrice ?? null,
          change: quote.regularMarketChange ?? null,
          changePercent: quote.regularMarketChangePercent ?? null,
          previousClose: quote.regularMarketPreviousClose ?? null,
          // Market type detection
          quoteType: quote.quoteType || 'EQUITY',
        };
      }
    }
    
    // Fallback to original implementation
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`
    );
    const data = await response.json();
    if (
      data.quoteResponse &&
      data.quoteResponse.result &&
      data.quoteResponse.result[0]
    ) {
      const quote = data.quoteResponse.result[0];
      return {
        open: quote.regularMarketOpen ?? null,
        high: quote.regularMarketDayHigh ?? null,
        low: quote.regularMarketDayLow ?? null,
        volume: quote.regularMarketVolume ?? null,
        pe: quote.trailingPE ?? null,
        marketCap: quote.marketCap ?? null,
        avgVol: quote.averageDailyVolume3Month ?? null,
        yield: quote.trailingAnnualDividendYield ?? null,
        beta: quote.beta ?? null,
        eps: quote.epsTrailingTwelveMonths ?? null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
        // Default values for after-hours data
        preMarketPrice: null,
        preMarketChange: null,
        preMarketChangePercent: null,
        postMarketPrice: null,
        postMarketChange: null,
        postMarketChangePercent: null,
        marketState: 'CLOSED',
        currentPrice: null,
        change: null,
        changePercent: null,
        previousClose: null,
        // Market type detection
        quoteType: quote.quoteType || 'EQUITY',
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching Yahoo quote:', err);
    return null;
  }
};

export default function ChartScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const router = useRouter();
  const { symbol, name, from } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [stockInfoError, setStockInfoError] = useState<string | null>(null);

  const handleBackPress = () => {
    if (from === 'watchlist') {
      router.push('/watchlist');
    } else if (from === 'portfolio') {
      router.push('/portfolio');
    } else if (from === 'home') {
      router.push('/');
    } else {
      // Fallback to home if no from parameter
      router.push('/');
    }
  };

  useEffect(() => {
    setStockInfoError(null);
    if (symbol) {
          fetchYahooQuote(symbol as string)
      .then((info) => {
        setStockInfo(info);
        if (!info) setStockInfoError('No stock info found.');
      })
      .catch((e) => {
        setStockInfo(null);
        setStockInfoError('Failed to load stock info.');
      });
    }
  }, [symbol]);

  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  };

  const getCurrentPrice = () => {
    if (!stockInfo) return 0;
    return stockInfo.currentPrice || stockInfo.postMarketPrice || stockInfo.preMarketPrice || 0;
  };

  const getCurrentLabel = () => {
    if (!stockInfo) return '';
    
    // Check if this is a crypto asset (CRYPTOCURRENCY quote type)
    const isCrypto = stockInfo.quoteType === 'CRYPTOCURRENCY';
    
    if (isCrypto) {
      return '24/7 Market';
    }
    
    // Traditional stock market logic
    const now = new Date();
    const nyTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
    const timePart = nyTimeString.split(', ')[1];
    const [nyHour, nyMinute] = timePart.split(':').map(Number);
    const minsSinceMidnight = nyHour * 60 + nyMinute;
    
    if (minsSinceMidnight >= 240 && minsSinceMidnight < 570) { // 4:00 AM to 9:29 AM ET
      return 'Pre-Market';
    } else if (minsSinceMidnight >= 570 && minsSinceMidnight < 960) { // 9:30 AM to 4:00 PM ET
      return 'Market Open';
    } else if (minsSinceMidnight >= 960 && minsSinceMidnight < 1200) { // 4:00 PM to 8:00 PM ET
      return 'After Hours';
    } else {
      return 'Market Closed';
    }
  };

  const getPriceChange = () => {
    if (!stockInfo) return { change: 0, percent: 0, basePrice: 0 };
    
    const currentPrice = getCurrentPrice();
    const previousClose = stockInfo.previousClose || currentPrice;
    
    const change = currentPrice - previousClose;
    const percent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
    
    return { change, percent, basePrice: previousClose };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Custom Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: colors.background, zIndex: 10 }}>
        <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 16, padding: 8 }}>
          <Text style={{ fontSize: 22, color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{name || symbol}</Text>
          <Text style={{ fontSize: 14, color: colors.textLight, marginTop: 2 }}>{symbol}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

      {/* Price Info Card */}
      <View style={{ marginHorizontal: 16, marginBottom: 0, backgroundColor: colors.card, borderRadius: 18, padding: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 6 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
            ${formatPrice(getCurrentPrice())}
          </Text>
          {(() => {
            const { change, percent, basePrice } = getPriceChange();
            const isPositive = change >= 0;
            return (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: isPositive ? colors.positive : colors.negative }}>
                  {isPositive ? '+' : ''}${formatPrice(change)} ({percent.toFixed(2)}%)
                </Text>
                <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>
                  {getCurrentLabel()}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* High, Low, Volume Row */}
        {stockInfo && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 4 }}>High</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                ${stockInfo.high?.toFixed(2) || '-'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 4 }}>Low</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                ${stockInfo.low?.toFixed(2) || '-'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 4 }}>Volume</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {stockInfo.volume ? (stockInfo.volume / 1000000).toFixed(1) + 'M' : '-'}
              </Text>
            </View>
          </View>
        )}

        {/* After-Hours/Pre-Market Data */}
        {stockInfo && (() => {
          // Don't show after-hours/pre-market for crypto (24/7 markets)
          const isCrypto = stockInfo.quoteType === 'CRYPTOCURRENCY';
          if (isCrypto) {
            return null;
          }
          
          // Get current market status
          const now = new Date();
          const nyTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
          const timePart = nyTimeString.split(', ')[1];
          const [nyHour, nyMinute] = timePart.split(':').map(Number);
          const minsSinceMidnight = nyHour * 60 + nyMinute;
          
          const isAfterHours = minsSinceMidnight >= 960 && minsSinceMidnight < 1200; // 4:00 PM to 8:00 PM ET
          const isPreMarket = minsSinceMidnight >= 240 && minsSinceMidnight < 570; // 4:00 AM to 9:29 AM ET
          
          const showAfterHours = stockInfo.postMarketPrice && stockInfo.postMarketPrice > 0 && isAfterHours;
          const showPreMarket = stockInfo.preMarketPrice && stockInfo.preMarketPrice > 0 && isPreMarket;
          
          if (showAfterHours) {
            return (
              <View style={{ marginTop: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' }}>
                <Text style={{ fontSize: 12, color: '#8B5CF6', fontWeight: '600', textAlign: 'center' }}>
                  After Hours: ${formatPrice(stockInfo.postMarketPrice)} (${stockInfo.postMarketChangePercent > 0 ? '+' : ''}${stockInfo.postMarketChangePercent?.toFixed(2)}%)
                </Text>
              </View>
            );
          } else if (showPreMarket) {
            return (
              <View style={{ marginTop: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#F59E0B' }}>
                <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600', textAlign: 'center' }}>
                  Pre-Market: ${formatPrice(stockInfo.preMarketPrice)} (${stockInfo.preMarketChangePercent > 0 ? '+' : ''}${stockInfo.preMarketChangePercent?.toFixed(2)}%)
                </Text>
              </View>
            );
          }
          return null;
        })()}
      </View>

      {/* Chart Placeholder */}
      <View style={{ paddingHorizontal: 8, paddingVertical:8, marginBottom: 16 }}>
        <View style={{ 
          width: '100%', 
          height:400, 
          backgroundColor: colors.card,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius:18   }}>
          <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
            📈 Professional Charts Coming Soon!
          </Text>
                         <Text style={{ color: colors.textLight, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
              We're working on bringing you beautiful, interactive stock charts. For now, you can view all the important stock data below.
            </Text>
          </View>
        </View>
      
      {/* Stock Info Table */}
      <View style={{ backgroundColor: colors.card, borderRadius: 16, margin: 16, padding: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, marginBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: colors.text }}>Stock Information</Text>
        {stockInfoError ? (
          <Text style={{ color: colors.negative }}>{stockInfoError}</Text>
        ) : stockInfo ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Open</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>${stockInfo.open?.toFixed(2) || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>High</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>${stockInfo.high?.toFixed(2) || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Low</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>${stockInfo.low?.toFixed(2) || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Volume</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{stockInfo.volume ? (stockInfo.volume / 1000000).toFixed(1) + 'M' : '-'}</Text>
            </View>
            {/* After-Hours Data */}
            {stockInfo.postMarketPrice && stockInfo.postMarketPrice > 0 && stockInfo.quoteType !== 'CRYPTOCURRENCY' && (
              <>
                <View style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#8B5CF6', marginBottom: 2 }}>After Hours</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#8B5CF6' }}>${stockInfo.postMarketPrice?.toFixed(2) || '-'}</Text>
                </View>
                <View style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#8B5CF6', marginBottom: 2 }}>AH Change</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: stockInfo.postMarketChangePercent > 0 ? colors.positive : colors.negative }}>
                    {stockInfo.postMarketChangePercent > 0 ? '+' : ''}{stockInfo.postMarketChangePercent?.toFixed(2)}%
                  </Text>
                </View>
              </>
            )}
            {/* Pre-Market Data */}
            {stockInfo.preMarketPrice && stockInfo.preMarketPrice > 0 && stockInfo.quoteType !== 'CRYPTOCURRENCY' && (
              <>
                <View style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#F59E0B', marginBottom: 2 }}>Pre-Market</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#F59E0B' }}>${stockInfo.preMarketPrice?.toFixed(2) || '-'}</Text>
                </View>
                <View style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#F59E0B', marginBottom: 2 }}>PM Change</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: stockInfo.preMarketChangePercent > 0 ? colors.positive : colors.negative }}>
                    {stockInfo.preMarketChangePercent > 0 ? '+' : ''}{stockInfo.preMarketChangePercent?.toFixed(2)}%
                  </Text>
                </View>
              </>
            )}
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>P/E Ratio</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{stockInfo.pe?.toFixed(2) || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Market Cap</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{stockInfo.marketCap ? `$${(stockInfo.marketCap/1e9).toFixed(1)}B` : '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>52W High</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>${stockInfo.fiftyTwoWeekHigh?.toFixed(2) || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>52W Low</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>${stockInfo.fiftyTwoWeekLow?.toFixed(2) || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Avg Volume</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{stockInfo.avgVol?.toLocaleString() || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Dividend Yield</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{stockInfo.yield ? (stockInfo.yield * 100).toFixed(2) + '%' : '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>Beta</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{stockInfo.beta?.toFixed(2) || '-'}</Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>EPS</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>${stockInfo.eps?.toFixed(2) || '-'}</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ color: colors.textLight, marginTop: 8 }}>Loading stock info...</Text>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}