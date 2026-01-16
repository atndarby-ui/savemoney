import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Database } from './Database';
import { Alert } from 'react-native';

export const SyncService = {
    uploadBackup: async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Login Required', 'Please log in to backup your data.');
                return;
            }

            // 1. Gather all data from Local SQLite
            const transactions = await Database.getTransactions();
            const categories = await Database.getCategories();
            const chatHistory = await Database.getChatHistory();

            // 2. Prepare payload
            const backupData = {
                transactions,
                categories,
                chatHistory,
                updatedAt: serverTimestamp(),
                deviceInfo: {
                    platform: 'mobile', // Simplified
                }
            };

            // 3. Upload to Firestore
            // path: users/{userId}/backups/latest
            const backupRef = doc(db, 'users', user.uid, 'backups', 'latest');
            await setDoc(backupRef, backupData);

            Alert.alert('Success', 'Data backed up successfully!');
        } catch (error: any) {
            console.error('Backup error:', error);
            Alert.alert('Backup Failed', error.message);
        }
    },

    downloadBackup: async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Login Required', 'Please log in to restore your data.');
                return;
            }

            // 1. Fetch from Firestore
            const backupRef = doc(db, 'users', user.uid, 'backups', 'latest');
            const docSnap = await getDoc(backupRef);

            if (!docSnap.exists()) {
                Alert.alert('No Backup Found', 'You haven\'t backed up any data yet.');
                return;
            }

            const data = docSnap.data();

            // 2. Restore to SQLite
            console.log('Restoring data...');

            if (data.transactions && Array.isArray(data.transactions)) {
                for (const tx of data.transactions) {
                    let dateVal = tx.date;
                    if (dateVal && typeof dateVal.toDate === 'function') {
                        dateVal = dateVal.toDate();
                    } else if (dateVal && typeof dateVal === 'string') {
                        dateVal = new Date(dateVal);
                    }

                    await Database.addTransaction({
                        ...tx,
                        date: dateVal
                    });
                }
            }

            if (data.categories && Array.isArray(data.categories)) {
                for (const cat of data.categories) {
                    await Database.addCategory(cat);
                }
            }

            if (data.chatHistory && Array.isArray(data.chatHistory)) {
                await Database.clearChatHistory();
                for (const msg of data.chatHistory) {
                    await Database.addChatMessage(msg);
                }
            }

            Alert.alert('Success', 'Data restored successfully! Please restart the app to see changes if they don\'t appear immediately.');
        } catch (error: any) {
            console.error('Restore error:', error);
            Alert.alert('Restore Failed', error.message);
        }
    },

    deleteBackup: async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Login Required', 'Please log in to delete your backup.');
                return;
            }

            const backupRef = doc(db, 'users', user.uid, 'backups', 'latest');
            const docSnap = await getDoc(backupRef);

            if (!docSnap.exists()) {
                Alert.alert('No Backup Found', 'There is no backup to delete.');
                return;
            }

            Alert.alert(
                'Delete Backup',
                'Are you sure you want to delete your cloud backup? This will not affect your local data.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            await deleteDoc(backupRef);
                            Alert.alert('Deleted', 'Cloud backup has been removed.');
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Delete backup error:', error);
            Alert.alert('Error', error.message);
        }
    }
};
