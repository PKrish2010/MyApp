import { getColors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'expo-datepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useColorScheme, View } from 'react-native';

type CashTransaction = {
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
};

// Simple callback system for refreshing home page
const homeRefreshCallbacks: Array<() => void> = [];
export function triggerHomeRefresh() {
  homeRefreshCallbacks.forEach(cb => cb());
}

export default function CashTransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const router = useRouter();

  // State
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      const data = await AsyncStorage.getItem('cash_transactions');
      if (data) setTransactions(JSON.parse(data));
    };
    loadTransactions();
  }, []);

  // Animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Save transaction
  const saveTransaction = async () => {
    setError('');
    if (!amount) {
      setError('Amount is required.');
      return;
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    setSaving(true);
    try {
      const tx: CashTransaction = {
        date,
        amount: Number(amount) * (transactionType === 'WITHDRAWAL' ? -1 : 1),
        type: transactionType,
      };
      const existing = await AsyncStorage.getItem('cash_transactions');
      let arr = [];
      if (existing) arr = JSON.parse(existing);
      arr.push(tx);
      await AsyncStorage.setItem('cash_transactions', JSON.stringify(arr));
      setTransactions(arr);
      setModalVisible(false);
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setTransactionType('DEPOSIT');
      triggerHomeRefresh();
    } catch (e) {
      setError('Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = (index: number) => {
    const updated = [...transactions];
    updated.splice(index, 1);
    setTransactions(updated);
    AsyncStorage.setItem('cash_transactions', JSON.stringify(updated));
    triggerHomeRefresh();
  };

  // Calculate total cash balance
  const totalBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Modal animation
  useEffect(() => {
    if (modalVisible) {
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      modalScaleAnim.setValue(0.95);
    }
  }, [modalVisible]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      >
        {/* Header */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                padding: 8,
                borderRadius: 12,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{
              fontSize: 32,
              fontWeight: '800',
              color: colors.text,
              letterSpacing: -0.5,
            }}>
              Cash Transactions
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={{
                color: colors.white,
                fontWeight: '700',
                fontSize: 14,
                marginLeft: 4,
              }}>
                Add Cash
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Total Balance */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            marginBottom: 32,
          }}
        >
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 24,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
            borderWidth: 1,
            borderColor: colors.border + '30',
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.subtext,
              marginBottom: 8,
            }}>
              Total Cash Balance
            </Text>
            <Text style={{
              fontSize: 36,
              fontWeight: '800',
              color: totalBalance >= 0 ? colors.text : '#EF4444',
              letterSpacing: -1,
            }}>
              ${Math.abs(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </Animated.View>

        {/* Transactions List */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{
            fontSize: 22,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 16,
          }}>
            Recent Cash Transactions
          </Text>
          {transactions.length === 0 ? (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 32,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: colors.border + '30',
              borderStyle: 'dashed',
            }}>
              <Ionicons name="wallet-outline" size={48} color={colors.subtext} />
              <Text style={{
                color: colors.subtext,
                fontSize: 16,
                fontWeight: '600',
                marginTop: 12,
                textAlign: 'center',
              }}>
                No cash transactions yet
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {transactions.slice().reverse().map((tx, idx) => (
                <View key={transactions.length - 1 - idx} style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                  borderWidth: 1,
                  borderColor: colors.border + '30',
                  borderLeftWidth: 4,
                  borderLeftColor: tx.type === 'DEPOSIT' ? '#10B981' : '#EF4444',
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: colors.text,
                      marginBottom: 4,
                    }}>
                      {tx.type}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: colors.subtext,
                      fontWeight: '500',
                    }}>
                      {tx.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: tx.amount >= 0 ? '#10B981' : '#EF4444',
                    }}>
                      {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteTransaction(transactions.length - 1 - idx)}
                    style={{
                      padding: 8,
                      borderRadius: 12,
                      backgroundColor: '#FEE2E2',
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Cash Transaction Modal */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}>
            <Animated.View
              style={{
                transform: [{ scale: modalScaleAnim }],
                backgroundColor: colors.card,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingHorizontal: 24,
                paddingTop: 32,
                paddingBottom: 40,
                maxHeight: '80%',
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.2,
                shadowRadius: 24,
                elevation: 16,
              }}
            >
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 24,
              }} />
              <Text style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.text,
                textAlign: 'center',
                marginBottom: 24,
                letterSpacing: -0.5,
              }}>
                Add Cash Transaction
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Transaction Type */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 12,
                  }}>
                    Transaction Type
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor: transactionType === 'DEPOSIT' ? colors.primary : colors.background,
                        borderWidth: 2,
                        borderColor: transactionType === 'DEPOSIT' ? colors.primary : colors.border + '80',
                        alignItems: 'center',
                      }}
                      onPress={() => setTransactionType('DEPOSIT')}
                    >
                      <Text style={{
                        color: transactionType === 'DEPOSIT' ? colors.white : colors.text,
                        fontWeight: '700',
                        fontSize: 16,
                      }}>
                        Deposit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor: transactionType === 'WITHDRAWAL' ? colors.primary : colors.background,
                        borderWidth: 2,
                        borderColor: transactionType === 'WITHDRAWAL' ? colors.primary : colors.border + '80',
                        alignItems: 'center',
                      }}
                      onPress={() => setTransactionType('WITHDRAWAL')}
                    >
                      <Text style={{
                        color: transactionType === 'WITHDRAWAL' ? colors.white : colors.text,
                        fontWeight: '700',
                        fontSize: 16,
                      }}>
                        Withdrawal
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date Picker */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 12,
                  }}>
                    Transaction Date
                  </Text>
                  <View style={{
                    borderWidth: 2,
                    borderColor: colors.border + '80',
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }}>
                    <DatePicker
                      date={date}
                      onChange={setDate}
                      backgroundColor={colors.background}
                      borderColor="transparent"
                    />
                  </View>
                </View>

                {/* Amount Input */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 12,
                  }}>
                    Amount
                  </Text>
                  <TextInput
                    placeholder="0.00"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 2,
                      borderColor: colors.border + '80',
                      borderRadius: 16,
                      padding: 16,
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text,
                      backgroundColor: colors.background,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    placeholderTextColor={colors.subtext}
                  />
                </View>

                {/* Error Message */}
                {error && (
                  <View style={{
                    backgroundColor: '#FEE2E2',
                    borderWidth: 1,
                    borderColor: '#FCA5A5',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    <Text style={{
                      color: '#DC2626',
                      fontSize: 14,
                      fontWeight: '600',
                      marginLeft: 8,
                      flex: 1,
                    }}>
                      {error}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: colors.border + '80',
                      backgroundColor: colors.background,
                      alignItems: 'center',
                    }}
                    disabled={saving}
                  >
                    <Text style={{
                      color: colors.text,
                      fontWeight: '700',
                      fontSize: 16,
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveTransaction}
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary,
                      borderRadius: 16,
                      paddingVertical: 16,
                      alignItems: 'center',
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                      elevation: 8,
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={{
                        color: colors.white,
                        fontWeight: '700',
                        fontSize: 16,
                      }}>
                        Save Transaction
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
} 