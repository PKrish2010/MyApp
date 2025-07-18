import { getColors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'expo-datepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { BalanceCard } from '../../components/BalanceCard';
import { fetchYahooQuote } from './watchlist';

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

export default function PortfolioScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const router = useRouter();

  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [ticker, setTicker] = useState('');
  const [tickerInput, setTickerInput] = useState('');
  const [tickerResults, setTickerResults] = useState<TickerResult[]>([]);
  const [tickerLoading, setTickerLoading] = useState(false);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  // Change date state to string for expo-datepicker compatibility
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [livePrices, setLivePrices] = useState<{ [ticker: string]: { price: number; previousClose: number } }>({});

  // --- Holdings Aggregation ---
  function aggregateHoldings(transactions: Transaction[]): Holding[] {
    const map: { [ticker: string]: { totalShares: number; totalCost: number } } = {};
    for (const tx of transactions) {
      if (!map[tx.ticker]) {
        map[tx.ticker] = { totalShares: 0, totalCost: 0 };
      }
      map[tx.ticker].totalShares += tx.shares;
      map[tx.ticker].totalCost += tx.shares * tx.price;
    }
    return Object.entries(map).map(([ticker, { totalShares, totalCost }]) => ({
      ticker,
      totalShares,
      avgBuyPrice: totalShares > 0 ? totalCost / totalShares : 0,
    }));
  }

  // --- Calculate Holdings ---
  const holdings = useMemo(() => aggregateHoldings(transactions), [transactions]);

  // --- Calculate Portfolio Totals ---
  // Calculate total value, total gain, and total daily gain (placeholder for daily gain)
  const totalValue = holdings.reduce((sum, h) => {
    const price = livePrices[h.ticker]?.price ?? 0;
    return sum + h.totalShares * price;
  }, 0);
  const totalGain = holdings.reduce((sum, h) => {
    const price = livePrices[h.ticker]?.price ?? 0;
    return sum + (price - h.avgBuyPrice) * h.totalShares;
  }, 0);
  const totalDailyGain = holdings.reduce((sum, h) => {
    const price = livePrices[h.ticker]?.price ?? 0;
    const prevClose = livePrices[h.ticker]?.previousClose ?? 0;
    return sum + (price - prevClose) * h.totalShares;
  }, 0);

  // --- Fetch live prices for each holding ---
  useEffect(() => {
    async function fetchPrices() {
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
      setLivePrices(prices);
    }
    if (holdings.length > 0) fetchPrices();
  }, [holdings]);

  // --- Delete transaction handler ---
  function handleDeleteTransaction(index: number) {
    const updated = [...transactions];
    updated.splice(index, 1);
    setTransactions(updated);
    AsyncStorage.setItem('portfolio_transactions', JSON.stringify(updated));
  }

  // --- Modal state ---
  // REMOVE: const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Ticker search logic ---
  React.useEffect(() => {
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

  // --- Animated value for holdings card ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // --- Save transaction to AsyncStorage (fixed) ---
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
      setTransactions(arr); // <-- Update state immediately!
      setModalVisible(false);
      setTicker('');
      setTickerInput('');
      setTickerResults([]);
      setShares('');
      setPrice('');
      setDate(new Date().toISOString().slice(0, 10));
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

  // --- Holdings rendering ---
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="p-5">
          {/* Header row at the top */}
          <View className="flex-row items-center justify-between mb-5 px-0 py-3">
            <Text className="text-lg font-semibold">Portfolio</Text>
            <TouchableOpacity
              className="flex-row items-center rounded-full px-4 py-2"
              style={{ backgroundColor: colors.primary, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text className="font-semibold ml-1" style={{ color: colors.white }}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* --- Portfolio Summary Box --- */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              marginBottom: 8,
            }}
          >
            <BalanceCard
              summary={{
                balance: totalValue,
                income: totalGain,
                expense: totalDailyGain,
              }}
              colors={colors}
              label="My Holdings"
              incomeLabel="Total Gain"
              expenseLabel="Daily Gain"
            />
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
                Total Gain: <Text style={{ color: totalGain >= 0 ? '#10B981' : '#EF4444' }}>{totalGain >= 0 ? '+' : ''}${totalGain.toFixed(2)}</Text>
              </Text>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
                Daily Gain: <Text style={{ color: totalDailyGain >= 0 ? '#10B981' : '#EF4444' }}>{totalDailyGain >= 0 ? '+' : ''}${totalDailyGain.toFixed(2)}</Text>
              </Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '500', marginTop: 2 }}>
                Live Tracking
              </Text>
            </View>
          </Animated.View>

          {/* --- Holdings Block with Value and Gain/Loss --- */}
          <View style={{ marginBottom: 32, width: '100%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>
              Portfolio Holdings
            </Text>
            {holdings.length === 0 ? (
              <Text style={{ color: colors.subtext }}>No holdings yet.</Text>
            ) : (
              holdings.map((h, idx) => {
                const currentPrice = livePrices[h.ticker]?.price ?? 0;
                const previousClose = livePrices[h.ticker]?.previousClose ?? 0;
                const currentValue = h.totalShares * currentPrice;
                const gain = (currentPrice - h.avgBuyPrice) * h.totalShares;
                const dailyGain = (currentPrice - previousClose) * h.totalShares;
                return (
                  <View key={h.ticker} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{h.ticker}</Text>
                    <Text style={{ color: colors.subtext }}>
                      Shares: {h.totalShares} | Avg Buy Price: ${h.avgBuyPrice.toFixed(2)} | Current Price: ${currentPrice.toFixed(2)}
                    </Text>
                    <Text style={{ color: colors.text }}>
                      Value: ${currentValue.toFixed(2)} | Gain/Loss: <Text style={{ color: gain >= 0 ? '#10B981' : '#EF4444' }}>{gain >= 0 ? '+' : ''}${gain.toFixed(2)}</Text>
                    </Text>
                    <Text style={{ color: dailyGain >= 0 ? '#10B981' : '#EF4444', fontWeight: '600' }}>
                      Daily Gain: {dailyGain >= 0 ? '+' : ''}${dailyGain.toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* --- Transaction List with Delete Button --- */}
          <View style={{ marginTop: 0, width: '100%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              Transactions
            </Text>
            {transactions.length === 0 ? (
              <Text style={{ color: colors.subtext }}>No transactions yet.</Text>
            ) : (
              transactions.map((tx, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{tx.ticker}</Text>
                    <Text style={{ color: colors.subtext }}>
                      Date: {tx.date} | Shares: {tx.shares} | Price: ${tx.price}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteTransaction(idx)}
                    style={{ marginLeft: 12, padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.card || '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: colors.text }}>Add Transaction</Text>
            {/* Ticker Search Autocomplete */}
            <View style={{ marginBottom: 12 }}>
              <TextInput
                placeholder="Search ticker (e.g. AAPL, BTC-USD)"
                value={tickerInput}
                onChangeText={text => {
                  setTickerInput(text);
                  setTicker('');
                }}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text }}
                autoCapitalize="characters"
                placeholderTextColor={colors.subtext}
                onFocus={() => tickerInput.length > 0 && setShowTickerDropdown(true)}
              />
              {tickerLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />}
              {showTickerDropdown && tickerResults.length > 0 && (
                <ScrollView style={{ maxHeight: 180, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginTop: 4 }}>
                  {tickerResults.map((result: TickerResult, idx: number) => (
                    <TouchableOpacity
                      key={result.symbol + idx}
                      onPress={() => {
                        if (tickerInput !== result.symbol) {
                          setTickerInput(result.symbol);
                        } else {
                          setTicker(result.symbol);
                          setShowTickerDropdown(false);
                        }
                      }}
                      style={{ padding: 12, borderBottomWidth: idx < tickerResults.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '600' }}>{result.symbol}</Text>
                      <Text style={{ color: colors.subtext, fontSize: 12 }}>{result.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            {/* Date Picker (expo-datepicker) */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.subtext, marginBottom: 4 }}>Date</Text>
              <DatePicker
                date={date}
                onChange={setDate}
                backgroundColor={colors.card}
                borderColor={colors.border}
              />
            </View>
            <TextInput
              placeholder="Shares"
              value={shares}
              onChangeText={setShares}
              keyboardType="numeric"
              style={{ 
                borderWidth: 1, 
                borderColor: colors.border, 
                borderRadius: 12, 
                padding: 12, 
                marginBottom: 16, 
                color: colors.text,
                fontSize: 16,
                fontWeight: '500',
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}
              placeholderTextColor={colors.subtext}
            />
            <TextInput
              placeholder="Price per share"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={{ 
                borderWidth: 1, 
                borderColor: colors.border, 
                borderRadius: 12, 
                padding: 12, 
                marginBottom: 16, 
                color: colors.text,
                fontSize: 16,
                fontWeight: '500',
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}
              placeholderTextColor={colors.subtext}
            />
            {error ? (
              <View style={{ 
                backgroundColor: '#FEE2E2', 
                borderWidth: 1, 
                borderColor: '#FCA5A5', 
                borderRadius: 8, 
                padding: 12, 
                marginBottom: 16 
              }}>
                <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '500' }}>{error}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ 
                  paddingVertical: 12, 
                  paddingHorizontal: 20,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card
                }}
                disabled={saving}
              >
                <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveTransaction}
                style={{ 
                  backgroundColor: colors.primary, 
                  borderRadius: 10, 
                  paddingVertical: 12, 
                  paddingHorizontal: 24,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4
                }}
                disabled={saving}
              >
                <Text style={{ color: colors.white, fontWeight: '600', fontSize: 16 }}>
                  {saving ? 'Saving...' : 'Save Transaction'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 