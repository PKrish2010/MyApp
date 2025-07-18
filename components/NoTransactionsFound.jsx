import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

const NoTransactionsFound = ({ colors }) => {
  const router = useRouter();

  return (
    <View className="rounded-2xl p-8 items-center justify-center mt-2.5 mb-8 shadow-md" style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}>
      <Ionicons
        name="receipt-outline"
        size={60}
        color={colors.textLight}
        className="mb-4"
      />
      <Text className="text-lg font-semibold mb-2" style={{ color: colors.text }}>No transactions yet</Text>
      <Text className="text-sm text-center" style={{ color: colors.textLight }}>Add your first transaction to get started!</Text>
      {/* Optionally, add a button to add a transaction */}
    </View>
  );
};
export default NoTransactionsFound;
