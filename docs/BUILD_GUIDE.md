# Noto V4: The Complete Beginner’s Build Guide 📓✨

This is a step-by-step master guide to building your own distraction-free digital notebook. We’ve designed this for **absolute beginners**. Follow every single checkmark in order. **Do not rush.**

---

## 🏗 SECTION 1: THE BUYING GUIDE (WHAT TO GET)

Ensure you have these exactly before starting. We recommend these Indian suppliers.

### 📦 The "Parts" List:
1.  **The Brain (SBC)**: [Radxa CM3 (2GB/16GB eMMC)](https://robu.in/product/radxa-compute-module-3/) (₹3,500). This is the main computer chip.
2.  **The IO Board (Motherboard)**: [CM3 IO Base](https://robu.in/product/radxa-cm3-io-board/) (₹1,500). This is the board the Brain clicks into.
3.  **The Screen (Display)**: [8" or 7" MIPI DSI LCD](https://robu.in/category/display/dsi-lcd/) (₹2,800). This is the eyes and hands of your device.
4.  **The Pen (Stylus)**: [Universal Active Stylus](https://www.amazon.in/s?k=universal+active+stylus) (₹900). A rechargeable pen for writing.
5.  **The Battery (Power)**: [Li-Po 5000mAh (Flat)](https://robu.in/product/li-po-3-7v-5000mah-rechargeable-battery/) (₹600). This keeps it portable.
6.  **The Charger (PMIC)**: [TP4056 + MT3608 Combo](https://robu.in/product/mt3608-step-up-booster-tp4056-charger-combo/) (₹100). This charges and powers the device.
7.  **The Storage (Memory)**: **Onboard eMMC**.
8.  **The Screws**: **M2.5 Nylon Standoffs** (₹200).

**Total Cost**: ≈ **₹9,600** (Under ₹10k Budget target)

---

## 🛠 SECTION 2: HARDWARE ASSEMBLY (VERY DETAILED)

### Step 2.1: Clicking the Brain into the Body
1.  **Locate**: Find the two long white connectors on your **IO Board**. 
2.  **Align**: Face the **CM3 Brain Chip** so the gold pads line up with the connectors.
3.  **Press**: Push down firmly on both sides until you hear or feel a "click".

### Step 2.2: Connecting the Screen Ribbon
1.  **Open Latch**: Find the port labeled **"DSI 0"**. Use a fingernail to flip up the tiny **black plastic tab**.
2.  **Slide In**: Grab the ribbon cable from the screen. The **blue side** must be facing **UP**. Slide it into the slot as far as it will go.
3.  **Lock Latch**: Press the black tab back down to "pinch" the cable in place.

### Step 2.3: Wiring the Battery (SAFE MODE)
1.  **Prepare**: You have two wires from the battery (Red and Black).
2.  **Connect**: Solder the **Red wire (+)** to the **B+** pad on the TP4056 charger.
3.  **Connect**: Solder the **Black wire (-)** to the **B-** pad on the TP4056 charger.

**⚠️ Rules**: 
- Never let the Red and Black wires touch. 
- Use **Electrical Tape** on every solder joint immediately after finishing.

---

## ⚡ SECTION 3: FIRST BOOT (SYSTEM SETUP)

### Step 3.1: Flash the System
1.  Download the **Armbian image** on your MacBook/PC.
2.  Open **Balena Etcher**. 
3.  Click "Flash from file" (Select the Armbian file).
4.  Select your SD card (or CM3 via USB-C) and click **"Flash!"**.

### Step 3.2: Connecting Power
1.  Plug your **USB-C Wall Charger** (5V / 3A) into the IO Board.
2.  Wait 30 seconds for the lights to stop flickering.

    **✅ Checkpoint**: Your screen should light up and show the Armbian logo.

---

## 🚀 SECTION 4: RUNNING THE APP (KIOSK MODE)

We want the device to boot directly into the Noto canvas at startup.

### Step 4.1: Connect to Wi-Fi
1.  Type: `sudo nmtui`
2.  Go to "Activate a connection" and find your Wi-Fi name. Enter your password.

### Step 4.2: Deploy Noto
Copy and paste this line exactly (press Enter after):
```bash
git clone https://github.com/Samvedk/noto.git /home/noto/app
```

### Step 4.3: Automate Startup
1.  Install the GUI: `sudo apt install -y lightdm openbox chromium-browser`.
2.  Setup the Kiosk Script: `nano ~/.config/openbox/autostart`.
3.  Paste this in:
    ```bash
    # Launch Noto instantly
    chromium-browser --kiosk --no-sandbox file:///home/noto/app/welcome.html &
    ```

---

## 🖊 SECTION 5: TOUCH + STYLUS OPTIMIZATION

For that "Instant Ink" feel, we need the AI core to help smooth your lines.

1.  **AI Start**: Run this command to wake up the N-P-U brain chip:
    `sudo apt install -y rknn-toolkit2 rknn-rt`
2.  **Low Latency**: Ensure your touch screen is running at **400Hz** in the system settings HUD.

---

## 🔋 SECTION 6: POWER OPTIMIZATION

Max out your battery life (Target: 10+ hours).

1.  **Powersave Mode**: Tell the Brain chip to save energy.
    `echo powersave | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor`
2.  **Dim the Screen**: Keep the brightness at 50% for the best battery life.

---

## 📦 SECTION 7: FINAL INTEGRATION (CLEAN SETUP)

1.  **Acrylic Sandwich**: Mount the IO board to a piece of clear acrylic using **M2.5 standoffs**.
2.  **No Loose Wires**: Use **Kapton tape** to tape the battery flat against the screen's back-plate.
3.  **Check**: Ensure no bare wires are touching each other.

---

## 🩺 SECTION 8: DEBUGGING GUIDE

| Problem | Cause | How to Fix |
| :--- | :--- | :--- |
| **Black Screen** | Ribbon is loose | Re-insert the DSI ribbon (Section 2.2). |
| **No Touch** | Software Error | Type `dmesg | grep touch` to see if the brain sees the eyes. |
| **Random Shutoff** | Low Battery | Plug in the USB-C wall charger. |

---

**Build Complete.** You now have a working, distraction-free Noto Node! 📓✨
