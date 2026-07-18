import AsyncStorage from "@react-native-async-storage/async-storage";

const REMEMBER_ME_KEY = "donezo:remember-me";

export async function getRememberMePreference(): Promise<boolean> {
  const value = await AsyncStorage.getItem(REMEMBER_ME_KEY);
  return value !== "false";
}

export async function setRememberMePreference(rememberMe: boolean): Promise<void> {
  await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "true" : "false");
}
