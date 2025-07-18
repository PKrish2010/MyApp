import { getColors } from "@/constants/colors";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Text, View, useColorScheme } from "react-native";

export default function Layout() {
  const { isSignedIn, isLoaded } = useUser();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

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
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
          tabBarBackground: () => (
            <View style={{ flex: 1, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }} />
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
                    <Ionicons name="home-outline" size={22} color={focused ? colors.primary : colors.textLight} />
                    <Text style={{ color: focused ? colors.primary : colors.textLight, fontSize: 12, marginTop: 5 }}>Home</Text>
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
                    <Ionicons name="watch-outline" size={22} color={focused ? colors.primary : colors.textLight} />
                    <Text style={{ color: focused ? colors.primary : colors.textLight, fontSize: 12, marginTop: 5 }}>Watchlist</Text>
                  </View>
                )
              }}
            />
            <Tabs.Screen 
              name="portfolio"
              options={{
                title: "Portfolio",
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                  <View className="items-center justify-center w-[180%] mt-5 h-[80%]">
                    <Ionicons name="pie-chart-outline" size={22} color={focused ? colors.primary : colors.textLight} />
                    <Text style={{ color: focused ? colors.primary : colors.textLight, fontSize: 12, marginTop: 5 }}>Portfolio</Text>
                  </View>
                )
              }}
            />
            <Tabs.Screen 
              name="invest"
              options={{
                title: "Invest",
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                  <View className="items-center justify-center w-[180%] mt-5 h-[80%]">
                    <Ionicons name="trending-up-outline" size={22} color={focused ? colors.primary : colors.textLight} />
                    <Text style={{ color: focused ? colors.primary : colors.textLight, fontSize: 12, marginTop: 5 }}>Invest</Text>
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
