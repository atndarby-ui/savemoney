import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    Image,
    Dimensions,
    Alert,
    Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Transaction, Category } from '../types';

interface AddTransactionScreenProps {
    navigation: any;
    route: any;
    categories: Category[];
    onAddCategory: (cat: Category) => void;
    onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
    onUpdateTransaction: (tx: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
}

const { width } = Dimensions.get('window');

const COLOR_PALETTE = [
    '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'
];

const EMOJI_LIST = ['🎁', '🛒', '🎮', '🏠', '👔', '💡', '🧪', '📱', '🚕', '🍔', '🎨', '✈️'];

export default function AddTransactionScreen({
    navigation,
    route,
    categories: allCategories,
    onAddCategory,
    onAddTransaction,
    onUpdateTransaction,
    onDeleteTransaction
}: AddTransactionScreenProps) {
    const insets = useSafeAreaInsets();
    const { initialData } = route.params || {};

    const [isAddCategoryModalVisible, setIsAddCategoryModalVisible] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState(EMOJI_LIST[0]);
    const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[0]);

    const formatNumber = (num: number | string) => {
        if (!num && num !== 0) return '';
        const cleanNumber = num.toString().replace(/[^0-9]/g, '');
        if (cleanNumber === '') return '';
        return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
    const [amount, setAmount] = useState(initialData?.amount !== undefined ? formatNumber(initialData.amount) : '');
    const [note, setNote] = useState(initialData?.note || '');
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date) : new Date());
    const [selectedCategory, setSelectedCategory] = useState(initialData?.categoryId || initialData?.category || null);
    const [imageUri, setImageUri] = useState(initialData?.imageUri || null);

    const [showDatePicker, setShowDatePicker] = useState(false);

    // Filter categories based on type
    const categories = allCategories.filter(c => c.type === type);

    const handleCreateCategory = () => {
        if (!newCatName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên hạng mục');
            return;
        }

        const newCat: Category = {
            id: Math.random().toString(36).substr(2, 9),
            name: newCatName,
            icon: newCatIcon,
            type: type,
            color: newCatColor
        };

        onAddCategory(newCat);
        setSelectedCategory(newCat.id);
        setIsAddCategoryModalVisible(false);
        setNewCatName('');
    };

    // Sync state if initialData changes (e.g. from SmartInput)
    React.useEffect(() => {
        if (initialData) {
            if (initialData.type) setType(initialData.type);
            if (initialData.amount !== undefined) setAmount(formatNumber(initialData.amount));
            if (initialData.note) setNote(initialData.note);
            if (initialData.date) setDate(new Date(initialData.date));
            if (initialData.categoryId || initialData.category) setSelectedCategory(initialData.categoryId || initialData.category);
            if (initialData.imageUri) setImageUri(initialData.imageUri);
        }
    }, [initialData]);

    const handleSave = () => {
        const cleanAmount = amount.replace(/[.,]/g, '');
        if (!cleanAmount || isNaN(Number(cleanAmount))) {
            Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
            return;
        }
        if (!selectedCategory) {
            Alert.alert('Lỗi', 'Vui lòng chọn hạng mục');
            return;
        }

        if (initialData?.id) {
            // Update mode
            const updatedTx: Transaction = {
                id: initialData.id,
                amount: Number(cleanAmount),
                type,
                categoryId: selectedCategory,
                date: date,
                note: note,
                imageUri: imageUri,
            };
            onUpdateTransaction(updatedTx);
            Alert.alert('Thành công', 'Đã cập nhật giao dịch');
            navigation.navigate('MainTabs', { screen: 'Calendar' });
            return;
        }

        const newTx: Omit<Transaction, 'id'> = {
            amount: Number(cleanAmount),
            type,
            categoryId: selectedCategory,
            date: date,
            note: note,
            imageUri: imageUri,
        };

        if (onAddTransaction) {
            onAddTransaction(newTx);
            Alert.alert('Thành công', 'Đã lưu giao dịch');
            navigation.navigate('MainTabs', { screen: 'Calendar' });
        } else {
            console.warn("No onAddTransaction handler found");
            navigation.goBack();
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa giao dịch này không?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => {
                        onDeleteTransaction(initialData.id);
                        navigation.navigate('MainTabs', { screen: 'Calendar' });
                    }
                },
            ]
        );
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={() => navigation.goBack()}
            />
            <View style={styles.sheet}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.inner}>
                            <View style={styles.sheetHandleContainer}>
                                <View style={styles.sheetHandle} />
                            </View>

                            <View style={styles.header}>
                                <TouchableOpacity onPress={() => navigation.goBack()}>
                                    <Text style={styles.cancelText}>Hủy</Text>
                                </TouchableOpacity>
                                <View style={styles.headerTitleRow}>
                                    <Ionicons name="sparkles" size={20} color="#6366F1" style={{ marginRight: 6 }} />
                                    <Text style={styles.headerTitle}>Chi tiết</Text>
                                </View>
                                <TouchableOpacity disabled style={{ opacity: 0 }}>
                                    <View style={{ width: 30 }} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.toggleContainer}>
                                    <TouchableOpacity
                                        style={[styles.toggleButton, type === 'income' && styles.toggleActive]}
                                        onPress={() => setType('income')}
                                    >
                                        <Text style={[styles.toggleText, type === 'income' && { color: '#10B981' }]}>Thu nhập</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleButton, type === 'expense' && styles.toggleActive]}
                                        onPress={() => setType('expense')}
                                    >
                                        <Text style={[styles.toggleText, type === 'expense' && { color: '#EF4444' }]}>Chi tiêu</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.amountContainer}>
                                    <Text style={styles.amountLabel}>SỐ TIỀN</Text>
                                    <View style={styles.amountInputRow}>
                                        <Text style={styles.currencySymbol}>₫</Text>
                                        <TextInput
                                            style={styles.amountInput}
                                            value={amount}
                                            onChangeText={(text) => setAmount(formatNumber(text))}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            placeholderTextColor="#E5E7EB"
                                            autoFocus={!initialData}
                                        />
                                    </View>
                                </View>

                                {imageUri && (
                                    <View style={styles.imagePreviewContainer}>
                                        <Image source={{ uri: imageUri }} style={styles.receiptPreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageBtn}
                                            onPress={() => setImageUri(null)}
                                        >
                                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={styles.row}>
                                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                                        <Ionicons name="calendar" size={20} color="#6366F1" />
                                        <Text style={styles.dateText}>
                                            {date.toLocaleDateString('vi-VN')}
                                        </Text>
                                        <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={date}
                                            mode="date"
                                            display="default"
                                            onChange={onDateChange}
                                        />
                                    )}

                                    <View style={styles.noteContainer}>
                                        <Ionicons name="document-text" size={20} color="#9CA3AF" />
                                        <TextInput
                                            style={styles.noteInput}
                                            placeholder="Ghi chú..."
                                            value={note}
                                            onChangeText={setNote}
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    </View>
                                </View>

                                <View style={styles.categoriesSection}>
                                    <Text style={styles.sectionTitle}>CHỌN HẠNG MỤC</Text>
                                    <View style={styles.categoryGrid}>
                                        {categories.map((cat) => (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={styles.categoryItem}
                                                onPress={() => setSelectedCategory(cat.id)}
                                            >
                                                <View style={[
                                                    styles.categoryIcon,
                                                    { backgroundColor: cat.color + '10' },
                                                    selectedCategory === cat.id && { backgroundColor: cat.color, elevation: 4, shadowColor: cat.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }
                                                ]}>
                                                    <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
                                                </View>
                                                <Text style={[
                                                    styles.categoryName,
                                                    selectedCategory === cat.id && { color: cat.color, fontWeight: 'bold' }
                                                ]}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            style={styles.categoryItem}
                                            onPress={() => setIsAddCategoryModalVisible(true)}
                                        >
                                            <View style={[
                                                styles.categoryIcon,
                                                { backgroundColor: '#F9FAFB', borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB' }
                                            ]}>
                                                <Ionicons name="add" size={24} color="#9CA3AF" />
                                            </View>
                                            <Text style={styles.categoryName}>Thêm</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>

                            <SafeAreaView edges={['bottom']} style={styles.footer}>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>
                                        {initialData?.id ? 'Cập nhật giao dịch' : 'Lưu giao dịch'}
                                    </Text>
                                </TouchableOpacity>
                                {initialData?.id && (
                                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                        <Text style={styles.deleteButtonText}>Xóa giao dịch</Text>
                                    </TouchableOpacity>
                                )}
                            </SafeAreaView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </View>

            <Modal
                visible={isAddCategoryModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsAddCategoryModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Thêm hạng mục</Text>
                                <TouchableOpacity onPress={() => setIsAddCategoryModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formItem}>
                                <Text style={styles.formLabel}>Tên hạng mục</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Nhập tên..."
                                    value={newCatName}
                                    onChangeText={setNewCatName}
                                    autoFocus
                                />
                            </View>

                            <View style={styles.formItem}>
                                <Text style={styles.formLabel}>Biểu tượng</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiPicker}>
                                    {EMOJI_LIST.map(emoji => (
                                        <TouchableOpacity
                                            key={emoji}
                                            style={[styles.emojiItem, newCatIcon === emoji && styles.selectedItem]}
                                            onPress={() => setNewCatIcon(emoji)}
                                        >
                                            <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.formItem}>
                                <Text style={styles.formLabel}>Màu sắc</Text>
                                <View style={styles.colorPicker}>
                                    {COLOR_PALETTE.map(color => (
                                        <TouchableOpacity
                                            key={color}
                                            style={[styles.colorItem, { backgroundColor: color }, newCatColor === color && styles.selectedColorItem]}
                                            onPress={() => setNewCatColor(color)}
                                        />
                                    ))}
                                </View>
                            </View>
                            <TouchableOpacity style={styles.modalButton} onPress={handleCreateCategory}>
                                <Text style={styles.modalButtonText}>Tạo hạng mục</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        height: '75%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    inner: {
        flex: 1,
    },
    sheetHandleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 25,
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        padding: 4,
        alignSelf: 'center',
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 28,
        borderRadius: 20,
        minWidth: 110,
        alignItems: 'center',
    },
    toggleActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleText: {
        color: '#9CA3AF',
        fontWeight: '700',
        fontSize: 14,
    },
    amountContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    amountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currencySymbol: {
        fontSize: 28,
        color: '#D1D5DB',
        marginRight: 8,
        fontWeight: 'bold',
        marginTop: 5,
    },
    amountInput: {
        fontSize: 56,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#111827',
        paddingVertical: 0,
    },
    imagePreviewContainer: {
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    receiptPreview: {
        width: 120,
        height: 120,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    removeImageBtn: {
        position: 'absolute',
        top: -10,
        right: width / 2 - 70,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
    },
    amountLabel: {
        fontSize: 13,
        color: '#9CA3AF',
        marginBottom: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'column',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 25,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    dateText: {
        flex: 1,
        color: '#111827',
        fontWeight: '600',
        fontSize: 15,
    },
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 14,
        borderRadius: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    noteInput: {
        flex: 1,
        height: 50,
        color: '#111827',
        fontSize: 15,
        fontWeight: '500',
    },
    categoriesSection: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '800',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    categoryItem: {
        width: '25%',
        alignItems: 'center',
        marginBottom: 20,
    },
    categoryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#F3F4F6',
    },
    categoryName: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: '#111827',
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#FEF2F2',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    formItem: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    emojiPicker: {
        flexDirection: 'row',
        gap: 10,
    },
    emojiItem: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
    },
    selectedItem: {
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    colorItem: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    selectedColorItem: {
        borderWidth: 3,
        borderColor: '#111827',
    },
    modalButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
