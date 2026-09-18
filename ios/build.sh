#!/usr/bin/env bash
# extension/ からiOS用のSafari拡張アプリを生成し、App Store Connect（TestFlight）へアップロードする。
# macOS + Xcode 16以降で実行する。GitHub Actionsの .github/workflows/testflight.yml から呼ばれる。
# 証明書・プロファイルは手元に持たず、App Store Connect APIキーによるクラウド署名で書き出し時に署名する。
set -euo pipefail

: "${TEAM_ID:?Apple DeveloperのTeam IDを指定してください}"
: "${ASC_KEY_ID:?App Store Connect APIキーのKey IDを指定してください}"
: "${ASC_ISSUER_ID:?App Store Connect APIキーのIssuer IDを指定してください}"
: "${ASC_KEY_PATH:?App Store Connect APIキー（.p8）のパスを指定してください}"
# Secretsの貼り付けで紛れ込んだ空白・改行を除く。
ASC_KEY_ID=$(printf %s "$ASC_KEY_ID" | tr -d '[:space:]')
ASC_ISSUER_ID=$(printf %s "$ASC_ISSUER_ID" | tr -d '[:space:]')
APP_NAME="${APP_NAME:-Kittan Radar}"
BUNDLE_ID="${BUNDLE_ID:-me.tinykitten.kittan-radar}"
BUILD_NUMBER="${BUILD_NUMBER:-1}"

cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./extension/manifest.json').version")
OUT=build/ios
rm -rf "$OUT"
mkdir -p "$OUT"

xcrun safari-web-extension-converter extension \
  --project-location "$OUT" --app-name "$APP_NAME" --bundle-identifier "$BUNDLE_ID" \
  --swift --ios-only --copy-resources --no-open --no-prompt --force

PROJECT=$(find "$OUT" -maxdepth 3 -name '*.xcodeproj' | head -n 1)
[ -n "$PROJECT" ] || { echo "Xcodeプロジェクトが生成されませんでした" >&2; exit 1; }

# 変換ツールはアプリ名から大文字入りのバンドルID（me.tinykitten.Kittan-Radar）を作るため、
# App Store ConnectのAppに合わせて小文字にする。
perl -pi -e 's/(PRODUCT_BUNDLE_IDENTIFIER = )([^\$;]+);/$1\L$2;/' "$PROJECT/project.pbxproj"
grep PRODUCT_BUNDLE_IDENTIFIER "$PROJECT/project.pbxproj"

# 変換ツールが作るAppIconは空で、アイコンなしではApp Store Connectのアップロード検証に落ちる。
ICONSET=$(find "$OUT" -name AppIcon.appiconset -not -path '*Extension*' | head -n 1)
[ -n "$ICONSET" ] || { echo "AppIcon.appiconsetが見つかりません" >&2; exit 1; }
rm -f "$ICONSET"/*
cp ios/AppIcon-1024.png "$ICONSET/AppIcon-1024.png"
cat > "$ICONSET/Contents.json" <<'JSON'
{"images":[{"filename":"AppIcon-1024.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}
JSON

AUTH=(-allowProvisioningUpdates
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID")

# アーカイブは署名なしで作り、書き出し時にクラウド署名する（CIで毎回開発用証明書が作られるのを避ける）。
xcodebuild archive \
  -project "$PROJECT" -scheme "$APP_NAME" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/app.xcarchive" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  INFOPLIST_KEY_ITSAppUsesNonExemptEncryption=NO \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  "${AUTH[@]}"

cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>${TEAM_ID}</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>uploadSymbols</key><true/>
</dict></plist>
PLIST

# 失敗時はxcodebuildが一時フォルダに残す詳細ログ（IDEDistribution.verbose.log など）を
# 書き出し先へ移し、ワークフローのArtifactとして保存できるようにする。
xcodebuild -exportArchive \
  -archivePath "$OUT/app.xcarchive" -exportPath "$OUT/export" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" \
  "${AUTH[@]}" || {
  mkdir -p "$OUT/export"
  cp -R "${TMPDIR:-/tmp}"/*.xcdistributionlogs "$OUT/export/" 2>/dev/null || true
  exit 1
}
