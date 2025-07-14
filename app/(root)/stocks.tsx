import { ScrollView, Text, View } from 'react-native';

export default function WatchlistPage() {
  return (
    <ScrollView className="flex-1 bg-[#E1F5FE]">
      <View className="px-4 py-6">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-black">Watchlist</Text>
        </View>

        <View className="flex-1 items-center justify-center pt-24">
          <Text className="text-lg text-gray-600">Your watchlist is empty</Text>
          <Text className="text-sm text-gray-500 mt-2">
            Add stocks to track their performance
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
