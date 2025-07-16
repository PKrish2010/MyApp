import { SignOutButton } from "@/components/SignOutButton";
import { getColors } from "@/constants/colors";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Image, RefreshControl, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { BalanceCard } from "../../components/BalanceCard";
import NoTransactionsFound from "../../components/NoTransactionsFound";
import PageLoader from "../../components/PageLoader";
import { TransactionItem } from "../../components/TransactionItem";
import { useTransactions } from "../../hooks/useTransactions";

export default function Page() {
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  const { transactions, summary, isLoading, loadData, deleteTransaction } = useTransactions(
    user?.id
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = (id: any) => {
    Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTransaction(id) },
    ]);
  };

  if (isLoading && !refreshing) return <PageLoader colors={colors} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        {/* HEADER */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingHorizontal: 0, paddingVertical: 12 }}>
          {/* LEFT */}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 75, height: 75 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textLight }}>Welcome,</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
                {user?.emailAddresses[0]?.emailAddress.split("@")[0]}
              </Text>
            </View>
          </View>
          {/* RIGHT */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity 
              style={{ 
                backgroundColor: colors.primary, 
                paddingHorizontal: 16, 
                paddingVertical: 10, 
                borderRadius: 24, 
                flexDirection: "row", 
                alignItems: "center",
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }} 
              onPress={() => router.push("/create")}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={{ color: colors.white, fontWeight: "600", marginLeft: 4 }}>Add</Text>
            </TouchableOpacity>
            <SignOutButton colors={colors} />
          </View>
        </View>

        <BalanceCard summary={summary} colors={colors} />

        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>Recent Transactions</Text>
        </View>
      </View>

      {/* FlatList is a performant way to render long lists in React Native. */}
      {/* it renders items lazily — only those on the screen. */}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        data={transactions}
        renderItem={({ item }) => <TransactionItem item={item} onDelete={handleDelete} colors={colors} />}
        ListEmptyComponent={<NoTransactionsFound colors={colors} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}
