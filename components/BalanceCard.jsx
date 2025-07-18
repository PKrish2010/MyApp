import { Text, View } from "react-native";

function formatMoney(value) {
  return typeof value === 'number'
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const BalanceCard = ({ summary, colors, label, incomeLabel = "Unrealized Gain/Loss", expenseLabel = "Day Change" }) => {
  // Fix daily gain color logic
  const dailyGain = parseFloat(summary.expense);
  const dailyGainColor = dailyGain > 0 ? colors.income : dailyGain < 0 ? colors.expense : colors.text;
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
        ${isNaN(parseFloat(summary.balance)) ? "0.00" : formatMoney(summary.balance)}
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
            {parseFloat(summary.income) > 0 ? '+' : parseFloat(summary.income) < 0 ? '-' : ''}${isNaN(parseFloat(summary.income)) ? "0.00" : formatMoney(Math.abs(parseFloat(summary.income)))}
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
            style={{ color: dailyGainColor }}
          >
            {dailyGain > 0 ? '+' : dailyGain < 0 ? '-' : ''}${isNaN(dailyGain) ? "0.00" : formatMoney(Math.abs(dailyGain))}
          </Text>
        </View>
      </View>
    </View>
  );
};
