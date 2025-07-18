import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { formatDate } from "../lib/utils";

// Map categories to their respective icons
const CATEGORY_ICONS = {
  "Food & Drinks": "fast-food",
  Shopping: "cart",
  Transportation: "car",
  Entertainment: "film",
  Bills: "receipt",
  Income: "cash",
  Other: "ellipsis-horizontal",
};

export const TransactionItem = ({ item, onDelete, colors }) => {
  const isIncome = parseFloat(item.amount) > 0;
  const iconName = CATEGORY_ICONS[item.category] || "pricetag-outline";

  return (
    <View
      className="rounded-xl mb-2.5 flex-row items-center shadow-md"
      style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}
      key={item.id}
    >
      <TouchableOpacity className="flex-1 flex-row p-4 items-center">
        <View
          className="w-10 h-10 rounded-full justify-center items-center mr-3"
          style={{ backgroundColor: colors.background }}
        >
          <Ionicons name={iconName} size={22} color={isIncome ? colors.income : colors.expense} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: colors.text }}>{item.category}</Text>
          <Text className="text-sm" style={{ color: colors.textLight }}>{item.note}</Text>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold" style={{ color: isIncome ? colors.income : colors.expense }}>
            {isIncome ? "+" : "-"}${Math.abs(parseFloat(item.amount)).toFixed(2)}
          </Text>
          <Text className="text-xs" style={{ color: colors.textLight }}>{formatDate(item.date)}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(item.id)} className="ml-3">
          <Ionicons name="trash-outline" size={20} color={colors.expense} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};
