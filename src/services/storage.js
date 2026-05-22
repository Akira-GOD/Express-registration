import AsyncStorage from '@react-native-async-storage/async-storage';

const RECORDS_KEY = '@courier_records';
const ZOOM_KEY = '@courier_zoom_preference';

export async function saveRecord(record) {
  try {
    const records = await getRecords();
    records.unshift({
      id: Date.now().toString(),
      trackingNumber: record.trackingNumber,
      videoUri: record.videoUri,
      createdAt: new Date().toISOString(),
      ...record,
    });
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return records[0];
  } catch (error) {
    console.error('Error saving record:', error);
    throw error;
  }
}

export async function getRecords() {
  try {
    const json = await AsyncStorage.getItem(RECORDS_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error getting records:', error);
    return [];
  }
}

export async function deleteRecord(id) {
  try {
    const records = await getRecords();
    const filtered = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
}

export async function clearRecords() {
  try {
    await AsyncStorage.removeItem(RECORDS_KEY);
  } catch (error) {
    console.error('Error clearing records:', error);
    throw error;
  }
}

// Zoom preference
export async function saveZoomPreference(zoom) {
  try {
    await AsyncStorage.setItem(ZOOM_KEY, JSON.stringify(zoom));
  } catch (error) {
    console.error('Error saving zoom preference:', error);
  }
}

export async function getZoomPreference() {
  try {
    const json = await AsyncStorage.getItem(ZOOM_KEY);
    return json != null ? JSON.parse(json) : 0; // default 0 means 1x (no zoom)
  } catch (error) {
    console.error('Error getting zoom preference:', error);
    return 0;
  }
}
