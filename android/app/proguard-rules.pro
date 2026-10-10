# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor Core and Plugins (allow obfuscation of non-reflective internals while keeping plugin entry points)
-keep @com.getcapacitor.annotation.CapacitorPlugin class * extends com.getcapacitor.Plugin {
    <init>();
    @com.getcapacitor.PluginMethod public void *(com.getcapacitor.PluginCall);
}
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.olcico.ekransuresi.MainActivity { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-dontwarn com.google.android.gms.**
-dontwarn com.google.firebase.**
