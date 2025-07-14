import SafeScreen from "@/components/SafeScreen";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import './globals.css';

export default function RootLayout() {
  const pathname = usePathname();

  const hideNavOn = ["/sign-in", "/sign-up"];
  const showNav = !hideNavOn.includes(pathname);

  return (
    <ClerkProvider tokenCache={tokenCache}>
      <SafeScreen>
        <View style={{ flex: 1 }}>
          {/* Content takes flex 1 to fill the screen */}
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
          {/* Nav bar stays fixed at bottom */}
          {/* {true && <FinanceNavBar />} */}
        </View>
      </SafeScreen>
      <StatusBar style="dark" />
    </ClerkProvider>
  );
}

