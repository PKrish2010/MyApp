import SafeScreen from "@/components/SafeScreen";
import { getColors } from "@/constants/colors";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, View } from "react-native";
import './globals.css';

export default function RootLayout() {
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  const hideNavOn = ["/sign-in", "/sign-up"];
  const showNav = !hideNavOn.includes(pathname);

  return (
    <ClerkProvider tokenCache={tokenCache}>
      <SafeScreen colors={colors}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Content takes flex 1 to fill the screen */}
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
          {/* Nav bar stays fixed at bottom */}
          {/* {true && <FinanceNavBar />} */}
        </View>
      </SafeScreen>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ClerkProvider>
  );
}

