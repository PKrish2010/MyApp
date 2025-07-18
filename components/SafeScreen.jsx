import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SafeScreen = ({ children, colors }) => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: colors.background }}>
      {children}
    </View>
  );
};

export default SafeScreen;
