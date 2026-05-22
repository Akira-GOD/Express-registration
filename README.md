# 📦 快递录制助手 (Courier Recorder)

一款基于 Expo（React Native）开发的快递开箱视频录制 App，支持扫码录入快递单号、视频录制、语音控制与历史记录管理。

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 📷 **扫码录入** | 使用摄像头扫描快递单号（支持二维码、条形码等多种码制），自动识别并跳转录制 |
| ⌨️ **手动输入** | 手动输入快递单号，支持长度校验 |
| 🎥 **视频录制** | 调用设备摄像头录制开箱视频（最长 60 秒，720p 画质），自动保存至系统相册 |
| 🎙️ **语音控制** | 录制过程中通过语音指令控制录制："开始"录制、"结束/停止"录制、"扫码"返回扫码页面 |
| 📋 **历史记录** | 查看所有录制记录，支持分享和删除单条或清空全部记录 |
| 📤 **视频分享** | 通过系统分享功能将录制的视频发送至其他应用 |

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Expo](https://docs.expo.dev/versions/v55.0.0/) | SDK 55 | 跨平台开发框架 |
| [React Native](https://reactnative.dev/) | 0.83.6 | UI 框架 |
| [React Navigation](https://reactnavigation.org/) | ^7 | 页面导航（Native Stack） |
| [expo-camera](https://docs.expo.dev/versions/v55.0.0/sdk/camera/) | ^55 | 摄像头调用与条码扫描 |
| [expo-speech-recognition](https://docs.expo.dev/versions/v55.0.0/sdk/speech-recognition/) | ^3 | 语音识别（中文指令） |
| [expo-media-library](https://docs.expo.dev/versions/v55.0.0/sdk/media-library/) | ^55 | 视频保存至系统相册 |
| [expo-file-system](https://docs.expo.dev/versions/v55.0.0/sdk/file-system/) | ^55 | 文件管理 |
| [expo-sharing](https://docs.expo.dev/versions/v55.0.0/sdk/sharing/) | ^55 | 视频分享 |
| [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) | 2.2 | 本地数据持久化 |

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (LTS 版本)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- 物理设备（用于摄像头和语音功能）或模拟器

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/Akira-GOD/Express-registration.git
cd Express-registration

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npx expo start
```

启动后使用 **Expo Go** App 扫描终端中显示的二维码即可在手机上运行。

### 构建安装包

本项目已配置 [EAS Build](https://docs.expo.dev/build/introduction/)，可在 `eas.json` 中查看构建配置：

```bash
# 安装 EAS CLI（如未安装）
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 Android APK
eas build -p android --profile preview

# 构建 iOS（需 Apple Developer 账号）
eas build -p ios --profile preview
```

---

## 📖 使用说明

### 1. 首页

- 在输入框中**手动输入**快递单号（至少 6 位），点击「手动输入 → 录制视频」
- 或点击「扫描快递单号」打开相机扫码
- 底部展示最近 5 条录制记录，可快速分享

### 2. 扫码页面

- 将快递单号条形码/二维码对准屏幕中的扫描框
- 识别成功后自动跳转到录制页面

### 3. 录制页面

- 相机初始化完成后，点击红色录制按钮开始/停止录制
- 支持**语音控制**（需授予麦克风和语音识别权限）：
  - 说 **"开始"** → 开始录制
  - 说 **"结束"** / "停止" → 停止录制
  - 说 **"扫码"** → 返回扫码页面
- 录制最长 **60 秒**，停止后自动保存至相册并返回首页

### 4. 历史记录

- 点击首页「查看录制记录」进入
- 每条记录显示单号、录制时间
- 支持**分享**和**删除**操作
- 右上角可一键清空所有记录

---

## 📁 项目结构

```
Express-registration/
├── App.js                          # 应用入口
├── app.json                        # Expo 配置
├── eas.json                        # EAS Build 配置
├── package.json                    # 依赖与脚本
├── index.js                        # 注册入口
├── assets/                         # 图标与启动画面资源
│   ├── icon.png
│   ├── splash-icon.png
│   ├── favicon.png
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   └── android-icon-monochrome.png
└── src/
    ├── navigation/
    │   └── AppNavigator.js         # 导航配置（Home / Recorder / History）
    ├── screens/
    │   ├── HomeScreen.js           # 首页：输入单号、扫码、最近记录
    │   ├── RecorderScreen.js       # 录制页：视频录制与语音控制
    │   └── HistoryScreen.js        # 历史记录：查看、分享、删除
    └── services/
        └── storage.js              # AsyncStorage 数据持久化服务
```

---

## 🔑 权限说明

应用需要以下权限：

| 权限 | 用途 |
|------|------|
| 📷 相机 | 扫码识别快递单号、录制开箱视频 |
| 🎤 麦克风 | 视频录制、语音控制指令 |
| 🖼️ 媒体库 | 保存录制的视频至系统相册 |
| 🗣️ 语音识别 | 中文语音指令控制录制 |

---

## 📄 许可证

本项目仅供个人学习与使用。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
