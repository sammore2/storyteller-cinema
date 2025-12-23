# Storyteller Cinema - Skin Creation Guide

Welcome to the **Skin Studio**! This guide is designed for content creators, Patreon supporters, and module developers who want to distribute custom cinematic skins for Storyteller Cinema.

## 1. The JSON Structure

A Skin is simply a JSON file that defines the look and feel of the cinematic mode. You can export existing skins from the UI or create one manually.

### Basic Example (`my-skin.json`)
```json
{
  "id": "my-cool-skin",
  "name": "My Cool Skin",
  "author": "Creator Name",
  "version": "1.0.0",
  "autoDownload": true,
  "assets": {
    "barTexture": "https://i.imgur.com/ExampleBar.png",
    "overlayTexture": "https://i.imgur.com/ExampleOverlay.png"
  },
  "options": {
    "theme": "dark",
    "filter": "sepia(20%) contrast(1.1)",
    "styles": {
      "--cinematic-bar-bg": "#1a1a1a",
      "--cinematic-text-color": "#ffffff",
      "--cinematic-bar-border": "2px solid #ff6400"
    }
  }
}
```

## 2. Auto-Download Feature (Crucial!)

The most powerful feature for distribution is `autoDownload: true`.

*   **How it works**: When a user imports your JSON, the module detects this flag.
*   **What it does**: It automatically downloads the images from your `assets` URLs and saves them to the user's local `Data/storyteller-cinema/{id}/` folder.
*   **Why use it**: This ensures your skin works **offline** and doesn't break if the internet link goes down later. Plus, it bypasses Cross-Origin (CORS) issues during gameplay.

### Supported Assets
| Key | Description |
| :--- | :--- |
| `barTexture` | The background image for the top and bottom cinematic bars. Tileable images work best. |
| `overlayTexture` | A full-screen overlay (e.g., Film Grain, Vignette, Old Paper texture). This sits above the scene but below the bars. |

**Important**: Ensure your direct links (URLs) are publicly accessible (e.g., Imgur, Dropbox DL link, GitHub Raw).

## 3. Styling (CSS Variables)

You can customize the CSS variables used by the module backend.

| Variable | Default | Usage |
| :--- | :--- | :--- |
| `--cinematic-bar-bg` | `black` | Background color if texture fails or is transparent. |
| `--cinematic-bar-border` | `none` | CSS Border property (e.g., `1px solid red`). |
| `--cinematic-text-color` | `#fff` | Text color for future UI elements. |
| `--cinematic-filter` | `none` | Global CSS filter for the scene (e.g., `grayscale(100%)`). |

## 4. Best Practices

1.  **Unique IDs**: Always use a unique `id` (e.g., `authorname-skinname`) to avoid overwriting other people's skins.
2.  **Optimized Images**: Keep textures small.
    *   **Bars**: A 256x256 seamless tile is usually enough.
    *   **Overlay**: A 1920x1080 compressed JPG/WebP is best.
3.  **Versioning**: Update the `version` field when you make changes.

## 5. Testing Your Skin

1.  Create your JSON file.
2.  Open Foundry VTT and go to **Storyteller Cinema Settings -> Skin Studio**.
3.  Click **Import JSON**.
4.  Select your file.
5.  If `autoDownload` is on, wait for the confirmation message.
6.  Click **Apply** to test.

---
*Happy Creating!*
