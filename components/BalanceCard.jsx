import { Text, View } from "react-native";

export const BalanceCard = ({ summary, colors, label, incomeLabel = "Income", expenseLabel = "Expenses" }) => {
  return (
    <View className="rounded-2xl p-5 mb-5 shadow-md" style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}>
      <Text
        className="text-base mb-2"
        style={{ color: colors.textLight }}
      >
        {label || 'Total Balance'}
      </Text>
      <Text
        className="text-3xl font-bold mb-5"
        style={{ color: colors.text }}
      >
        ${isNaN(parseFloat(summary.balance)) ? "0.00" : parseFloat(summary.balance).toFixed(2)}
      </Text>
      <View className="flex-row justify-between">
        <View className="flex-1 items-center">
          <Text
            className="text-sm mb-1"
            style={{ color: colors.textLight }}
          >
            {incomeLabel}
          </Text>
          <Text
            className="text-lg font-semibold"
            style={{ color: colors.income }}
          >
            +${isNaN(parseFloat(summary.income)) ? "0.00" : parseFloat(summary.income).toFixed(2)}
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text
            className="text-sm mb-1"
            style={{ color: colors.textLight }}
          >
            {expenseLabel}
          </Text>
          <Text
            className="text-lg font-semibold"
            style={{ color: colors.expense }}
          >
            -${isNaN(parseFloat(summary.expense)) ? "0.00" : parseFloat(summary.expense).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};
