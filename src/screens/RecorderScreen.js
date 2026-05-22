import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  PixelRatio,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { saveRecord } from '../services/storage';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 根据手机物理像素分辨率选择录制画质，使视频分辨率与手机屏幕匹配
const getVideoQuality = () => {
  const physicalHeight = SCREEN_HEIGHT * PixelRatio.get();
  if (physicalHeight >= 2160) return '2160p';
  if (physicalHeight >= 1080) return '1080p';
  if (physicalHeight >= 720) return '720p';
  return '480p';
};

export default function RecorderScreen({ route, navigation }) {
  const { trackingNumber, autoStart } = route.params;
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [speechPermission, setSpeechPermission] = useState(null);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false);
  const voiceStartedRef = useRef(false);
  const processingCommandRef = useRef(false);
  const autoStartDoneRef = useRef(false);
  const stopListeningRef = useRef(null);

  // Keep isRecordingRef in sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) {
      Alert.alert('错误', '相机未就绪，请稍后重试');
      return;
    }
    if (!cameraReady) {
      Alert.alert('错误', '相机正在初始化，请稍后重试');
      return;
    }
    if (isRecordingRef.current) return;

    try {
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });
      clearInterval(timerRef.current);
      setIsRecording(false);

      if (!video || !video.uri) {
        Alert.alert('错误', '录制失败，未获取到视频文件');
        return;
      }

      const fileName = `${trackingNumber}_${Date.now()}.mp4`;
      const dest = FileSystem.documentDirectory + fileName;
      await FileSystem.moveAsync({
        from: video.uri,
        to: dest,
      });

      const asset = await MediaLibrary.createAssetAsync(dest);
      await saveRecord({
        trackingNumber,
        videoUri: asset.uri,
        createdAt: new Date().toISOString(),
      });

      navigation.goBack();
    } catch (error) {
      clearInterval(timerRef.current);
      setIsRecording(false);
      Alert.alert('录制失败', error?.message || '未知错误，请重试');
    }
  }, [cameraReady, trackingNumber, navigation]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    if (!isRecordingRef.current) return;

    try {
      await cameraRef.current.stopRecording();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setElapsed(0);
    } catch (error) {
      clearInterval(timerRef.current);
      setIsRecording(false);
      Alert.alert('停止失败', error?.message || '未知错误');
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  // --- Voice Command Processing ---
  const processVoiceCommand = useCallback((transcript) => {
    if (processingCommandRef.current) return;
    const text = transcript.toLowerCase().trim();

    setVoiceText(text);

    if (text.includes('开始') || text.includes('kaishi')) {
      processingCommandRef.current = true;
      if (!isRecordingRef.current) {
        startRecording();
      }
      setTimeout(() => { processingCommandRef.current = false; }, 2000);
    } else if (text.includes('结束') || text.includes('jieshu') || text.includes('停止')) {
      processingCommandRef.current = true;
      if (isRecordingRef.current) {
        stopRecording();
      }
      setTimeout(() => { processingCommandRef.current = false; }, 2000);
    } else if (text.includes('扫码') || text.includes('saoma') || text.includes('扫描')) {
      // Navigate back to Home and open scanner
      processingCommandRef.current = true;
      Alert.alert('语音指令', '正在返回扫码页面...');
      navigation.navigate('Home', { openScanner: true, timestamp: Date.now() });
      setTimeout(() => { processingCommandRef.current = false; }, 2000);
    }
  }, [startRecording, stopRecording, navigation]);

  // Register speech recognition event listeners
  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0]?.transcript || '';
      if (transcript) {
        processVoiceCommand(transcript);
      }
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setVoiceListening(false);
    // Restart recognition if still on this screen
    if (voiceStartedRef.current) {
      setTimeout(() => {
        startListening();
      }, 500);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech error:', event.error, event.message);
    setVoiceListening(false);
    setVoiceText('语音识别出错: ' + (event.message || event.error || ''));
    // Retry after delay
    if (voiceStartedRef.current) {
      setTimeout(() => {
        startListening();
      }, 2000);
    }
  });

  useSpeechRecognitionEvent('start', () => {
    setVoiceListening(true);
  });

  // Start listening function
  const startListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.start({
        lang: 'zh-CN',
        continuous: true,
        interimResults: false,
      });
    } catch (error) {
      console.log('startListening error:', error?.message);
      setVoiceText('启动语音识别失败');
      if (voiceStartedRef.current) {
        setTimeout(() => {
          startListening();
        }, 2000);
      }
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.log('stopListening error:', error?.message);
    }
  }, []);

  // Auto-start recording if autoStart param is set
  useEffect(() => {
    if (autoStart && cameraReady && !autoStartDoneRef.current && !isRecordingRef.current) {
      autoStartDoneRef.current = true;
      // Small delay to make sure camera is fully initialized
      const timer = setTimeout(() => {
        startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, cameraReady, startRecording]);

  // Initialize speech recognition on mount
  useEffect(() => {
    stopListeningRef.current = stopListening;
    const initSpeech = async () => {
      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        setSpeechPermission(result);
        if (result.granted) {
          voiceStartedRef.current = true;
          startListening();
        } else {
          setVoiceText('语音识别权限未授予，将无法使用语音控制');
        }
      } catch (error) {
        console.log('Speech init error:', error?.message);
        setVoiceText('语音识别不可用: ' + (error?.message || ''));
      }
    };

    initSpeech();

    return () => {
      voiceStartedRef.current = false;
      stopListeningRef.current?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!permission || !micPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>正在检查权限...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted || !micPermission.granted || !mediaPermission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>需要相机、麦克风和媒体库权限才能录制</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              if (!permission.granted) await requestPermission();
              if (!micPermission.granted) await requestMicPermission();
              if (!mediaPermission?.granted) await requestMediaPermission();
            }}
          >
            <Text style={styles.permissionButtonText}>授予权限</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>运单号: {trackingNumber}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          mode="video"
          videoQuality={getVideoQuality()}
          zoom={0.1}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(e) => Alert.alert('相机错误', e?.message || '未知')}
        />
        {!cameraReady && (
          <View style={styles.cameraLoading}>
            <Text style={styles.loadingText}>相机初始化中...</Text>
          </View>
        )}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>录制中 {formatTime(elapsed)}</Text>
          </View>
        )}
      </View>

      {/* Voice control indicator */}
      <View style={styles.voiceContainer}>
        <View style={[styles.voiceDot, voiceListening && styles.voiceDotActive]} />
        <Text style={styles.voiceText}>
          语音控制：说"开始"录制，"结束"停止，"扫码"返回扫码
        </Text>
        {voiceText ? (
          <Text style={styles.voiceResult} numberOfLines={1}>
            {voiceText}
          </Text>
        ) : null}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={toggleRecording}
        >
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: '#4A90D9',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  cameraWrapper: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 8,
    borderRadius: 12,
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  recText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a2e',
    gap: 8,
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  voiceDotActive: {
    backgroundColor: '#00FF88',
  },
  voiceText: {
    color: '#AAA',
    fontSize: 12,
    flex: 1,
  },
  voiceResult: {
    color: '#00FF88',
    fontSize: 11,
    maxWidth: 120,
  },
  controls: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#111',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    borderColor: '#FF3B30',
  },
  recordInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
  },
  recordInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});