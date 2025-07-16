import { getColors } from '@/constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
  metadata?: {
    validDataPoints: {
      timestamp: number;
      close: number | null;
      open: number | null;
      high: number | null;
      low: number | null;
      index: number;
    }[];
    range: string;
    interval: string;
  };
}

const timeframes = [
  { key: '1d', label: '1D', range: '1d', interval: '5m' },
  { key: '5d', label: '5D', range: '5d', interval: '15m' },
  { key: '1m', label: '1M', range: '1mo', interval: '1d' },
  { key: '6m', label: '6M', range: '6mo', interval: '1d' },
  { key: '1y', label: '1Y', range: '1y', interval: '1d' },
  { key: '2y', label: '2Y', range: '2y', interval: '1d' },
  { key: '5y', label: '5Y', range: '5y', interval: '1d' },
  { key: 'max', label: 'MAX', range: 'max', interval: '1d' }
];

const fetchChartData = async (symbol: string, range: string, interval: string): Promise<ChartData> => {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=true&events=div%2Csplit`
    );
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('Invalid chart data');
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    if (!timestamps || !quotes || !timestamps.length) {
      throw new Error('No price data available');
    }
    
    // Get all valid price data points
    const validDataPoints = timestamps.map((timestamp: number, index: number) => {
      const close = quotes.close[index];
      const open = quotes.open[index];
      const high = quotes.high[index];
      const low = quotes.low[index];
      
      return {
        timestamp,
        close: close !== null && close !== undefined ? close : null,
        open: open !== null && open !== undefined ? open : null,
        high: high !== null && high !== undefined ? high : null,
        low: low !== null && low !== undefined ? low : null,
        index
      };
    }).filter((point: { close: null; }) => point.close !== null);
    
    if (validDataPoints.length === 0) {
      throw new Error('No valid price data available');
    }

    return {
      labels: timestamps.map((ts: number) => {
        const date = new Date(ts * 1000);
        // Only show timestamps for 1-day chart, show only dates for others
        if (range === '1d') {
          return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        } else {
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }
      }),
      datasets: [
        {
          data: validDataPoints.map((point: any) => point.close),
        }
      ],
      metadata: {
        validDataPoints,
        range,
        interval
      }
    };
  } catch (err) {
    console.error('Error fetching chart data:', err);
    throw err;
  }
};

// Fetch all stock info from Yahoo v7/finance/quote endpoint (matches watchlist)
const fetchYahooQuote = async (symbol: string) => {
  try {
    // Try the quote endpoint first - it's more reliable for current data
    const quoteResponse = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,shortName,longName,marketState,preMarketPrice,preMarketChange,preMarketChangePercent,postMarketPrice,postMarketChange,postMarketChangePercent,regularMarketOpen,trailingPE,marketCap,averageDailyVolume3Month,trailingAnnualDividendYield,beta,epsTrailingTwelveMonths,fiftyTwoWeekHigh,fiftyTwoWeekLow`
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
  const { symbol, name } = useLocalSearchParams();
  
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const tooltipTimeout = useRef<any>(null);
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [stockInfoError, setStockInfoError] = useState<string | null>(null);

  const loadChartData = async (timeframeKey: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const timeframe = timeframes.find(t => t.key === timeframeKey);
      if (!timeframe) return;
      
      const data = await fetchChartData(symbol as string, timeframe.range, timeframe.interval);
      setChartData(data);
      setActiveIndex(null);
      setTooltipPos(null);
    } catch (err) {
      setError('Failed to load chart data');
      Alert.alert('Error', 'Failed to load chart data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData(selectedTimeframe);
  }, [selectedTimeframe, symbol]);

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
    return price.toFixed(2);
  };

  const getCurrentPrice = () => {
    if (!chartData || chartData.datasets[0].data.length === 0) return 0;
    if (activeIndex !== null && chartData.datasets[0].data[activeIndex] !== undefined) {
      return chartData.datasets[0].data[activeIndex];
    }
    return chartData.datasets[0].data[chartData.datasets[0].data.length - 1];
  };

  const getCurrentLabel = () => {
    if (!chartData || chartData.labels.length === 0) return '';
    if (activeIndex !== null && chartData.labels[activeIndex] !== undefined) {
      return chartData.labels[activeIndex];
    }
    return chartData.labels[chartData.labels.length - 1];
  };

  // Clear tooltip after delay
  useEffect(() => {
    if (activeIndex !== null) {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = setTimeout(() => {
        setActiveIndex(null);
        setTooltipPos(null);
      }, 3000);
    }
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    };
  }, [activeIndex]);

  const getPriceChange = () => {
    if (!chartData || chartData.datasets[0].data.length < 2) return { change: 0, percent: 0 };
    
    const prices = chartData.datasets[0].data;
    const currentIdx = activeIndex !== null ? activeIndex : prices.length - 1;
    const currentPrice = prices[currentIdx];
    const basePrice = prices[0];
    
    const change = currentPrice - basePrice;
    const percent = basePrice !== 0 ? (change / basePrice) * 100 : 0;
    
    return { change, percent, basePrice };
  };

  // Improved label formatting function - show even fewer labels
  const formatXLabel = (label: string) => {
    if (!chartData) return '';
    
    const total = chartData.labels.length;
    const idx = chartData.labels.indexOf(label);
    
    // Show even fewer labels for ultra-clean chart
    if (total <= 3) return label;
    
    // Show only 3-4 labels max
    const interval = Math.ceil(total / 3);
    return idx % interval === 0 || idx === total - 1 ? label : '';
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Custom Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: colors.background, zIndex: 10 }}>
        <TouchableOpacity onPress={() => router.push('/watchlist')} style={{ marginRight: 16, padding: 8 }}>
          <Text style={{ fontSize: 22, color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{name || symbol}</Text>
          <Text style={{ fontSize: 14, color: colors.textLight, marginTop: 2 }}>{symbol}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

      {/* Timeframe Selector */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: 16, marginTop: 8, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
        {timeframes.map((timeframe) => (
          <TouchableOpacity
            key={timeframe.key}
            onPress={() => setSelectedTimeframe(timeframe.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: selectedTimeframe === timeframe.key ? colors.accent : 'transparent',
              marginHorizontal: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{
              color: selectedTimeframe === timeframe.key ? 'white' : colors.text,
              fontWeight: selectedTimeframe === timeframe.key ? '700' : '500',
              fontSize: 13
            }}>
              {timeframe.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Price Info Card */}
      <View style={{ marginHorizontal: 16, marginBottom: 0, backgroundColor: colors.card, borderRadius: 18, padding: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 6 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
            ${formatPrice(getCurrentPrice())}
          </Text>
          {(() => {
            const { change, percent, basePrice } = getPriceChange();
            const isPositive = change >= 0;
            const timeframe = timeframes.find(t => t.key === selectedTimeframe);
            return (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: isPositive ? colors.positive : colors.negative }}>
                  {isPositive ? '+' : ''}${formatPrice(change)} ({percent.toFixed(2)}%)
                </Text>
                <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 4 }}>
                  {timeframe?.label} • {getCurrentLabel()}
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

      {/* Chart */}
      <View style={{ paddingHorizontal: 8, paddingVertical: 8, marginBottom: 16 }}>
        {loading ? (
          <View style={{ height: 320, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18 }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ marginTop: 16, color: colors.textLight }}>Loading chart...</Text>
          </View>
        ) : error ? (
          <View style={{ height: 320, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18 }}>
            <Text style={{ color: colors.negative, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
            <TouchableOpacity 
              onPress={() => loadChartData(selectedTimeframe)}
              style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.accent, borderRadius: 8 }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : chartData ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 6, position: 'relative' }}>
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={280}
              formatXLabel={formatXLabel}
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 2,
                color: (opacity = 1) => colors.accent,
                labelColor: (opacity = 1) => colors.textLight,
                style: {
                  borderRadius: 18
                },
                propsForDots: {
                  r: '0',
                  strokeWidth: '0',
                  stroke: 'transparent',
                  fill: 'transparent',
                },
                propsForLabels: {
                  fontSize: 10,
                  fontWeight: '400',
                },
                propsForVerticalLabels: {
                  fontSize: 10,
                  fontWeight: '400',
                },
                propsForHorizontalLabels: {
                  fontSize: 10,
                  fontWeight: '400',
                },
                strokeWidth: 2,
                useShadowColorFromDataset: false,
                fillShadowGradient: 'transparent',
                fillShadowGradientOpacity: 0,
              }}
              bezier={false}
              style={{
                marginVertical: 8,
                borderRadius: 18,
                paddingRight: 16
              }}
              withDots={false}
              withShadow={false}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={false}
              onDataPointClick={({ index, x, y }) => {
                setActiveIndex(index);
                setTooltipPos({ x: x - 32, y: y - 16 });
              }}
            />
            {/* Cleaner tooltip */}
            {activeIndex !== null && tooltipPos && chartData && (
              <View style={{ 
                position: 'absolute', 
                left: Math.max(8, Math.min(tooltipPos.x, screenWidth - 120)), 
                top: Math.max(8, tooltipPos.y), 
                zIndex: 1000,
                pointerEvents: 'none'
              }}>
                <View style={{ 
                  backgroundColor: colors.text, 
                  borderRadius: 8, 
                  padding: 12, 
                  minWidth: 100,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5
                }}>
                  <Text style={{ color: colors.background, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>
                    ${formatPrice(chartData.datasets[0].data[activeIndex])}
                  </Text>
                  <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 2, textAlign: 'center' }}>
                    {chartData.labels[activeIndex]}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : null}
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
            {stockInfo.postMarketPrice && stockInfo.postMarketPrice > 0 && (
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
            {stockInfo.preMarketPrice && stockInfo.preMarketPrice > 0 && (
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