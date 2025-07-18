import { getColors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'expo-datepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, FlatList, Keyboard, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useColorScheme, View } from 'react-native';
import PieChart from 'react-native-pie-chart';
import { fetchYahooQuote } from './watchlist';

const { width: screenWidth } = Dimensions.get('window');

// Yahoo Finance search API (copied from watchlist)
type TickerResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

type Transaction = {
  ticker: string;
  date: string;
  shares: number;
  price: number;
};

type Holding = {
  ticker: string;
  totalShares: number;
  avgBuyPrice: number;
};

const searchYahooStocks = async (query: string): Promise<TickerResult[]> => {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query`
    );
    const data = await response.json();
    return data.quotes?.filter((quote: any) =>
      (quote.quoteType === 'EQUITY' || quote.quoteType === 'CRYPTOCURRENCY') &&
      (quote.exchange === 'NMS' || quote.exchange === 'NYQ' || quote.exchange === 'NCM' || quote.quoteType === 'CRYPTOCURRENCY')
    ).map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname,
      exchange: quote.exchange,
      type: quote.quoteType
    })) || [];
  } catch (error) {
    return [];
  }
};

// Helper to format money with commas and two decimals
function formatMoney(value: number | string) {
  return typeof value === 'number'
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Replace fbemitter with a simple callback array
const homeRefreshCallbacks: Array<() => void> = [];
export function onHomeRefresh(cb: () => void) {
  homeRefreshCallbacks.push(cb);
  return { remove: () => {
    const idx = homeRefreshCallbacks.indexOf(cb);
    if (idx !== -1) homeRefreshCallbacks.splice(idx, 1);
  }};
}
export function triggerHomeRefresh() {
  homeRefreshCallbacks.forEach(cb => cb());
}

// Modern gradient color palette
const modernColors = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', 
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#F97316'
];

export default function PortfolioScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<FlatList>(null);
  const transactionsRef = useRef<View>(null);

  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [ticker, setTicker] = useState('');
  const [tickerInput, setTickerInput] = useState('');
  const [tickerResults, setTickerResults] = useState<TickerResult[]>([]);
  const [tickerLoading, setTickerLoading] = useState(false);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [livePrices, setLivePrices] = useState<{ [ticker: string]: { price: number; previousClose: number } }>({});
  const [transactionsY, setTransactionsY] = useState(0);
  const [holdingsY, setHoldingsY] = useState(0);
  const [selectedStock, setSelectedStock] = useState<TickerResult | null>(null);

  // Add state for cash transactions modal
  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [cashTransactions, setCashTransactions] = useState<any[]>([]);
  const [cashAmount, setCashAmount] = useState('');
  const [cashDate, setCashDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashType, setCashType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [cashSaving, setCashSaving] = useState(false);
  const [cashError, setCashError] = useState('');

  // Load cash transactions
  useEffect(() => {
    const loadCashTransactions = async () => {
      try {
        const data = await AsyncStorage.getItem('cash_transactions');
        if (data) setCashTransactions(JSON.parse(data));
      } catch (e) {
        console.error('Failed to load cash transactions:', e);
      }
    };
    loadCashTransactions();
  }, []);

  // Calculate total cash balance
  const totalCashBalance = cashTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Save cash transaction
  const saveCashTransaction = async () => {
    setCashError('');
    if (!cashAmount) {
      setCashError('Amount is required.');
      return;
    }
    if (isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) {
      setCashError('Amount must be a positive number.');
      return;
    }
    setCashSaving(true);
    try {
      const tx = {
        date: cashDate,
        amount: Number(cashAmount) * (cashType === 'WITHDRAWAL' ? -1 : 1),
        type: cashType,
      };
      const existing = await AsyncStorage.getItem('cash_transactions');
      let arr = [];
      if (existing) arr = JSON.parse(existing);
      arr.push(tx);
      await AsyncStorage.setItem('cash_transactions', JSON.stringify(arr));
      setCashTransactions(arr);
      setCashModalVisible(false);
      setCashAmount('');
      setCashDate(new Date().toISOString().slice(0, 10));
      setCashType('DEPOSIT');
      await refreshHoldings();
      triggerHomeRefresh();
    } catch (e) {
      setCashError('Failed to save transaction.');
    } finally {
      setCashSaving(false);
    }
  };

  // Delete cash transaction
  const handleDeleteCashTransaction = async (index: number) => {
    const updated = [...cashTransactions];
    updated.splice(index, 1);
    setCashTransactions(updated);
    await AsyncStorage.setItem('cash_transactions', JSON.stringify(updated));
    await refreshHoldings();
    triggerHomeRefresh();
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  // --- Holdings Aggregation ---
  // 1. Update the aggregateHoldings function to include cash transactions
  async function aggregateHoldings(transactions: Transaction[]): Promise<Holding[]> {
    const map: { [ticker: string]: { totalShares: number; totalCost: number } } = {};
    for (const tx of transactions) {
      if (!map[tx.ticker]) {
        map[tx.ticker] = { totalShares: 0, totalCost: 0 };
      }
      map[tx.ticker].totalShares += tx.shares;
      map[tx.ticker].totalCost += tx.shares * tx.price;
    }
    
    // Add cash balance from separate cash transactions
    try {
      const cashData = await AsyncStorage.getItem('cash_transactions');
      if (cashData) {
        const cashTxs = JSON.parse(cashData);
        const cashBalance = cashTxs.reduce((sum: number, tx: any) => sum + tx.amount, 0);
        if (cashBalance !== 0) {
          map['Cash'] = { totalShares: cashBalance, totalCost: cashBalance };
        }
      }
    } catch (e) {
      console.error('Failed to load cash transactions:', e);
    }
    
    return Object.entries(map).map(([ticker, { totalShares, totalCost }]) => ({
      ticker,
      totalShares,
      avgBuyPrice: totalShares > 0 ? totalCost / totalShares : 0,
    }));
  }

  // 2. Update the holdings calculation to be async
  const [holdings, setHoldings] = useState<Holding[]>([]);

  // Force refresh holdings when needed
  const refreshHoldings = async () => {
    const holdingsData = await aggregateHoldings(transactions);
    setHoldings(holdingsData);
  };

  useEffect(() => {
    refreshHoldings();
  }, [transactions, cashTransactions]);

  // --- Calculate Portfolio Totals ---
  const totalValue = holdings.reduce((sum, h) => {
    if (h.ticker === 'Cash') {
      return sum + h.totalShares; // Cash is valued at face value
    }
    const price = livePrices[h.ticker]?.price ?? 0;
    return sum + h.totalShares * price;
  }, 0);
  const totalGain = holdings.reduce((sum, h) => {
    if (h.ticker === 'Cash') {
      return sum; // Cash has no gain/loss
    }
    const price = livePrices[h.ticker]?.price ?? 0;
    return sum + (price - h.avgBuyPrice) * h.totalShares;
  }, 0);
  const totalDailyGain = holdings.reduce((sum, h) => {
    if (h.ticker === 'Cash') {
      return sum; // Cash has no daily change
    }
    const price = livePrices[h.ticker]?.price ?? 0;
    const prevClose = livePrices[h.ticker]?.previousClose ?? 0;
    return sum + (price - prevClose) * h.totalShares;
  }, 0);

  // --- Flash state for holdings value ---
  const [holdingsFlash, setHoldingsFlash] = useState<{ [ticker: string]: 'up' | 'down' | null }>({});
  const prevValues = useRef<{ [ticker: string]: number }>({});

  // --- Animations ---
  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // --- 10s interval for live price refresh ---
  useEffect(() => {
    if (holdings.length === 0) return;
    let mounted = true;
    const fetchAndUpdate = async () => {
      const prices: { [ticker: string]: { price: number; previousClose: number } } = {};
      for (const h of holdings) {
        try {
          const quote = await fetchYahooQuote(h.ticker);
          prices[h.ticker] = {
            price: quote.price,
            previousClose: quote.previousClose ?? quote.price,
          };
        } catch (e) {
          prices[h.ticker] = { price: 0, previousClose: 0 };
        }
      }
      if (mounted) setLivePrices(prices);
    };
    fetchAndUpdate();
    const interval = setInterval(fetchAndUpdate, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, [holdings]);

  // --- Flash logic for holdings value ---
  useEffect(() => {
    if (holdings.length === 0) return;
    const flashes: { [ticker: string]: 'up' | 'down' | null } = {};
    holdings.forEach(h => {
      const currentPrice = livePrices[h.ticker]?.price ?? 0;
      const currentValue = h.totalShares * currentPrice;
      const prev = prevValues.current[h.ticker];
      if (prev !== undefined && prev !== currentValue) {
        flashes[h.ticker] = currentValue > prev ? 'up' : 'down';
        setTimeout(() => {
          setHoldingsFlash(f => ({ ...f, [h.ticker]: null }));
        }, 700);
      }
      prevValues.current[h.ticker] = currentValue;
    });
    if (Object.keys(flashes).length > 0) {
      setHoldingsFlash(f => ({ ...f, ...flashes }));
    }
  }, [livePrices, holdings]);

  // --- Delete transaction handler ---
  async function handleDeleteTransaction(index: number) {
    const updated = [...transactions];
    updated.splice(index, 1);
    setTransactions(updated);
    await AsyncStorage.setItem('portfolio_transactions', JSON.stringify(updated));
    await refreshHoldings();
    triggerHomeRefresh();
  }

  // --- Ticker search logic ---
  const ignoreNextSearch = useRef(false);
  React.useEffect(() => {
    if (ignoreNextSearch.current) {
      ignoreNextSearch.current = false;
      return;
    }
    if (tickerInput.length < 1) {
      setTickerResults([]);
      setShowTickerDropdown(false);
      return;
    }
    setTickerLoading(true);
    searchYahooStocks(tickerInput).then((results: TickerResult[]) => {
      setTickerResults(results);
      setShowTickerDropdown(true);
      setTickerLoading(false);
    });
  }, [tickerInput]);

  // --- Save transaction to AsyncStorage ---
  const saveTransaction = async () => {
    setError('');
    if (!ticker || !date || !shares || !price) {
      setError('All fields are required.');
      return;
    }
    if (isNaN(Number(shares)) || isNaN(Number(price))) {
      setError('Shares and price must be numbers.');
      return;
    }
    setSaving(true);
    try {
      const tx = {
        ticker: (ticker || tickerInput).trim().toUpperCase(),
        date,
        shares: Number(shares),
        price: Number(price),
      };
      const existing = await AsyncStorage.getItem('portfolio_transactions');
      let arr = [];
      if (existing) arr = JSON.parse(existing);
      arr.push(tx);
      await AsyncStorage.setItem('portfolio_transactions', JSON.stringify(arr));
      setTransactions(arr);
      setModalVisible(false);
      setTicker('');
      setTickerInput('');
      setTickerResults([]);
      setShares('');
      setPrice('');
      setDate(new Date().toISOString().slice(0, 10));
      await refreshHoldings();
      triggerHomeRefresh();
    } catch (e) {
      setError('Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  // --- useEffect for loading transactions ---
  useEffect(() => {
    const loadTransactions = async () => {
      const data = await AsyncStorage.getItem('portfolio_transactions');
      if (data) setTransactions(JSON.parse(data));
    };
    loadTransactions();
  }, []);

  // Scroll to transactions if param is set
  useEffect(() => {
    if (params.scrollToTransactions && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToOffset({ offset: transactionsY, animated: true });
      }, 500);
    }
  }, [params.scrollToTransactions, transactionsY]);

  // Scroll to holdings if param is set
  useEffect(() => {
    if (params.scrollToHoldings && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToOffset({ offset: holdingsY, animated: true });
      }, 500);
    }
  }, [params.scrollToHoldings, holdingsY]);

  // --- Holdings rendering ---
  // 1. Separate cash holding from other holdings
  const cashHolding = holdings.find(h => h.ticker === 'Cash');
  const nonCashHoldings = holdings.filter(h => h.ticker !== 'Cash');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View>
            {/* Header with gradient background */}
            <Animated.View
              style={{
                opacity: headerFadeAnim,
                paddingHorizontal: 20,
                paddingTop: 60,
                paddingBottom: 30,
                backgroundColor: colors.card,
                borderBottomLeftRadius: 32,
                borderBottomRightRadius: 32,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ 
                    fontSize: 32, 
                    fontWeight: '800', 
                    color: colors.text,
                    letterSpacing: -0.5
                  }}>
                    Portfolio
                  </Text>
                  <Text style={{ 
                    fontSize: 16, 
                    color: colors.subtext,
                    fontWeight: '500',
                    marginTop: 4
                  }}>
                    Track your investments
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.background,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => setCashModalVisible(true)}
                  >
                    <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                    <Text style={{
                      color: colors.primary,
                      fontWeight: '700',
                      fontSize: 13,
                      marginLeft: 4,
                    }}>
                      Cash
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    onPress={() => setModalVisible(true)}
                  >
                    <Ionicons name="add" size={16} color={colors.white} />
                    <Text style={{
                      color: colors.white,
                      fontWeight: '700',
                      marginLeft: 3,
                      fontSize: 13
                    }}>
                      Add Trade
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
              {/* Portfolio Summary */}
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  marginBottom: 32,
                }}
              >
                <View style={{
                  backgroundColor: colors.card,
                  borderRadius: 24,
                  padding: 24,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 16,
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: colors.border + '30',
                }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: '700', 
                    color: colors.text,
                    marginBottom: 16,
                    textAlign: 'center'
                  }}>
                    Total Portfolio Value
                  </Text>
                  
                  <Text style={{ 
                    fontSize: 36, 
                    fontWeight: '800', 
                    color: colors.text,
                    textAlign: 'center',
                    marginBottom: 16,
                    letterSpacing: -1
                  }}>
                    ${formatMoney(totalValue)}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ 
                        fontSize: 14, 
                        color: colors.subtext,
                        fontWeight: '600',
                        marginBottom: 4
                      }}>
                        Total Gain/Loss
                      </Text>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: '700',
                        color: totalGain >= 0 ? '#10B981' : '#EF4444'
                      }}>
                        {totalGain >= 0 ? '+' : ''}${formatMoney(totalGain)}
                      </Text>
                    </View>
                    
                    <View style={{ 
                      width: 1, 
                      height: 40, 
                      backgroundColor: colors.border + '50' 
                    }} />
                    
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ 
                        fontSize: 14, 
                        color: colors.subtext,
                        fontWeight: '600',
                        marginBottom: 4
                      }}>
                        Day Change
                      </Text>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: '700',
                        color: totalDailyGain >= 0 ? '#10B981' : '#EF4444'
                      }}>
                        {totalDailyGain >= 0 ? '+' : ''}${formatMoney(totalDailyGain)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* Portfolio Allocation Chart */}
              {holdings.length > 0 && totalValue > 0 && (
                <Animated.View
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    marginBottom: 32,
                  }}
                >
                  <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 24,
                    padding: 24,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.1,
                    shadowRadius: 16,
                    elevation: 8,
                    borderWidth: 1,
                    borderColor: colors.border + '30',
                  }}>
                    <Text style={{ 
                      fontSize: 20, 
                      fontWeight: '700', 
                      color: colors.text,
                      marginBottom: 20,
                      textAlign: 'center'
                    }}>
                      Portfolio Allocation
                    </Text>
                    
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <PieChart
                        widthAndHeight={200}
                        series={holdings.map((h, idx) => {
                          let value;
                          if (h.ticker === 'Cash') {
                            value = h.totalShares; // Cash value is face value
                          } else {
                            value = h.totalShares * (livePrices[h.ticker]?.price ?? 0);
                          }
                          return { value, color: modernColors[idx % modernColors.length] };
                        })}
                        cover={{ radius: 0.65, color: colors.card }}
                      />
                    </View>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {holdings.map((h, idx) => {
                        let value;
                        if (h.ticker === 'Cash') {
                          value = h.totalShares; // Cash value is face value
                        } else {
                          value = h.totalShares * (livePrices[h.ticker]?.price ?? 0);
                        }
                        const percent = ((value / totalValue) * 100).toFixed(1);
                        return (
                          <View key={h.ticker} style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            marginHorizontal: 8,
                            marginBottom: 8,
                            backgroundColor: colors.background,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                          }}>
                            <View style={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: 6, 
                              backgroundColor: modernColors[idx % modernColors.length],
                              marginRight: 8
                            }} />
                            <Text style={{ 
                              color: colors.text, 
                              fontSize: 14, 
                              fontWeight: '600'
                            }}>
                              {h.ticker} {percent}%
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* Cash Balance Section */}
              {cashHolding && (
                <Animated.View
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    marginBottom: 32,
                  }}
                >
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: 16
                  }}>
                    Cash Balance
                  </Text>
                  <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    padding: 24,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 6,
                    borderWidth: 1,
                    borderColor: colors.border + '30',
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      fontSize: 32,
                      fontWeight: '800',
                      color: colors.text,
                      letterSpacing: -1,
                    }}>
                      ${formatMoney(cashHolding.totalShares)}
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* Holdings List */}
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  marginBottom: 32,
                }}
                onLayout={event => setHoldingsY(event.nativeEvent.layout.y)}
              >
                <Text style={{ 
                  fontSize: 22, 
                  fontWeight: '700', 
                  color: colors.text,
                  marginBottom: 16
                }}>
                  Holdings
                </Text>
                
                {nonCashHoldings.length === 0 ? (
                  <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    padding: 32,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: colors.border + '30',
                    borderStyle: 'dashed',
                  }}>
                    <Ionicons name="pie-chart-outline" size={48} color={colors.subtext} />
                    <Text style={{ 
                      color: colors.subtext,
                      fontSize: 16,
                      fontWeight: '600',
                      marginTop: 12,
                      textAlign: 'center'
                    }}>
                      No holdings yet
                    </Text>
                    <Text style={{ 
                      color: colors.subtext,
                      fontSize: 14,
                      textAlign: 'center',
                      marginTop: 4
                    }}>
                      Add your first transaction to get started
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {nonCashHoldings.map((h, idx) => {
                      const currentPrice = livePrices[h.ticker]?.price ?? 0;
                      const previousClose = livePrices[h.ticker]?.previousClose ?? 0;
                      const currentValue = h.totalShares * currentPrice;
                      const gain = (currentPrice - h.avgBuyPrice) * h.totalShares;
                      const gainPercent = h.avgBuyPrice > 0 ? ((currentPrice - h.avgBuyPrice) / h.avgBuyPrice * 100) : 0;
                      const dailyGain = (currentPrice - previousClose) * h.totalShares;
                      const flash = holdingsFlash[h.ticker];
                      
                      return (
                        <View key={h.ticker} style={{
                          backgroundColor: colors.card,
                          borderRadius: 20,
                          padding: 20,
                          shadowColor: colors.shadow,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.08,
                          shadowRadius: 12,
                          elevation: 6,
                          borderWidth: 1,
                          borderColor: colors.border + '30',
                          borderLeftWidth: 4,
                          borderLeftColor: modernColors[idx % modernColors.length],
                        }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ 
                                fontSize: 18, 
                                fontWeight: '700', 
                                color: colors.text,
                                marginBottom: 4
                              }}>
                                {h.ticker}
                              </Text>
                              <Text style={{ fontSize: 14, color: colors.subtext, fontWeight: '500' }}>{h.totalShares} shares</Text>
                              <Text style={{ fontSize: 13, color: colors.subtext, fontWeight: '500', marginBottom: 4 }}>Avg: ${formatMoney(h.avgBuyPrice)}</Text>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: flash === 'up' ? '#10B981' : flash === 'down' ? '#EF4444' : colors.text }}>${formatMoney(currentValue)}</Text>
                              <Text style={{ fontSize: 13, color: colors.subtext, fontWeight: '500', marginTop: 2 }}>Unrealized Gain/Loss</Text>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: gain >= 0 ? '#10B981' : '#EF4444' }}>{gain >= 0 ? '+' : ''}${formatMoney(gain)} ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ 
                                fontSize: 14, 
                                color: colors.subtext,
                                fontWeight: '500'
                              }}>
                                Current Price: ${formatMoney(currentPrice)}
                              </Text>
                              <Text style={{ 
                                fontSize: 14, 
                                fontWeight: '600',
                                color: dailyGain >= 0 ? '#10B981' : '#EF4444'
                              }}>
                                {dailyGain > 0 ? '+' : dailyGain < 0 ? '-' : ''}${formatMoney(Math.abs(dailyGain))}
                              </Text>
                              <Text style={{ 
                                fontSize: 12, 
                                color: colors.subtext,
                                marginTop: 2
                              }}>
                                Today
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Animated.View>

              {/* Transactions List */}
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
                onLayout={event => setTransactionsY(event.nativeEvent.layout.y)}
              >
                <Text style={{ 
                  fontSize: 22, 
                  fontWeight: '700', 
                  color: colors.text,
                  marginBottom: 16
                }}>
                  Recent Transactions
                </Text>
                
                {transactions.length === 0 ? (
                  <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    padding: 32,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: colors.border + '30',
                    borderStyle: 'dashed',
                  }}>
                    <Ionicons name="receipt-outline" size={48} color={colors.subtext} />
                    <Text style={{ 
                      color: colors.subtext,
                      fontSize: 16,
                      fontWeight: '600',
                      marginTop: 12,
                      textAlign: 'center'
                    }}>
                      No transactions yet
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {transactions.slice().reverse().map((tx, idx) => (
                      <View key={transactions.length - 1 - idx} style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 8,
                        elevation: 4,
                        borderWidth: 1,
                        borderColor: colors.border + '30',
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: '600', 
                            color: colors.text,
                            marginBottom: 4
                          }}>
                            {tx.ticker}
                          </Text>
                          <Text style={{ 
                            fontSize: 14, 
                            color: colors.subtext,
                            fontWeight: '500'
                          }}>
                            {tx.shares} shares @ ${formatMoney(tx.price)}
                          </Text>
                          <Text style={{ 
                            fontSize: 12, 
                            color: colors.subtext,
                            marginTop: 2
                          }}>
                            {tx.date}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: '600', 
                            color: colors.text
                          }}>
                            ${formatMoney(tx.shares * tx.price)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteTransaction(transactions.length - 1 - idx)}
                          style={{
                            padding: 8,
                            borderRadius: 12,
                            backgroundColor: '#FEE2E2',
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        )}
      />

      {/* Enhanced Add Transaction Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                      <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            justifyContent: 'flex-end'
          }}>
            <View style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 24,
              paddingTop: 32,
              paddingBottom: 40,
              maxHeight: '90%',
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 16,
            }}>
              {/* Modal Handle */}
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 24,
              }} />
              
              <Text style={{ 
                fontSize: 28, 
                fontWeight: '800', 
                color: colors.text,
                textAlign: 'center',
                marginBottom: 32,
                letterSpacing: -0.5
              }}>
                Add Transaction
              </Text>
              
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {/* Ticker Search */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: colors.text,
                    marginBottom: 8
                  }}>
                    Stock Symbol
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      placeholder="Search ticker (e.g. AAPL, TSLA)"
                      value={tickerInput}
                      onChangeText={setTickerInput}
                      style={{
                        borderWidth: 2,
                        borderColor: colors.border + '80',
                        borderRadius: 16,
                        padding: 16,
                        fontSize: 16,
                        fontWeight: '600',
                        color: colors.text,
                        backgroundColor: colors.background,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                      autoCapitalize="characters"
                      placeholderTextColor={colors.subtext}
                      onFocus={() => tickerInput.length > 0 && setShowTickerDropdown(true)}
                    />
                    {tickerLoading && (
                      <View style={{ position: 'absolute', right: 16, top: 16 }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                  </View>
                  
                  {showTickerDropdown && tickerResults.length > 0 && (
                    <View style={{
                      maxHeight: 200,
                      backgroundColor: colors.card,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border + '50',
                      marginTop: 8,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.15,
                      shadowRadius: 16,
                      elevation: 12,
                    }}>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {tickerResults.map((result, idx) => (
                          <TouchableOpacity
                            key={result.symbol + idx}
                            onPress={() => {
                              setTicker(result.symbol);
                              ignoreNextSearch.current = true;
                              setTickerInput(result.symbol);
                              setShowTickerDropdown(false);
                            }}
                            style={{
                              padding: 16,
                              borderBottomWidth: idx < tickerResults.length - 1 ? 1 : 0,
                              borderBottomColor: colors.border + '30',
                            }}
                          >
                            <Text style={{ 
                              color: colors.text, 
                              fontWeight: '700',
                              fontSize: 16,
                              marginBottom: 2
                            }}>
                              {result.symbol}
                            </Text>
                            <Text style={{ 
                              color: colors.subtext, 
                              fontSize: 14,
                              fontWeight: '500'
                            }}>
                              {result.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Date Picker */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: colors.text,
                    marginBottom: 8
                  }}>
                    Transaction Date
                  </Text>
                  <View style={{
                    borderWidth: 2,
                    borderColor: colors.border + '80',
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }}>
                    <DatePicker
                      date={date}
                      onChange={setDate}
                      backgroundColor={colors.background}
                      borderColor="transparent"
                    />
                  </View>
                </View>

                {/* Shares Input */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: colors.text,
                    marginBottom: 8
                  }}>
                    Number of Shares
                  </Text>
                  <TextInput
                    placeholder="0"
                    value={shares}
                    onChangeText={setShares}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 2,
                      borderColor: colors.border + '80',
                      borderRadius: 16,
                      padding: 16,
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text,
                      backgroundColor: colors.background,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    placeholderTextColor={colors.subtext}
                  />
                </View>

                {/* Price Input */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: colors.text,
                    marginBottom: 8
                  }}>
                    Price per Share
                  </Text>
                  <TextInput
                    placeholder="0.00"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 2,
                      borderColor: colors.border + '80',
                      borderRadius: 16,
                      padding: 16,
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text,
                      backgroundColor: colors.background,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    placeholderTextColor={colors.subtext}
                  />
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={{
                    backgroundColor: '#FEE2E2',
                    borderWidth: 1,
                    borderColor: '#FCA5A5',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    <Text style={{ 
                      color: '#DC2626', 
                      fontSize: 14, 
                      fontWeight: '600',
                      marginLeft: 8,
                      flex: 1
                    }}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 20,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: colors.border + '80',
                      backgroundColor: colors.background,
                      alignItems: 'center',
                    }}
                    disabled={saving}
                  >
                    <Text style={{ 
                      color: colors.text, 
                      fontWeight: '700', 
                      fontSize: 15 
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={saveTransaction}
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary,
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 20,
                      alignItems: 'center',
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                      elevation: 6,
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={{ 
                        color: colors.white, 
                        fontWeight: '700', 
                        fontSize: 15 
                      }}>
                        Save Transaction
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Cash Transactions Modal */}
      <Modal
        visible={cashModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCashModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ 
            flex: 1, 
            backgroundColor: colors.background,
            marginTop: 60,
            marginBottom: 0,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
          }}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <TouchableOpacity
                onPress={() => setCashModalVisible(false)}
                style={{
                  padding: 8,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={{
                fontSize: 24,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: -0.5,
              }}>
                Cash Transactions
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            >
              {/* Total Balance */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 24,
                padding: 24,
                marginBottom: 32,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 8,
                borderWidth: 1,
                borderColor: colors.border + '30',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.subtext,
                  marginBottom: 8,
                }}>
                  Total Cash Balance
                </Text>
                <Text style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: totalCashBalance >= 0 ? colors.text : '#EF4444',
                  letterSpacing: -1,
                }}>
                  ${Math.abs(totalCashBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Transactions List */}
              <View>
                <Text style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: 16,
                }}>
                  Recent Cash Transactions
                </Text>
                {cashTransactions.length === 0 ? (
                  <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    padding: 32,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: colors.border + '30',
                    borderStyle: 'dashed',
                  }}>
                    <Ionicons name="wallet-outline" size={48} color={colors.subtext} />
                    <Text style={{
                      color: colors.subtext,
                      fontSize: 16,
                      fontWeight: '600',
                      marginTop: 12,
                      textAlign: 'center',
                    }}>
                      No cash transactions yet
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {cashTransactions.slice().reverse().map((tx, idx) => (
                      <View key={cashTransactions.length - 1 - idx} style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 4,
                        borderWidth: 1,
                        borderColor: colors.border + '30',
                        borderLeftWidth: 4,
                        borderLeftColor: tx.type === 'DEPOSIT' ? '#10B981' : '#EF4444',
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: colors.text,
                            marginBottom: 4,
                          }}>
                            {tx.type}
                          </Text>
                          <Text style={{
                            fontSize: 14,
                            color: colors.subtext,
                            fontWeight: '500',
                          }}>
                            {tx.date}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                          <Text style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: tx.amount >= 0 ? '#10B981' : '#EF4444',
                          }}>
                            {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteCashTransaction(cashTransactions.length - 1 - idx)}
                          style={{
                            padding: 8,
                            borderRadius: 12,
                            backgroundColor: '#FEE2E2',
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Add Cash Form */}
              <View style={{ marginTop: 32 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: 16,
                }}>
                  Add Cash Transaction
                </Text>
                
                {/* Transaction Type */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 12,
                  }}>
                    Transaction Type
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: cashType === 'DEPOSIT' ? colors.primary : colors.background,
                        borderWidth: 2,
                        borderColor: cashType === 'DEPOSIT' ? colors.primary : colors.border + '80',
                        alignItems: 'center',
                      }}
                      onPress={() => setCashType('DEPOSIT')}
                    >
                      <Text style={{
                        color: cashType === 'DEPOSIT' ? colors.white : colors.text,
                        fontWeight: '700',
                        fontSize: 15,
                      }}>
                        Deposit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: cashType === 'WITHDRAWAL' ? colors.primary : colors.background,
                        borderWidth: 2,
                        borderColor: cashType === 'WITHDRAWAL' ? colors.primary : colors.border + '80',
                        alignItems: 'center',
                      }}
                      onPress={() => setCashType('WITHDRAWAL')}
                    >
                      <Text style={{
                        color: cashType === 'WITHDRAWAL' ? colors.white : colors.text,
                        fontWeight: '700',
                        fontSize: 15,
                      }}>
                        Withdrawal
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date Picker */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 12,
                  }}>
                    Transaction Date
                  </Text>
                  <View style={{
                    borderWidth: 2,
                    borderColor: colors.border + '80',
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }}>
                    <DatePicker
                      date={cashDate}
                      onChange={setCashDate}
                      backgroundColor={colors.background}
                      borderColor="transparent"
                    />
                  </View>
                </View>

                {/* Amount Input */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 12,
                  }}>
                    Amount
                  </Text>
                  <TextInput
                    placeholder="0.00"
                    value={cashAmount}
                    onChangeText={setCashAmount}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 2,
                      borderColor: colors.border + '80',
                      borderRadius: 16,
                      padding: 16,
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text,
                      backgroundColor: colors.background,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    placeholderTextColor={colors.subtext}
                  />
                </View>

                {/* Error Message */}
                {cashError && (
                  <View style={{
                    backgroundColor: '#FEE2E2',
                    borderWidth: 1,
                    borderColor: '#FCA5A5',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    <Text style={{
                      color: '#DC2626',
                      fontSize: 14,
                      fontWeight: '600',
                      marginLeft: 8,
                      flex: 1,
                    }}>
                      {cashError}
                    </Text>
                  </View>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  onPress={saveCashTransaction}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                  disabled={cashSaving}
                >
                  {cashSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={{
                      color: colors.white,
                      fontWeight: '700',
                      fontSize: 15,
                    }}>
                      Save Transaction
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}