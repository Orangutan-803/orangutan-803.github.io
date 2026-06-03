---
title: "Sentinel Deployment"
date: "2026-05-01"
thumbnail: "assets/img/thumbnail/azure-sentinel_Thumb.png"
---

# **Objective:** 
Deploy Azure Sentinel to collect, detect, and alert on SSH login attempts (both failed and successful) from a Linux Ubuntu VM exposed to the internet.

# Implementation Steps

## 1. **Infrastructure Setup**

-    Created an Ubuntu VM `non-vulnerable-01` with OpenSSH port 22 open to the internet, placed in resource group `orangutan-labs`.

   <img src="https://github.com/user-attachments/assets/342cf9d0-00a1-4bba-801a-9912fb5c574d" />


-    Verified local SSH connectivity.

<img src="https://github.com/user-attachments/assets/a0f23146-5725-4346-a8c2-77f456c582b1" />



## 2. **Sentinel Deployment**

- Created a Log Analytics workspace `monkey-watch` and enabled Azure Sentinel.

<img src="https://github.com/user-attachments/assets/5154298d-4418-437b-bb0c-3c9db94bf504" />

<img src="https://github.com/user-attachments/assets/3b467981-3575-419d-b827-03afaac3b323" />


## 3. **Log Collection Configuration**

- Used Syslog with Azure Monitor Agent (AMA) (recommended by DeepSeek AI for its general-purpose, low-setup design).

<img src="https://github.com/user-attachments/assets/8be0a259-d046-4d81-8aad-8acedd0311df" />

<img src="https://github.com/user-attachments/assets/896cdf46-8f19-44ab-baaf-a88b9bec6227" />

<img src="https://github.com/user-attachments/assets/4a9f9e46-48c1-43f6-bf22-b52dc98b0553" />


- Created a **Data Collection Rule (DCR)** associated with the VM, defining which log facilities and severity levels to forward.

<img src="https://github.com/user-attachments/assets/ec2a58f3-d24d-4b49-8dcd-c646f45f9d56" />


<img src="https://github.com/user-attachments/assets/6f7bde31-9623-4b43-820e-8bc8ec8b99d2" />


## 4. **Troubleshooting & Refinement using AI**

- Initial issue: No syslog data appeared in Sentinel after 20+ minutes (only heartbeat logs).

<img src="https://github.com/user-attachments/assets/f2ce1081-3240-40f8-9d87-cd8ff10077e3" />


- Used the Azure observability agent (Logs tab) to query VM logs – confirmed heartbeats present, but no Syslog table.

<img src="https://github.com/user-attachments/assets/dbae8259-4bd6-4587-8b71-3f1b3c353485" />


<img src="https://github.com/user-attachments/assets/cdb99ae3-700c-4b27-8b14-b90b3c5c4c5b" />

<img src="https://github.com/user-attachments/assets/a68c153f-8df7-43b7-b331-0cb318e5e67e" />

- Leveraged Observability agent to guide further diagnosis. The AI provided four possible root causes:

<img src="https://github.com/user-attachments/assets/69cd37c4-c8ca-4518-9529-bbcf5f69cfc6" />

<img src="https://github.com/user-attachments/assets/64623962-ca67-415c-9928-42e2a093a57c" />

-     VM not associated with DCR → verified association, ruled out
-     AMA not installed correctly → verified installed and running
-     Syslog not generated on VM → SSH into VM, checked /var/log/syslog – logs were present

<img src="https://github.com/user-attachments/assets/e58d42cd-cded-4a69-811c-2dd7d9fcae4f" />

-     DCR facility/severity filters too narrow → **identified as the real issue**

- DeepSeek clarified how syslog filters work: I originally set filters to alert level only, expecting only auth alerts. That was too narrow.

<img src="https://github.com/user-attachments/assets/bf5675fe-0716-4dca-9fdc-d1807f212d77" />

<img src="https://github.com/user-attachments/assets/1ab52909-4b03-4bed-997b-2e990b0d98b9" />

Fix: Broadened DCR filters to capture a wider range of syslog events.

<img src="https://github.com/user-attachments/assets/2d09283b-dcbd-4ffc-9941-a07042b35ffc" />

Result: Within 30 minutes, over 1,000 syslog events ingested, and the Syslog table appeared.

<img src="https://github.com/user-attachments/assets/d9cbd087-5539-4e91-a69e-2a65692b57c0" />

## 5. **Alerting Rules**

- Observed multiple failed SSH login attempts from various IPs (e.g., Romania) hitting the exposed VM.

<img src="https://github.com/user-attachments/assets/53c6c4c9-4f7e-4cc6-ba48-6c0656ae8f08" />


<img src="https://github.com/user-attachments/assets/52c37c86-bb7e-4208-8395-99cc894ffc73" />

- Created Sentinel analytics rules to generate alerts for:
- Failed SSH login attempts

<img src="https://github.com/user-attachments/assets/c55f68a1-6aa4-47b6-b4dd-c98b830df582" />

- Successful SSH login attempts

<img src="https://github.com/user-attachments/assets/f4ab9eb4-4e91-4a68-ad24-7bd895ba46f7" />

- Sentinel Alerts triggered

<img src="https://github.com/user-attachments/assets/37ca5064-5b3b-4a6f-a16a-6444d81e627b" />


# Key Learnings

- Hands-on familiarity with Azure resource hierarchy (Resource Groups → VMs → Log Analytics → Sentinel).
- Practical experience integrating a Linux VM with Sentinel via Syslog + AMA + DCR.
- Importance of correctly tuning DCR filters – narrow rules miss data, overly broad rules generate noise.
- Used DeepSeek AI effectively as a troubleshooting partner – its unlimited prompts and "thinking model" helped vet responses and clarify syslog filter logic.
- Used Azure observability agent to query live logs and verify table creation, speeding up root-cause analysis.
- Real-world observation: public SSH ports attract almost immediate intrusion attempts, underscoring the value of proactive monitoring.

# Future Refinements

- Fine-tune DCR filters to exclude low‑severity or irrelevant syslog messages while retaining security‑relevant events.
- Automate response actions (e.g., IP blocking) based on Sentinel alerts.
