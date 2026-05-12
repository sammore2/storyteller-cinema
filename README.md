# Storyteller's Cinema



**Storyteller's Cinema** transforms your Foundry VTT sessions into an immersive **visual novel experience**. It creates a seamless "Cinematic Mode" where the map is replaced by a scenic background, tokens become high-quality portraits, and the camera dynamically adapts to tell your story—all while keeping the tactical map just a click away.

![Foundry Version](https://img.shields.io/badge/Foundry-v14-orange)

## ✨ Key Features

### 1. 🎬 Cinematic Mode (CSS Staging)
Toggle the **Cinematic Mode** using the floating film icon in the HUD.
*   **True Widescreen Overlays:** The tactical map and tokens are masked by a high-performance CSS-based scenic overlay, ensuring a perfect "Theater" experience regardless of canvas complexity.
*   **Optimized Layering:** Uses a robust Z-index hierarchy to separate backgrounds, actor portraits, and UI elements into distinct, non-conflicting visual planes.
*   **Smart Camera:** The view automatically adapts to the scenic background, ensuring full-screen immersion on any monitor resolution.

### 2. 🎭 Cinematic Portraits (Layered Staging)
Tokens can display high-fidelity portraits layered above the scenic background.
*   **Configuration:** Accessible via **Token Configuration -> Appearance**.
*   **Cinematic Assets:** Set dedicated high-res busts or visual-novel style portraits that stay crisp and properly positioned.
*   **Visual Novel Experience:** Seamlessly transition between tactical top-down combat and immersive, story-driven portrait scenes.

### 3. 📺 Cinematic Stage (Dialogue & Subtitles)
The **Stage** is the central interface for storytelling, combining dialogue and art.
*   **Dynamic Subtitles:** Beautifully rendered subtitles with customizable fonts and styles.
*   **Portrait Integration:** Large, expressive portraits appear alongside dialogue to represent the current speaker.
*   **Multi-Channel API:** Developers and GMs can use `StorytellerCinema.say()` to trigger stage events with custom portraits and text.

### 4. 🖼️ Setup per Scene
Each scene can be customized individually.
*   **Configuration:** Go to **Scene Configuration**.
*   **Default View Mode:** Choose if the scene starts in "Battlemap" (Tactical) or "Cinematic" (Immersive) mode.
*   **Cinematic Background:** Select the image that will be displayed when Cinematic Mode is active.

### 5. 🎨 Skin Studio & Overlays
Customize everything with the new **Skin Studio** (Cog icon in HUD).
*   **Custom Themes:** Create skins with custom textures (wood, stone, sci-fi) for the cinematic bars.
*   **Overlays:** Apply full-screen effects like **Film Grain**, **Vignettes**, or **Old Paper** filters.
*   **Auto-Download:** Import community JSON skins and the module automatically downloads and installs the necessary assets for you.
*   **Safe Storage:** Assets are saved locally to your User Data, ensuring offline compatibility.

### 6. 🎙️ Stage Cast (Cinema Tray)
The GM has a dedicated, floating control bar to manage the cinematic narrative.
*   **Movable UI:** A compact, non-intrusive DIV that can be dragged and placed anywhere on the screen.
*   **Speaking As:** One-click assignment to set which actor is currently "Speaking".
*   **Director Mode:** When active, your chat messages are automatically intercepted and displayed as cinematic subtitles on the stage.
*   **Quick Stage Control:** Instantly show portraits or clear the stage with dedicated hotkeys/buttons.

### 7. 📏 Depth Scaling (2.5D Effect)
Tokens visually resize based on their vertical (Y) position, simulating depth.
*   **Shift + Mouse Wheel:** Hover over a token while in Cinematic Mode to manually adjust its visual scale on the fly.
*   **Automatic:** Characters "closer" to the camera (bottom of screen) appear larger.

![Cinematic Demo - Classic](docs/classic.png)
![Cinematic Demo - Old Photograph](docs/old-photograph.png)

## 📦 Installation
1.  Copy the Manifest Link from the latest Release.
2.  In Foundry VTT, go to **Add-on Modules** -> **Install Module**.
3.  Paste the link and install.

## ⚙️ Compatibility
Fully compatible with and validated for **Foundry VTT v14**.

## 📝 License
[GNU General Public License v3.0](LICENSE)
