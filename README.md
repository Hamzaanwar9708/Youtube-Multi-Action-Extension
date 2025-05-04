# Youtube-Multi-Action-Extension

A powerful Chrome extension designed to automate bulk engagement actions on YouTube. Whether you're managing multiple videos, playlists, or specific URL groups, BatchTube lets you auto-subscribe, like, and comment on videos with precision. With built-in support for range-based processing, you can apply actions to individual videos or grouped sets—giving you full control over your YouTube engagement strategy. Ideal for creators, marketers, or anyone managing large-scale YouTube interactions.

1. Single‐Video Mode
Opens YouTube homepage and immediately clicks the first video.
Automatically Subscribe, Like, or Comment on that video via dedicated buttons.
Uses a simple “sleep & scroll” logic to wait for elements and bring them into view.

2. Multi‐Video Mode
URL List: Maintain your own list of YouTube video URLs.
Batch Processing: Click “Start” to automatically open each URL in sequence and perform Subscribe + Like + Comment actions.
Range Support: Specify a start and end index to process only part of the list—ideal for large batches or resuming where you left off.
Grouped or Individual Actions: Use the range tool to apply different actions (Subscribe, Like, Comment) in flexible ways—either grouped (e.g., Subscribe to all, then Comment) or individually per video.
Progress Tracking: Tracks which videos have been processed (subscribed / liked / commented) in local storage to prevent duplicate actions.

3. Playlist Mode
Add Playlist: Paste a YouTube playlist URL to auto-scrape video IDs and save them as a playlist object.
Dropdown Select: Quickly switch between saved playlists for focused processing.
Range Support: Process a selected subset of videos within a playlist using the range selector.
Grouped or Individual Actions: Perform different actions across the selected range—run Subscribe, Like, or Comment actions together or tailor actions per video.
Batch Workflow: Supports the same Subscribe + Like + Comment automation process as Multi-Video Mode.

4. Range Filters
Video Range: Specify a “main” range of videos (e.g. videos 3–8).
Action Ranges: Independently set ranges for subscribe, like, and comment (e.g. subscribe on videos 1–5, like on 4–10, comment on 2–7).
Built-in validation (min≤max, must lie within main range) with inline error messages and red inputs.

5. AI-Generated Comments
When in Comment mode, the extension sends the video title to an LLM (via your API key).
Posts back a short, positive, 5–10-word comment.

6. Persistent State & Processed Memory
Stores all arrays and settings in chrome.storage.local under keys:
  urlArray, listArray (your link lists)
  urlRangeArray, listRangeArray (computed ranges)
  ytdRangeData (your saved min/max configurations)
  processedLinks (objects with { link, subscribed, liked, commented })
  popupState (which UI tab was last open)
  previousDropdownValue, playlistProcessed (playlist UI state)
  Reacts to storage changes in real time to update the popup UI

7. Clean, Sectioned Popup UI
Home: Choose between Single, Multi, or Playlist modes
List View: Shows your current URLs or playlist videos with status icons and “Delete” buttons
Filter View: Configure your video/action ranges with live validation
Controls: Dedicated buttons for one-off subscribe/like/comment, or batch SLC (“SubLikeCom”)
