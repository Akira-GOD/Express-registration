import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
  FlatList,
  ScrollView,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getRecords } from '../services/storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const route = useRoute();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [recentRecords, setRecentRecords] = useState([]);

  // Clear tracking number & refresh records when screen is focused
  useFocusEffect(
    useCallback(() => {
      setTrackingNumber('');
      loadRecords();

      // Handle openScanner param from voice command
      const params = route.params;
      if (params?.openScanner) {
        // Clear the param first to prevent re-triggering
        navigation.setParams({ openScanner: undefined, timestamp: undefined });
        // Open scanner
        if (permission?.granted) {
          setScanned(false);
          setScannerVisible(true);
        } else {
          requestPermission().then((result) => {
            if (result.granted) {
              setScanned(false);
              setScannerVisible(true);
            }
          });
        }
      }
    }, [route.params?.timestamp, permission])
  );

  const loadRecords = async () => {
    try {
      const records = await getRecords();
      setRecentRecords(records.slice(0, 5)); // show latest 5
    } catch (e) {
      console.log('Load records error:', e);
    }
  };

  const handleManualInput = useCallback(() => {
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      Alert.alert('提示', '请输入快递单号');
      return;
    }
    if (trimmed.length < 6) {
      Alert.alert('提示', '快递单号长度不少于6位');
      return;
    }
    navigation.navigate('Recorder', { trackingNumber: trimmed, autoStart: false });
  }, [trackingNumber, navigation]);

  const handleBarCodeScanned = useCallback(
    ({ data }) => {
      if (scanned) return;
      setScanned(true);
      Vibration.vibrate(100);

      const code = data.trim();
      setTrackingNumber(code);
      setScannerVisible(false);

      // 短暂延迟后自动跳转，让用户看到扫描结果
      setTimeout(() => {
        setScanned(false);
        navigation.navigate('Recorder', { trackingNumber: code, autoStart: true });
      }, 800);
    },
    [scanned, navigation]
  );

  const openScanner = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('权限不足', '需要相机权限才能扫描快递单号');
        return;
      }
    }
    setScanned(false);
    setScannerVisible(true);
  }, [permission, requestPermission]);

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
    setScanned(false);
  }, []);

  const handleShare = useCallback(async (trackingNumber, videoUri) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('提示', '当前设备不支持分享功能');
        return;
      }
      await Sharing.shareAsync(videoUri, {
        mimeType: 'video/mp4',
        dialogTitle: `分享录制视频 - ${trackingNumber}`,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('分享失败', error.message || '无法分享视频文件');
    }
  }, []);

  if (scannerVisible) {
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13', 'ean8', 'upc_e', 'itf14', 'codabar', 'aztec', 'datamatrix'],
          }}
        >
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrameContainer}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerHint}>将快递单号对准扫描框</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={closeScanner}>
              <Text style={styles.closeButtonText}>取消扫描</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>快递录制助手</Text>
        <Text style={styles.subtitle}>扫码或输入快递单号，开始录制开箱视频</Text>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>快递单号</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入或扫描快递单号"
            placeholderTextColor="#999"
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleManualInput}>
            <Text style={styles.primaryButtonText}>手动输入 → 录制视频</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>或</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
            <Text style={styles.scanButtonIcon}>📷</Text>
            <Text style={styles.scanButtonText}>扫描快递单号</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.historyButtonText}>📋 查看录制记录</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Records Section */}
        {recentRecords.length > 0 && (
          <View style={styles.recordsSection}>
            <Text style={styles.recordsSectionTitle}>最近录制</Text>
            <FlatList
              data={recentRecords}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const recordedDate = new Date(item.createdAt);
                const dateStr = `${recordedDate.getFullYear()}-${String(recordedDate.getMonth() + 1).padStart(2, '0')}-${String(recordedDate.getDate()).padStart(2, '0')}`;
                const timeStr = `${String(recordedDate.getHours()).padStart(2, '0')}:${String(recordedDate.getMinutes()).padStart(2, '0')}`;
                return (
                  <View style={styles.recordItem}>
                    <View style={styles.recordItemLeft}>
                      <Text style={styles.recordItemIcon}>📦</Text>
                      <View>
                        <Text style={styles.recordItemTracking} numberOfLines={1}>
                          {item.trackingNumber.slice(0, 30)}
                        </Text>
                        <Text style={styles.recordItemTime}>
                          {dateStr} {timeStr}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.recordShareButton}
                      onPress={() => handleShare(item.trackingNumber, item.videoUri)}
                    >
                      <Text style={styles.recordShareText}>📤</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              style={styles.recordsList}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 30,
    backgroundColor: '#4A90D9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    paddingBottom: 40,
  },
  inputSection: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
    letterSpacing: 2,
  },
  primaryButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  scanButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  scanButtonIcon: {
    fontSize: 20,
  },
  scanButtonText: {
    color: '#4A90D9',
    fontSize: 17,
    fontWeight: '600',
  },
  historyButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  historyButtonText: {
    color: '#666',
    fontSize: 15,
  },
  // Records section
  recordsSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  recordsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  recordsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recordItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordItemIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  recordItemTracking: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    maxWidth: 200,
  },
  recordItemTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  recordShareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordShareText: {
    fontSize: 16,
  },
  // Scanner styles
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrameContainer: {
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#4A90D9',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#fff',
    fontSize: 15,
    marginTop: 20,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    bottom: 80,
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});