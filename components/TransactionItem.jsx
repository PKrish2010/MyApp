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
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }} key={item.id}>
      <TouchableOpacity style={{ flex: 1, flexDirection: "row", padding: 15, alignItems: "center" }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}>
          <Ionicons name={iconName} size={22} color={isIncome ? colors.income : colors.expense} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text, marginBottom: 4 }}>{item.title}</Text>
          <Text style={{ fontSize: 14, color: colors.textLight }}>{item.category}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{ fontSize: 16, fontWeight: "600", marginBottom: 4, color: isIncome ? colors.income : colors.expense }}
          >
            {isIncome ? "+" : "-"}${Math.abs(parseFloat(item.amount)).toFixed(2)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textLight }}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={{ padding: 15, borderLeftWidth: 1, borderLeftColor: colors.border }} onPress={() => onDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color={colors.expense} />
      </TouchableOpacity>
    </View>
  );
};
