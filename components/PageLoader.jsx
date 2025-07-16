import { ActivityIndicator, View } from "react-native";

const PageLoader = ({ colors }) => {
  return (
    <View style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};
export default PageLoader;
