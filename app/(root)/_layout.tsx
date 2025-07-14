import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";

export default function Layout() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return (
    <View style={{ flex: 1 }}>
      {/* <Stack screenOptions={{ headerShown: false }} /> */}
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarItemStyle: {
            flex: 1,
          },
          tabBarStyle: {
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 8,
            position: 'absolute',
          },
          tabBarBackground: () => (
            <View className="flex-1 bg-white border-t border-gray-200 dark:border-transparent" />
          ),
        }}
      >
            <Tabs.Screen 
              name="index"
              options={{
                title: "Home",
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                  <View className="items-center justify-center w-[180%] mt-5 h-[80%]">
                    <Ionicons name="home-outline" size={22} color={focused ? '#2A52BE' : '#A8B5DB'} />
                    <Text style={{ color: focused ? '#2A52BE' : '#A8B5DB', fontSize: 12, marginTop: 5 }}>Home</Text>
                  </View>
                )
              }}
            />
            <Tabs.Screen 
              name="stocks"
              options={{
                title: "Stocks",
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                  <View className="items-center justify-center w-[180%] mt-5 h-[80%]">
                    <Ionicons name="cellular-outline" size={22} color={focused ? '#2A52BE' : '#A8B5DB'} />
                    <Text style={{ color: focused ? '#2A52BE' : '#A8B5DB', fontSize: 12, marginTop: 5 }}>Stocks</Text>
                  </View>
                )
              }}
            />
            <Tabs.Screen 
              name="watchlist"
              options={{
                title: "Watchlist",
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                  <View className="items-center justify-center w-[240%] mt-5 h-[80%]">
                    <Ionicons name="watch-outline" size={22} color={focused ? '#2A52BE' : '#A8B5DB'} />
                    <Text style={{ color: focused ? '#2A52BE' : '#A8B5DB', fontSize: 12, marginTop: 5 }}>Watchlist</Text>
                  </View>
                )
              }}
            />
            
            {/* <Tabs.Screen 
              name="create"
              options={{
                title: "Stocks",
                headerShown: false,
                tabBarButton: () => null,
                tabBarStyle: { display: 'none' }
              }}
            /> */}
            
            </Tabs>
    </View>
  );
}
