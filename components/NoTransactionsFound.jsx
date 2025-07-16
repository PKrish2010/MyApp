import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

const NoTransactionsFound = ({ colors }) => {
  const router = useRouter();

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 30,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }}>
      <Ionicons
        name="receipt-outline"
        size={60}
        color={colors.textLight}
        style={{ marginBottom: 16 }}
      />
      <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 8 }}>No transactions yet</Text>
      <Text style={{
        color: colors.textLight,
        fontSize: 14,
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 20,
      }}>
        Start tracking your finances by adding your first transaction
      </Text>
      <TouchableOpacity style={{
        backgroundColor: colors.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }} onPress={() => router.push("/create")}>
        <Ionicons name="add-circle" size={18} color={colors.white} />
        <Text style={{ color: colors.white, fontWeight: "600", marginLeft: 6 }}>Add Transaction</Text>
      </TouchableOpacity>
    </View>
  );
};
export default NoTransactionsFound;
