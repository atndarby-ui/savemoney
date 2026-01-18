import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const NotificationService = {
    registerForPushNotificationsAsync: async () => {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return null;
        }

        return true;
    },

    scheduleReminder: async (
        title: string,
        body: string,
        triggerDate: Date,
        soundUri?: string,
        imageUri?: string
    ): Promise<string> => {
        const trigger = triggerDate.getTime() - Date.now();
        if (trigger <= 0) return '';

        const content: Notifications.NotificationContentInput = {
            title,
            body,
            sound: true,
            data: { imageUri },
        };

        if (soundUri) {
            content.sound = soundUri;
        }

        // Attach image if provided (Note: Native implementation for attachments varies)
        if (imageUri && Platform.OS === 'ios') {
            content.attachments = [{
                uri: imageUri,
                identifier: 'reminder-image',
                type: 'image'
            } as any];
        }

        return await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
            } as unknown as Notifications.NotificationTriggerInput,
        });
    },

    cancelNotification: async (id: string) => {
        try {
            await Notifications.cancelScheduledNotificationAsync(id);
        } catch (error) {
            console.error("Error canceling notification:", error);
        }
    },

    cancelAll: async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
    },

    // Helper to calculate trigger date
    // offsetMinutes: how many minutes BEFORE the deadline to notify
    calculateTriggerDate: (deadlineStr: string, offsetMinutes: number): Date | null => {
        // Simple parsing - assumes DD/MM/YYYY
        // Note: For production, use date-fns or similar for robust parsing
        const parts = deadlineStr.split('/');
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        const deadline = new Date(year, month, day);
        // Set to say 9 AM on the deadline day? Or just the date?
        // Let's assume 9:00 AM if no time is specified, for 'Reminders'
        deadline.setHours(9, 0, 0, 0);

        const trigger = new Date(deadline.getTime() - offsetMinutes * 60000);

        // If trigger is in the past, maybe don't schedule or schedule immediately?
        // For now return it, scheduler might handle it (runs immediately if in past usually)
        return trigger;
    }
};
