#!/usr/bin/env bash
set -euo pipefail

APP_NAME="QuickTab"
APP_BUNDLE="/Applications/${APP_NAME}.app"
NATIVE_HOST_NAME="com.quicktab.ai"

echo "Stopping ${APP_NAME} if it is running..."
osascript -e "tell application \"${APP_NAME}\" to quit" >/dev/null 2>&1 || true
pkill -x "${APP_NAME}" >/dev/null 2>&1 || true

echo "Removing app bundle..."
rm -rf "${APP_BUNDLE}"

echo "Removing native messaging manifests..."
rm -f "${HOME}/Library/Application Support/Google/Chrome/NativeMessagingHosts/${NATIVE_HOST_NAME}.json"
rm -f "${HOME}/Library/Application Support/Microsoft Edge/NativeMessagingHosts/${NATIVE_HOST_NAME}.json"

echo "Removing QuickTab data..."
rm -rf "${HOME}/Library/Application Support/quicktab-ai"
rm -rf "${HOME}/.quicktab-ai"
rm -f "${HOME}/Library/Preferences/${NATIVE_HOST_NAME}.plist"
rm -rf "${HOME}/Library/Saved Application State/${NATIVE_HOST_NAME}.savedState"

echo "Resetting macOS privacy prompts for ${NATIVE_HOST_NAME} where possible..."
tccutil reset AppleEvents "${NATIVE_HOST_NAME}" >/dev/null 2>&1 || true
tccutil reset SystemPolicyAllFiles "${NATIVE_HOST_NAME}" >/dev/null 2>&1 || true

echo
echo "Manual cleanup still required:"
echo "1. Remove QuickTab from System Settings > General > Login Items if present."
echo "2. Remove the QuickTab extension from chrome://extensions and edge://extensions if installed."
echo "3. Remove QuickTab from System Settings > Privacy & Security > Automation / Full Disk Access if still listed."
echo
echo "QuickTab uninstall cleanup completed."
