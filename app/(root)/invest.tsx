import { getColors } from '@/constants/colors';
import React from 'react';
import { Text, useColorScheme, View } from 'react-native';

export default function InvestScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  return (
    <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: colors.background }}>
      <Text className="text-3xl font-bold mb-4" style={{ color: colors.text }}>Invest</Text>
      <Text className="text-base text-center" style={{ color: colors.textLight }}>
        Investment features coming soon
      </Text>
    </View>
  );
} 