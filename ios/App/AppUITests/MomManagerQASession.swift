import XCTest
import StoreKitTest

/// Not a real test — a QA harness that only exists to host an active
/// StoreKitTest session (which requires XCTest's process context; creating
/// it directly from the app's own AppDelegate crashes, since SKTestSession
/// depends on machinery only present under a test runner) while an external
/// script drives the launched app via its `…://debug` URL-scheme deep links
/// and `xcrun simctl io screenshot`. Never shipped — this target is excluded
/// from the App Store archive scheme/target entirely.
final class MomManagerQASession: XCTestCase {
    func testHoldStoreKitSession() throws {
        guard let configPath = ProcessInfo.processInfo.environment["MM_STOREKIT_CONFIG_PATH"] else {
            throw XCTSkip("MM_STOREKIT_CONFIG_PATH not set — nothing to do outside a QA run")
        }

        let session = try SKTestSession(contentsOf: URL(fileURLWithPath: configPath))
        session.disableDialogs = true
        // Deliberately not calling session.storefront=/.clearTransactions() —
        // every storekitd XPC round-trip in this sandboxed CI environment
        // fails with SKInternalErrorDomain Code=3, regardless of config file
        // path or simulator erase state (reproduced identically on a fresh
        // simulator). Relying solely on the config file's own "_storefront":
        // "GBR" setting, which doesn't require a runtime XPC write.
        NSLog("[QASession] StoreKitTest session active — config: %@ (storefront driven by the .storekit file's _storefront setting)", configPath)

        // Auto-dismiss any system alert (notification permission prompt,
        // "Open in App?" URL-scheme confirmation) by tapping its affirmative
        // button — this runs through XCUITest's own simulator-internal
        // accessibility hooks, not macOS's System Events, so it works even
        // though this sandboxed environment has no Accessibility permission
        // granted to osascript/System Events for host-level GUI automation.
        addUIInterruptionMonitor(withDescription: "System dialogs") { alert in
            for label in ["Allow", "Allow Notifications", "Deschideți", "OK"] {
                let button = alert.buttons[label]
                if button.exists {
                    button.tap()
                    return true
                }
            }
            return false
        }

        let app = XCUIApplication()
        app.launch()

        // Interruption monitors only fire on an app interaction. Tapping the
        // very top-left corner of the window is a safe no-op in this app
        // (no interactive control lives there) used purely to pump the
        // monitor check for a permission prompt that might have appeared
        // right after launch/requestPermission. app.statusBars isn't
        // reliably queryable on this runtime, so use a window coordinate
        // instead — guarded, since a tap on a non-existent/hittable element
        // throws and would otherwise take the whole test (and the session
        // it's hosting) down with it.
        RunLoop.current.run(until: Date().addingTimeInterval(1.5))
        if app.windows.firstMatch.exists {
            app.windows.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.02)).tap()
        }

        let swipeCount = Int(ProcessInfo.processInfo.environment["MM_QA_SWIPE_UP_COUNT"] ?? "0") ?? 0
        if swipeCount > 0 {
            RunLoop.current.run(until: Date().addingTimeInterval(1.5))
            // app.swipeUp() drags from near the very bottom edge, which on a
            // Face-ID device IS the system "go to Home Screen" gesture —
            // backgrounds the app instead of scrolling its content. Confine
            // the drag to the middle of the screen instead.
            let window = app.windows.firstMatch
            let start = window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.80))
            let end = window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.20))
            for _ in 0..<swipeCount {
                start.press(forDuration: 0.4, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.1)
                RunLoop.current.run(until: Date().addingTimeInterval(1.0))
            }
        }

        let holdSeconds = Double(ProcessInfo.processInfo.environment["MM_QA_HOLD_SECONDS"] ?? "180") ?? 180
        let deadline = Date().addingTimeInterval(holdSeconds)
        while Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(1))
        }
    }
}
