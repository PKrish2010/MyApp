import { SignOutButton } from "@/components/SignOutButton";
import { getColors } from "@/constants/colors";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { BalanceCard } from "../../components/BalanceCard";
import PageLoader from "../../components/PageLoader";
import { onHomeRefresh } from './portfolio';
import { fetchYahooQuote } from './watchlist';

// Modern gradient color palette
const modernColors = [
  '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', 
  '#F97316', '#84CC16', '#06B6D4', '#A855F7', '#14B8A6'
];

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

// Enhanced card component with better styling
const EnhancedCard = ({ 
  children, 
  onPress, 
  style = {}, 
  colors, 
  gradient = false 
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  colors: any;
  gradient?: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={0.95}
    onPress={onPress}
    className="rounded-2xl mb-4 shadow-lg"
    style={{
      backgroundColor: gradient ? colors.primary : colors.card,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      ...style,
    }}
  >
    {children}
  </TouchableOpacity>
);

// Market index mini card
const IndexCard = ({ index, colors }: { index: any; colors: any }) => {
  const isPositive = index.change > 0;
  const changeColor = isPositive ? '#10B981' : '#EF4444';
  
  return (
    <View className="flex-1 mr-3 last:mr-0">
      <View
        className="rounded-xl p-4"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: isPositive ? '#10B981' + '20' : '#EF4444' + '20',
        }}
      >
        <Text className="text-xs font-medium mb-1" style={{ color: colors.textLight }}>
          {index.name}
        </Text>
        <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
          ${index.price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </Text>
        <View className="flex-row items-center">
          <Ionicons
            name={isPositive ? "trending-up" : "trending-down"}
            size={12}
            color={changeColor}
          />
          <Text className="text-xs font-semibold ml-1" style={{ color: changeColor }}>
            {isPositive ? '+' : ''}{index.changePercent?.toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

// Enhanced holding card
const HoldingCard = ({ 
  holding, 
  livePrices, 
  colors, 
  onPress 
}: {
  holding: Holding;
  livePrices: { [ticker: string]: { price: number; previousClose: number } };
  colors: any;
  onPress: () => void;
}) => {
  let currentValue, gain, isPositive, dailyChange;
  
  if (holding.ticker === 'Cash') {
    currentValue = holding.totalShares;
    gain = 0;
    dailyChange = 0;
    isPositive = true;
  } else {
    const currentPrice = livePrices[holding.ticker]?.price ?? 0;
    const prevClose = livePrices[holding.ticker]?.previousClose ?? 0;
    currentValue = holding.totalShares * currentPrice;
    gain = (currentPrice - holding.avgBuyPrice) * holding.totalShares;
    dailyChange = (currentPrice - prevClose) * holding.totalShares;
    isPositive = gain >= 0;
  }
  
  const gainPercent = holding.ticker !== 'Cash' ? (gain / (holding.avgBuyPrice * holding.totalShares)) * 100 : 0;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="rounded-xl mb-3 p-4 shadow-sm"
      style={{
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: holding.ticker === 'Cash' ? colors.primary : (isPositive ? '#10B981' : '#EF4444'),
      }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-lg font-bold mr-2" style={{ color: colors.text }}>
              {holding.ticker}
            </Text>
            {holding.ticker !== 'Cash' && (
              <View
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: isPositive ? '#10B981' + '20' : '#EF4444' + '20' }}
              >
                <Text className="text-xs font-semibold" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                  {isPositive ? '+' : ''}{gainPercent.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
          
          {holding.ticker === 'Cash' ? (
            <Text className="text-sm" style={{ color: colors.textLight }}>
              Available Balance
            </Text>
          ) : (
            <Text className="text-sm" style={{ color: colors.textLight }}>
              {holding.totalShares.toLocaleString()} shares • Avg ${holding.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
        </View>
        
        <View className="items-end">
          <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {holding.ticker !== 'Cash' && (
            <>
              <Text className="text-sm font-semibold" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                {isPositive ? '+' : ''}${gain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              {Math.abs(dailyChange) > 0.01 && (
                <Text className="text-xs" style={{ color: dailyChange >= 0 ? '#10B981' : '#EF4444' }}>
                  Today: {dailyChange >= 0 ? '+' : ''}${dailyChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
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
  const [cashTransactions, setCashTransactions] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [livePrices, setLivePrices] = useState<{ [ticker: string]: { price: number; previousClose: number } }>({});
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  // Aggregate holdings from transactions (including cash)
  useEffect(() => {
    const aggregateHoldings = async () => {
      const map: { [ticker: string]: { totalShares: number; totalCost: number } } = {};
      for (const tx of transactions) {
        if (!map[tx.ticker]) {
          map[tx.ticker] = { totalShares: 0, totalCost: 0 };
        }
        map[tx.ticker].totalShares += tx.shares;
        map[tx.ticker].totalCost += tx.shares * tx.price;
      }
      
      // Add cash balance from cash transactions
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
      
      const holdingsData = Object.entries(map).map(([ticker, { totalShares, totalCost }]) => ({
        ticker,
        totalShares,
        avgBuyPrice: totalShares > 0 ? totalCost / totalShares : 0,
      }));
      setHoldings(holdingsData);
    };
    
    aggregateHoldings();
  }, [transactions, cashTransactions]);

  // Calculate portfolio totals
  const totalValue = holdings.reduce((sum, h) => {
    if (h.ticker === 'Cash') {
      return sum + h.totalShares;
    }
    const price = livePrices[h.ticker]?.price ?? 0;
    return sum + h.totalShares * price;
  }, 0);
  
  const totalGain = holdings.reduce((sum, h) => {
    if (h.ticker === 'Cash') {
      return sum;
    }
    const price = livePrices[h.ticker]?.price ?? 0;
    return sum + (price - h.avgBuyPrice) * h.totalShares;
  }, 0);
  
  const totalDailyGain = holdings.reduce((sum, h) => {
    if (h.ticker === 'Cash') {
      return sum;
    }
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
        
        const cashStored = await AsyncStorage.getItem('cash_transactions');
        if (cashStored) {
          setCashTransactions(JSON.parse(cashStored));
        }
      } catch (e) {
        console.error('Failed to load transactions:', e);
      }
    };
    loadTransactions();
  }, []);

  // Set portfolio loading to false if no holdings to fetch prices for
  useEffect(() => {
    if (holdings.length === 0) {
      setPortfolioLoading(false);
    }
  }, [holdings]);

  // Fetch live prices for holdings
  useEffect(() => {
    async function fetchPrices() {
      const prices: { [ticker: string]: { price: number; previousClose: number } } = {};
      for (const h of holdings) {
        if (h.ticker === 'Cash') continue; // Skip cash for price fetching
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
      setPortfolioLoading(false);
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
    const interval = setInterval(loadIndices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Listen for refresh events from portfolio page
  useEffect(() => {
    const sub = onHomeRefresh(() => {
      (async () => {
        const stored = await AsyncStorage.getItem('portfolio_transactions');
        if (stored) {
          const txs = JSON.parse(stored);
          setTransactions(txs);
          const map: Record<string, boolean> = {};
          for (const tx of txs) {
            if (!map[tx.ticker]) map[tx.ticker] = true;
          }
          const tickers = Object.keys(map);
          const prices: Record<string, { price: number; previousClose: number }> = {};
          for (const ticker of tickers) {
            try {
              const quote = await fetchYahooQuote(ticker);
              prices[ticker] = {
                price: quote.price,
                previousClose: quote.previousClose ?? quote.price,
              };
            } catch (e) {
              prices[ticker] = { price: 0, previousClose: 0 };
            }
          }
          setLivePrices(prices);
        }
        
        const cashStored = await AsyncStorage.getItem('cash_transactions');
        if (cashStored) {
          setCashTransactions(JSON.parse(cashStored));
        }
      })();
    });
    return () => { if (sub && sub.remove) sub.remove(); };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Reload all data
    try {
      const stored = await AsyncStorage.getItem('portfolio_transactions');
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
      const cashStored = await AsyncStorage.getItem('cash_transactions');
      if (cashStored) {
        setCashTransactions(JSON.parse(cashStored));
      }
      // Reload indices
      const syms = ['^GSPC', '^DJI', '^IXIC'];
      const results = await Promise.all(syms.map(fetchIndexQuote));
      setIndices(results);
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  };

  if (indicesLoading && !refreshing) return <PageLoader colors={colors} />;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View className="px-5 pt-5">
          {/* HEADER */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-1">
              <Text className="text-3xl font-bold mb-1" style={{ color: colors.text }}>
                Welcome back
              </Text>
              <Text className="text-base" style={{ color: colors.textLight }}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <SignOutButton colors={colors} />
          </View>

          {/* Portfolio Summary Card */}
          {portfolioLoading ? (
            <EnhancedCard
              colors={colors}
              style={{ marginBottom: 24 }}
            >
              <View className="p-6 items-center">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="text-base font-semibold mt-3" style={{ color: colors.text }}>
                  Loading portfolio data...
                </Text>
              </View>
            </EnhancedCard>
          ) : (
            <EnhancedCard
              onPress={() => router.push('/portfolio')}
              colors={colors}
              style={{ marginBottom: 24 }}
            >
              <BalanceCard 
                summary={{
                  balance: totalValue,
                  income: totalGain,
                  expense: totalDailyGain,
                }} 
                colors={colors} 
                label="Portfolio Value"
                incomeLabel="Total Gain/Loss"
                expenseLabel="Today's Change"
              />
            </EnhancedCard>
          )}

          {/* Market Indices */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                Market Overview
              </Text>
              <TouchableOpacity onPress={() => router.push('/watchlist')}>
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            
            {indicesLoading ? (
              <View className="rounded-xl p-4" style={{ backgroundColor: colors.card }}>
                <Text className="text-center" style={{ color: colors.textLight }}>Loading market data...</Text>
              </View>
            ) : indicesError ? (
              <View className="rounded-xl p-4" style={{ backgroundColor: colors.card }}>
                <Text className="text-center" style={{ color: '#EF4444' }}>Unable to load market data</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {indices.map(index => (
                    <IndexCard key={index.symbol} index={index} colors={colors} />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Portfolio Holdings Section - Streamlined Version */}
          {holdings.length > 0 && (
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold" style={{ color: colors.text }}>
                  Your Holdings
                </Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/portfolio', params: { scrollToHoldings: 1 } })}>
                  <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                    {holdings.length > 3 ? 'View all' : 'Manage'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {holdings.slice(0, 3).map((h) => (
                <HoldingCard
                  key={h.ticker}
                  holding={h}
                  livePrices={livePrices}
                  colors={colors}
                  onPress={() => h.ticker === 'Cash' ? router.push('/portfolio') : router.push(`/chart?symbol=${h.ticker}&from=home`)}
                />
              ))}
            </View>
          )}

          {/* Recent Transactions Section */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                Recent Transactions
              </Text>
              {transactions.length > 0 && (
                <TouchableOpacity onPress={() => router.push({ pathname: '/portfolio', params: { scrollToTransactions: 1 } })}>
                  <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                    View All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {transactions.length === 0 ? (
              <View className="rounded-2xl p-8 items-center" style={{ backgroundColor: colors.card }}>
                <Ionicons name="trending-up-outline" size={48} color={colors.primary} style={{ opacity: 0.6 }} />
                <Text className="text-lg font-semibold mt-3 mb-2" style={{ color: colors.text }}>
                  Start Investing
                </Text>
                <Text className="text-sm text-center mb-4" style={{ color: colors.textLight }}>
                  Add your first transaction to begin tracking your portfolio performance
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/portfolio')}
                  className="px-6 py-3 rounded-xl"
                  style={{ backgroundColor: colors.primary }}
                  activeOpacity={0.8}
                >
                  <Text className="text-base font-semibold" style={{ color: '#FFFFFF' }}>
                    Add Transaction
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {transactions.slice(0, 3).map((tx, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => router.push({ pathname: '/portfolio', params: { scrollToTransactions: 1 } })}
                    activeOpacity={0.9}
                    className="rounded-xl mb-3 p-4 shadow-sm"
                    style={{
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                          {tx.ticker}
                        </Text>
                        <Text className="text-sm" style={{ color: colors.textLight }}>
                          {tx.shares} shares • {tx.date}
                        </Text>
                        <Text className="text-xs" style={{ color: colors.textLight }}>
                          ${Number(tx.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per share
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-lg font-bold" style={{ color: colors.text }}>
                          ${(tx.shares * tx.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>

          {/* Quick Actions */}
          <View className="flex-row mb-6">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/invest')}
              className="flex-1 mr-3 rounded-2xl p-6 shadow-lg"
              style={{
                backgroundColor: colors.primary,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Ionicons name="trending-up" size={32} color="#FFFFFF" />
              <Text className="text-lg font-bold mt-2" style={{ color: '#FFFFFF' }}>
                Invest
              </Text>
              <Text className="text-sm opacity-90" style={{ color: '#FFFFFF' }}>
                Discover new opportunities
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/watchlist')}
              className="flex-1 rounded-2xl p-6 shadow-lg"
              style={{
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Ionicons name="eye-outline" size={32} color={colors.primary} />
              <Text className="text-lg font-bold mt-2" style={{ color: colors.text }}>
                Watchlist
              </Text>
              <Text className="text-sm" style={{ color: colors.textLight }}>
                Track market movements
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}