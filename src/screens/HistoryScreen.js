import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords, deleteRecord, clearRecords } from '../services/storage';
import * as FileSystem from 'expo-file-system';

export default function HistoryScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    try {
      const data = await getRecords();
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(
    (id, trackingNumber, videoUri) => {
      Alert.alert('删除确认', `确定要删除 ${trackingNumber} 的录制记录吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete video file first
              if (videoUri) {
                try {
                  const fileInfo = await FileSystem.getInfoAsync(videoUri);
                  if (fileInfo.exists) {
                    await FileSystem.deleteAsync(videoUri, { idempotent: true });
                  }
                } catch (e) {
                  console.log('Delete video file error:', e);
                }
              }
              await deleteRecord(id);
              loadRecords();
            } catch (error) {
              Alert.alert('删除失败', '请稍后重试');
            }
          },
        },
      ]);
    },
    []
  );

  const handleShare = useCallback(async (trackingNumber, videoUri) => {
    try {
      await Share.share({
        message: `快递单号: ${trackingNumber}\n录制时间: ${new Date().toLocaleString()}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert('清空所有记录', '确定要清空所有录制记录吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete all video files
            const allRecords = await getRecords();
            for (const record of allRecords) {
              if (record.videoUri) {
                try {
                  const fileInfo = await FileSystem.getInfoAsync(record.videoUri);
                  if (fileInfo.exists) {
                    await FileSystem.deleteAsync(record.videoUri, { idempotent: true });
                  }
                } catch (e) {
                  console.log('Delete video file error:', e);
                }
              }
            }
            await clearRecords();
            setRecords([]);
          } catch (error) {
            Alert.alert('清空失败', '请稍后重试');
          }
        },
      },
    ]);
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.recordItem}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordTracking} numberOfLines={1}>
          ✉️ {item.trackingNumber}
        </Text>
        <Text style={styles.recordDate}>{formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.videoInfo}>
        <Text style={styles.videoLabel}>🎬 视频已录制</Text>
        <Text style={styles.videoUri} numberOfLines={1}>
          {item.videoUri?.split('/').pop() || '未知文件'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => handleShare(item.trackingNumber, item.videoUri)}
        >
          <Text style={styles.shareButtonText}>📤 分享</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.trackingNumber, item.videoUri)}
        >
          <Text style={styles.deleteButtonText}>🗑️ 删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>暂无录制记录</Text>
      <Text style={styles.emptyText}>扫描或输入快递单号后开始录制开箱视频</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.emptyButtonText}>开始录制</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>录制记录</Text>
        {records.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearText}>清空</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={records.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  clearText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTracking: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  videoInfo: {
    backgroundColor: '#F8F9FC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  videoLabel: {
    fontSize: 13,
    color: '#4A90D9',
    marginBottom: 4,
  },
  videoUri: {
    fontSize: 11,
    color: '#999',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#F0F5FF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#4A90D9',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});