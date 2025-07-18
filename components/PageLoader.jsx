import { ActivityIndicator, View } from "react-native";

const PageLoader = ({ colors }) => {
  return (
    <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};
export default PageLoader;
