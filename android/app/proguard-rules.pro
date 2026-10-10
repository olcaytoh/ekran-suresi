# Add project specific ProGuard / R8 rules here.
# Enable aggressive R8 optimization, shrinking, and obfuscation while keeping Capacitor entry points safe.

-optimizationpasses 5
-allowaccessmodification
-repackageclasses 'o'

# Keep Capacitor Plugin constructors and @PluginMethod methods (referenced via reflection by Capacitor bridge)
-keep @com.getcapacitor.annotation.CapacitorPlugin class * extends com.getcapacitor.Plugin {
    public <init>();
    @com.getcapacitor.PluginMethod public void *(com.getcapacitor.PluginCall);
}
-keep class * extends com.getcapacitor.Plugin {
    public <init>();
    @com.getcapacitor.PluginMethod public void *(com.getcapacitor.PluginCall);
}

# Keep WebView JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep MainActivity entry point
-keep public class com.olcico.ekransuresi.MainActivity {
    public <init>();
    protected void onCreate(android.os.Bundle);
}

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-dontwarn **
-ignorewarnings
