import { ScrollView, Text, View } from 'react-native';
import { styles } from '../../assets/styles/home.styles'; // Reuse existing styles or create new ones

export default function WatchlistPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Watchlist</Text>
        </View>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
          <Text style={{ fontSize: 18, color: '#666' }}>Your watchlist is empty</Text>
          <Text style={{ fontSize: 14, color: '#999', marginTop: 8 }}>
            Add stocks to track their performance
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}