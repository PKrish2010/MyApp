import { Text, View } from "react-native";

export const BalanceCard = ({ summary, colors }) => {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    }}>
      <Text style={{ fontSize: 16, color: colors.textLight, marginBottom: 8 }}>Total Balance</Text>
      <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.text, marginBottom: 20 }}>${parseFloat(summary.balance).toFixed(2)}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: 4 }}>Income</Text>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.income }}>
            +${parseFloat(summary.income).toFixed(2)}
          </Text>
        </View>
        <View style={{ borderRightWidth: 1, borderColor: colors.border }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: 4 }}>Expenses</Text>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.expense }}>
            -${Math.abs(parseFloat(summary.expenses)).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};
