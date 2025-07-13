import { usePathname, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

const FinanceNavBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', route: '/' },
    { name: 'Watchlist', route: '/watchlist' },
    { name: 'Stocks', route: '/stocks' }
  ];

  return (
    <View className="flex-row bg-gray-900 py-4 px-2 justify-around items-center border-t border-gray-700">
      {navItems.map((item, index) => {
        const isActive = pathname === item.route;
        
        return (
          <TouchableOpacity 
            key={index}
            className={`flex-1 items-center py-2 rounded-lg ${isActive ? 'bg-green-500/20' : ''}`}
            onPress={() => router.push(item.route)}
          >
            <Text className={`text-sm font-medium ${isActive ? 'text-green-400 font-semibold' : 'text-white'}`}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default FinanceNavBar;