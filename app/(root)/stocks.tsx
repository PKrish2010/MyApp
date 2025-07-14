import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { fetchStockQuote } from '../../lib/api/finnhub';

const watchlist = ['AAPL', 'MSFT', 'GOOGL']; // You can expand this

export default function WatchlistPage() {
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const data: Record<string, any> = {};
        for (const symbol of watchlist) {
          data[symbol] = await fetchStockQuote(symbol);
        }
        setQuotes(data);
      } catch (err) {
        console.error('Failed to load quotes', err);
      } finally {
        setLoading(false);
      }
    };

    loadQuotes();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#E1F5FE]">
        <ActivityIndicator size="large" color="#0288D1" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#E1F5FE]">
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-black mb-6">Watchlist</Text>

        {Object.entries(quotes).map(([symbol, quote]) => (
          <View key={symbol} className="bg-white rounded-xl p-4 mb-4 shadow">
            <Text className="text-xl font-semibold text-black">{symbol}</Text>
            <Text className="text-gray-800">Current Price: ${quote.c}</Text>
            <Text className="text-gray-600">High: ${quote.h}  |  Low: ${quote.l}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
