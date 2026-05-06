# MiBand-HR-Streamer: Real-Time Heart Rate Interface for HCI

This project provides a Python-based, cross-platform interface designed to connect directly to Xiaomi/Huami (Amazfit) smart bands via Bluetooth Low Energy (BLE) and retrieve high-frequency heart rate data in real-time.

## 🎯 Core Features
* **Ultra-Low Latency:** Achieves a direct connection via the BLE GATT protocol, bypassing the official companion app and cloud-based intermediaries.
* **Purely Local Operation:** Runs entirely on a local computing node (e.g., within an Ubuntu environment) without any dependency on a mobile phone.
* **Asynchronous Concurrency:** Built upon an asynchronous implementation using the `bleak` library, allowing for easy and seamless integration into existing Python algorithm pipelines or GUI interfaces.

---

## 🛠️ Quick Start Guide (How to Use)

To successfully retrieve real-time heart rate data, you must complete two core stages: **Obtaining the Device Authorization Key (Auth Key)** and **Running the Monitoring Script**.

### Stage 1: Obtaining the Auth Key (Mandatory Step)

The Bluetooth broadcasts from Xiaomi smart bands are encrypted; a unique 32-character Auth Key is required to complete the handshake process. We will use the open-source project `huami-token` to accomplish this step.

1. **Pair the Device:** Ensure that your smart band is already paired with either the "Xiaomi Sports & Health" or "Zepp Life" app on your mobile phone. Additionally, verify that you are logged into the app using your account credentials (email/password) and that the smart band's firmware has been updated to the latest version.
2. **Configuring the Runtime Environment:**
It is recommended to install from the source code to ensure you have the latest features and support. You will first need to install the `uv` package manager: https://docs.astral.sh/uv/getting-started/installation/
```bash
# Create and activate a dedicated Conda environment
conda create -n miband_hci python=3.10
conda activate miband_hci

pip install uv
pip install bleak

git clone https://github.com/argrento/huami-token.git
cd huami-token
uv pip install -e ".[dev]"  # Install development dependencies
```
3. **Extract the Key:**
Depending on which companion app you have paired your device with, execute the appropriate command corresponding to your login method. * If you are using **Zepp (Amazfit)**:
```bash
huami-token --method amazfit --email your_email@example.com --password your_password --bt_keys
```
* If you are using **Xiaomi Sports & Health (Xiaomi)**:
```bash
huami-token --method xiaomi --email your_email@example.com --password your_password --bt_keys
```
4. **Record Credentials**:
In the terminal output, locate your device's `MAC` address (e.g., `AB:CD:EF:12:34:56`) and `Key` (e.g., `0xa3c10e34e5c14637eea6b9efc06106`). Please save these securely, as subsequent scripts will require these two parameters.

### Stage 2: Running the Heart Rate Retrieval Script

*(Replace this with your actual Python script execution method)*

**Expected Output:**

```text

[INFO] Scanning for Bluetooth devices...

[INFO] Connected to the band (AB:CD:EF:12:34:56)

[INFO] Auth Key verification successful!

[INFO] Continuous heart rate monitoring mode enabled...

[DATA] 10:45:01.234 - HR: 72 bpm

[DATA] 10:45:02.245 - HR: 73 bpm

...
```

---

## 📅 Project Development Roadmap (To-Do List)

For those who want to participate in secondary development, the following is our current project progress and to-do list:

* [ ] **Authentication and Connection**: Implement BLE connection and Auth Key handshake verification based on MAC address.

* [ ] **Data Subscription**: Enable the band's continuous heart rate mode and subscribe to the `0x2A37` feature value.

* [ ] **Data Robustness Processing**:

* Add an automatic reconnection mechanism after Bluetooth disconnection.

* Perform moving average filtering or median filtering on the real-time heart rate data stream to eliminate data jitter.

* [ ] **High-precision timestamp alignment**: A microsecond-level timestamp is added to each heart rate packet for easy cross-modal data alignment with vision or simulation platforms.

* [ ] **Interface encapsulation**: The underlying Bluetooth logic is encapsulated as an independent asynchronous task or subprocess, providing a simple `Queue` or WebSocket data output.

---

## Acknowledgments
The retrieval of the Auth Key in this project relies on the excellent reverse-engineering tool [huami-token](https://codeberg.org/argrento/huami-token/).