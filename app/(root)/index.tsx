import { SignOutButton } from "@/components/SignOutButton";
import { getColors } from "@/constants/colors";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { BalanceCard } from "../../components/BalanceCard";
import PageLoader from "../../components/PageLoader";
import { fetchYahooQuote } from './watchlist';

// Types for portfolio data
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

// Helper to fetch index quotes from Yahoo Finance
const fetchIndexQuote = async (symbol: string) => {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
    const data = await res.json();
    const quote = data.quoteResponse.result[0];
    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
    };
  } catch {
    return { symbol, name: symbol, price: 0, change: 0, changePercent: 0 };
  }
};

export default function Page() {
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  // State for major indices
  const [indices, setIndices] = useState([
    { symbol: '^GSPC', name: 'S&P 500', price: 0, change: 0, changePercent: 0 },
    { symbol: '^DJI', name: 'Dow Jones', price: 0, change: 0, changePercent: 0 },
    { symbol: '^IXIC', name: 'NASDAQ', price: 0, change: 0, changePercent: 0 },
  ]);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [indicesError, setIndicesError] = useState(false);

  // Portfolio state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [livePrices, setLivePrices] = useState<{ [ticker: string]: { price: number; previousClose: number } }>({});

  // Aggregate holdings from transactions
  const holdings = useMemo(() => {
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
  }, [transactions]);

  // Calculate portfolio totals
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

  // Load transactions from AsyncStorage
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const stored = await AsyncStorage.getItem('portfolio_transactions');
        if (stored) {
          setTransactions(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load transactions:', e);
      }
    };
    loadTransactions();
  }, []);

  // Fetch live prices for holdings
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

  useEffect(() => {
    async function loadIndices() {
      setIndicesLoading(true);
      setIndicesError(false);
      try {
        const syms = ['^GSPC', '^DJI', '^IXIC'];
        const results = await Promise.all(syms.map(fetchIndexQuote));
        setIndices(results);
      } catch (e) {
        setIndicesError(true);
        console.error('Failed to fetch indices:', e);
      } finally {
        setIndicesLoading(false);
      }
    }
    loadIndices();
    // Auto-refresh indices every 60 seconds
    const interval = setInterval(loadIndices, 60000);
    return () => clearInterval(interval);
  }, []);

  if (indicesLoading && !refreshing) return <PageLoader colors={colors} />;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="p-5 pb-0">
            {/* HEADER */}
            <View className="flex-row justify-between items-center mb-5 px-0 py-3">
              {/* LEFT */}
              <View className="flex-1 flex-row items-center">
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={{ width: 75, height: 75 }}
                  resizeMode="contain"
                />
                <View className="flex-1">
                  <Text style={{ color: colors.textLight }}>Welcome,</Text>
                  <Text className="text-base font-semibold" style={{ color: colors.text }}>
                    {user?.emailAddresses[0]?.emailAddress.split("@")[0]}
                  </Text>
                </View>
              </View>
              {/* RIGHT */}
              <View className="flex-row items-center gap-3">
                <SignOutButton colors={colors} />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/portfolio')}
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
            </TouchableOpacity>

            {/* Holdings Section */}
            {holdings.length > 0 && (
              <View className="mb-4">
                <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>Portfolio Holdings</Text>
                {holdings.slice(0, 3).map((h) => {
                  const currentPrice = livePrices[h.ticker]?.price ?? 0;
                  const currentValue = h.totalShares * currentPrice;
                  const gain = (currentPrice - h.avgBuyPrice) * h.totalShares;
                  const isPositive = gain >= 0;
                  
                  return (
                    <TouchableOpacity
                      key={h.ticker}
                      onPress={() => router.push(`/chart?symbol=${h.ticker}`)}
                      className="rounded-xl mb-2 p-4 shadow-sm"
                      style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="text-lg font-bold" style={{ color: colors.text }}>{h.ticker}</Text>
                          <Text className="text-sm" style={{ color: colors.textLight }}>
                            {h.totalShares} shares @ ${h.avgBuyPrice.toFixed(2)}
                          </Text>
                          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                            ${currentValue.toFixed(2)}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-lg font-bold" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                            {isPositive ? '+' : ''}${gain.toFixed(2)}
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {holdings.length > 3 && (
                  <TouchableOpacity
                    onPress={() => router.push('/portfolio')}
                    className="rounded-xl p-3 items-center"
                    style={{ backgroundColor: colors.card }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                      View all {holdings.length} holdings
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Stocks Section */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/watchlist')}
              className="rounded-2xl mb-4 shadow-md"
              style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}
            >
              <View className="p-5">
                <Text className="text-base mb-2 font-semibold" style={{ color: colors.text }}>
                  Stocks
                </Text>
                {indicesLoading ? (
                  <Text className="text-xs" style={{ color: colors.textLight }}>Loading indices...</Text>
                ) : indicesError ? (
                  <Text className="text-xs" style={{ color: '#EF4444' }}>Failed to load indices</Text>
                ) : indices.map(idx => {
                  const isPositive = idx.change > 0;
                  return (
                    <View key={idx.symbol} className="mb-2">
                      <Text className="text-xs font-semibold" style={{ color: colors.textLight }}>{idx.name}</Text>
                      <Text className="text-base font-bold" style={{ color: colors.text }}>${idx.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      <Text className="text-xs font-semibold mb-1" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>{isPositive ? '+' : ''}{idx.change?.toFixed(2)} ({isPositive ? '+' : ''}{idx.changePercent?.toFixed(2)}%)</Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>

            {/* Invest Section */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/invest')}
              className="rounded-2xl mb-4 shadow-md"
              style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}
            >
              <View className="p-5 items-center">
                <Text className="text-base mb-2 font-semibold" style={{ color: colors.text }}>
                  Invest
                </Text>
                <Ionicons name="trending-up-outline" size={32} color={colors.primary} />
              </View>
            </TouchableOpacity>

            {/* Recent Transactions Section */}
            <View className="mb-4">
              <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>Recent Transactions</Text>
              {transactions.length === 0 ? (
                <View className="rounded-xl p-4 items-center" style={{ backgroundColor: colors.card }}>
                  <Text className="text-sm" style={{ color: colors.textLight }}>No transactions yet</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/portfolio')}
                    className="mt-2 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: colors.primary }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm font-semibold" style={{ color: colors.text }}>Add Transaction</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {transactions.slice(0, 3).map((tx, idx) => (
                    <View key={idx} className="rounded-xl mb-2 p-4" style={{ backgroundColor: colors.card }}>
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="text-lg font-bold" style={{ color: colors.text }}>{tx.ticker}</Text>
                          <Text className="text-sm" style={{ color: colors.textLight }}>
                            {tx.date} • {tx.shares} shares @ ${tx.price.toFixed(2)}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                            ${(tx.shares * tx.price).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  {transactions.length > 3 && (
                    <TouchableOpacity
                      onPress={() => router.push('/portfolio')}
                      className="rounded-xl p-3 items-center"
                      style={{ backgroundColor: colors.card }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                        View all {transactions.length} transactions
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
      </ScrollView>
    </View>
  );
}
