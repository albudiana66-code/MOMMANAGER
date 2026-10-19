# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserve line numbers for readable crash stack traces, but hide the
# original source file path in the stripped build.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Capacitor ────────────────────────────────────────────────────────────────
# The JS ↔ native bridge finds plugins and their exposed methods via
# reflection (@CapacitorPlugin / @PluginMethod annotations). Capacitor's own
# module already ships this as a consumerProguardFile (auto-merged by AGP),
# and every installed plugin (local-notifications, status-bar, splash-screen,
# browser, app, apple-sign-in, native-settings, revenuecat-purchases-capacitor)
# extends com.getcapacitor.Plugin, so this single rule covers all of them —
# kept explicitly here too as a safety net in case that merge is ever skipped.
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# WebView's own JS-interface bridge object (standard Android requirement —
# JS-callable methods must survive obfuscation or the bridge silently breaks).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── RevenueCat ───────────────────────────────────────────────────────────────
# purchases-hybrid-common / purchases already bundle their own consumer rules
# (verified in the published AAR), which cover the kotlinx.serialization
# models used for store responses. Kept explicitly too, since this is the
# one native SDK a dropped/renamed class would silently break purchases for.
-keep class com.revenuecat.purchases.** { *; }
-keep interface com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# ── Google Play Billing ───────────────────────────────────────────────────────
# Also ships its own consumer rules (verified), kept explicitly for the same
# reason — RevenueCat calls into this directly for the actual purchase flow.
-keep class com.android.billingclient.** { *; }
-dontwarn com.android.billingclient.**

# ── Kotlin / kotlinx.serialization ───────────────────────────────────────────
# Needed by RevenueCat's models; harmless no-op for anything that doesn't use it.
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault,*Annotation*
-keep,includedescriptorclasses class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.serialization.**

# ── Supabase ──────────────────────────────────────────────────────────────────
# Not applicable: this app's Supabase client (@supabase/supabase-js) runs
# entirely as JavaScript inside the WebView, bundled into assets/public — R8
# only processes compiled Kotlin/Java → DEX code, never the web bundle, so
# there is no native Supabase dependency here to write keep rules for.
