# Analytics events

Make uses one Google tag (`G-J7NQEM2027`). The tag loads only after a visitor allows analytics in the consent prompt. The footer lets visitors withdraw consent. The events below use fixed design, palette, brand and range IDs; they do not include names, email addresses, entered HEX values or other personal information.

All four event names existed before this update. This update aligns their parameters with the contract below and records PLA range changes. Events fire from user actions, not from React renders. Re-selecting the current design, palette, brand or range does not send another event.

| Event | When it fires | Parameters |
| --- | --- | --- |
| `design_selected` | A visitor chooses a different tag | `design_id` |
| `palette_selected` | A visitor chooses a different preset or Custom colours | `design_id`, `palette_id`, `palette_type` |
| `filament_brand_selected` | A visitor enters Match PLA filaments, changes brand, or changes PLA range | `filament_brand`, `pla_range` |
| `model_download` | A nonempty file has been prepared and its browser download started | `design_id`, `file_format`, `palette_id`, `palette_type`, `filament_brand` |

`palette_type` is `preset` or `custom`. Custom palettes use `palette_id=custom`. `file_format` is `3mf` or `stl`. `filament_brand` is the selected brand ID for a custom filament palette and `not_selected` for a preset or manually chosen colours. STL files carry no colour data; their download event still records the palette shown when the visitor clicked Download. A failed fetch or failed 3MF preparation sends no `model_download` event. Browser code can confirm that a download was initiated, but cannot confirm that the visitor saved the file to disk.

## Test in GA4 DebugView

1. Open the Make website in a fresh browser session and choose **Allow analytics**. Declined or absent consent prevents both the tag and these events from running.
2. Start a [Tag Assistant](https://tagassistant.google.com/) session for the site to enable debug mode on your browser. In the GA4 property, open **Admin → Data display → DebugView** and select your debug device.
3. Change the design and palette, enter **Custom colours → Match PLA filaments**, change brand and range, then download a 3MF and an STL. Each action should produce the corresponding event once. Click an event in DebugView to inspect its parameters. Choosing an already selected option should produce no new event.
4. Test the consent gate in a separate clean browser session: before allowing analytics, the four custom events should be absent. After withdrawing consent from the footer, they should stop.

DebugView requires both analytics consent and debug mode. [Google's DebugView guide](https://support.google.com/analytics/answer/7201382) explains the device selector and event parameter view.

## Test in Chrome DevTools

1. Open **DevTools → Network**, enable **Preserve log**, and filter for `g/collect`. Use a fresh browser session to test the pre-consent state; there should be no Google Analytics collection requests from Make before consent.
2. Allow analytics and repeat the interactions above. Wait a few seconds for batched events, then select each Google Analytics request and inspect **Payload**. Look for event names in `en` and parameters such as `ep.design_id`, `ep.palette_id`, `ep.file_format`, `ep.filament_brand` and `ep.pla_range`. Google may batch multiple events into one request. A `200` or `204` response shows that the request was accepted for transport; use DebugView to confirm property-level receipt.
3. To check failed-download behavior, use DevTools request blocking for an asset URL, click its download button, and verify that no `model_download` event is sent. Remove the block and try again.

See [Google's Analytics verification guide](https://developers.google.com/analytics/devguides/collection/ga4/troubleshoot) and [Chrome's Network panel reference](https://developer.chrome.com/docs/devtools/network/reference/) for more detail. To use these custom parameters in standard GA4 reports, register the relevant [event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696) in the property.
