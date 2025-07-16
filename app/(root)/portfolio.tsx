import { getColors } from '@/constants/colors';
import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

export default function PortfolioScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
      <Text style={[styles.subtitle, { color: colors.textLight }]}>
        Portfolio tracking coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 