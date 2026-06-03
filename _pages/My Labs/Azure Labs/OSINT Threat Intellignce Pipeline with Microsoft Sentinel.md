---
title: "OSINT Threat Intellignce Pipeline with Microsoft Sentinel"
date: "2026-05-30"
thumbnail: "/assets/img/thumbnail/bricks.webp"
---

Overview:
Integrated open-source threat intelligence into Microsoft Sentinel by deploying a self-hosted MISP (Malware Information Sharing Platform) instance on Azure. Built a real-time pipeline to map Sentinel logs with OSINT feeds using Python and API calls.

Technical Architecture

    • Cloud Platform: Microsoft Azure (free trial & free services tier)
    • Compute: Ubuntu VM (changed size with sufficient CPU cores after resource constraint analysis)
    • Containerization: Docker – isolated MISP deployment, preserving VM for future multi-service use
    • Threat Intelligence Platform: MISP (open-source, GitHub misp-docker repo)
    • Integration Layer: Python script running alongside MISP (Azure Functions attempted but limited by trial subscription)
    • SIEM: Microsoft Sentinel

Implementation Steps

1. Azure Infrastructure Provisioning

    • Used Azure CLI for all resource management
    
    • Initially deployed a free-tier VM → encountered CPU limitations causing system hangs during MISP install
    
    • Redeployed with a higher-core VM to meet computational demands

<img width="912" height="852" alt="1 0 creating VM" src="https://github.com/user-attachments/assets/fe2b1009-8970-4259-8d87-e55eadb62eae" />

    • Configured budget alerts to prevent cost surprises after a credit glitch (Azure free credits temporarily disappeared)

<img width="613" height="336" alt="8 0 running into credit issue" src="https://github.com/user-attachments/assets/61d36ad7-b025-49b1-a890-1d8e45ca7716" />

<img width="1649" height="859" alt="3 6 Created Budget alert" src="https://github.com/user-attachments/assets/3289aaf4-e1db-4386-9f23-4916ccffe2bd" />

2. MISP Deployment (Docker-based)

    • Installed Docker on Ubuntu VM

<img width="856" height="276" alt="2 2 Docker installation successfull" src="https://github.com/user-attachments/assets/dfa51ce4-ca09-41a0-b534-52e468ed2578" />

    • Cloned misp-docker GitHub repository

<img width="789" height="255" alt="3 1 MISP repo cloned" src="https://github.com/user-attachments/assets/2acb1eeb-7dee-471f-a473-5c1b38aa4423" />
    
    • Copied and customized template.env → production .env file

<img width="1497" height="117" alt="3 2  env created" src="https://github.com/user-attachments/assets/e5cd2dec-a7ad-4a62-bf2d-c60b8225d823" />
    
    • Built and ran MISP container via docker-compose up

<img width="985" height="282" alt="3 4 Pulling MISP image" src="https://github.com/user-attachments/assets/ab85d05f-ba60-4917-bb76-7d404b412c1f" />

<img width="999" height="282" alt="3 5 MISP Image Built" src="https://github.com/user-attachments/assets/9adf4cf1-cd63-40fc-8207-9b42c5f86662" />
    
    • Opened port 443 for remote access, MISP instance accessible

<img width="1920" height="915" alt="3 7 MISP DEPLOYED" src="https://github.com/user-attachments/assets/e2752aaf-43ca-4d4a-92a8-5abfd19ac14e" />
    
3. Feed Ingestion

    • Copied public threat intelligence feeds into local MISP instance

<img width="1917" height="998" alt="4 0 importing MISP Feed" src="https://github.com/user-attachments/assets/e465ed06-84bf-4a8f-ad53-64de8280f5c5" />

<img width="1583" height="822" alt="4 1 GitHub copy" src="https://github.com/user-attachments/assets/e192b710-f239-4dc8-99c8-8d6bfc7d8949" />

<img width="810" height="667" alt="4 2 pasting JSON" src="https://github.com/user-attachments/assets/68377e23-57ce-4855-b2bc-92650e191fea" />

<img width="1696" height="866" alt="4 3 enabling feed" src="https://github.com/user-attachments/assets/4207f9a7-bdba-45c6-8841-5964b094d5e6" />
    
    • Waited 24+ hours for initial feed synchronization

<img width="1695" height="867" alt="4 4 Job progress" src="https://github.com/user-attachments/assets/629e167f-41f4-404b-aabf-9350489f15de" />
    
4. Sentinel Integration

    • Installed MISP2Sentinel Data connector from Content hub

<img width="1859" height="868" alt="5 0 Installing DC MISP2Sentinel" src="https://github.com/user-attachments/assets/a233ea89-fcc8-4f23-aabb-606347de5df6" />

<img width="1448" height="865" alt="5 1 configuring MISP2Sen" src="https://github.com/user-attachments/assets/edff5d3b-2a79-4e1d-8108-40d905ed5d39" />

    • Configuring MISP2Sentinel Data connector

        • Registering app
        
<img width="1109" height="852" alt="5 2 1 Registration app" src="https://github.com/user-attachments/assets/40432c02-a1be-409d-8f77-83f8fa91edc8" />
<img width="1592" height="516" alt="5 2 2 reg success" src="https://github.com/user-attachments/assets/3e0302c3-2cec-4b98-ab09-18b0d1e7b217" />

        • Generating Secret

<img width="1450" height="790" alt="5 3 Secret generation" src="https://github.com/user-attachments/assets/ed0026a2-d5c2-4e49-92b4-e7fdda0f4be5" />

        • Setting Access Control

<img width="1065" height="636" alt="5 4 1" src="https://github.com/user-attachments/assets/4188a26e-21c5-496b-9c4f-96520bf10d1a" />
        
        • MISP API Key generation

<img width="1301" height="348" alt="5 5 Creating API Key" src="https://github.com/user-attachments/assets/1a77ce1b-14d4-42e1-b66f-486942cb087a" />

        
        • Attempting to use Azure Function Apps
        
<img width="892" height="170" alt="6 0 Azure Functions" src="https://github.com/user-attachments/assets/cb0a9ad6-fec7-43ca-bdca-5c53fe55e15b" />
<img width="842" height="466" alt="6 1 Function App failed" src="https://github.com/user-attachments/assets/dbb9536e-0cd6-48aa-847a-5e8eba6573a5" />
        

        
 • Proceeding with running script on MISP VM instead
        
    • Cloned MISP2Sentinel integration script from GitHub

<img width="853" height="209" alt="7 1 Repo clone" src="https://github.com/user-attachments/assets/914882d0-e7e3-4244-aaa2-1df5a21569bd" />
    
    • Installed Python dependencies

<img width="1090" height="169" alt="7 2 Venv created   installing req" src="https://github.com/user-attachments/assets/7092d852-1095-457c-9787-8e3d9802b81c" />

    
    • Configured config.py (copied from template) with:
        ◦ Azure Tenant ID
        ◦ MISP API key & domain
        ◦ MISP event limit reduced from 500 → 200 (memory optimization for low-tier VM)

<img width="889" height="541" alt="7 3 configing details" src="https://github.com/user-attachments/assets/20d9e87f-c44a-4648-a776-f5d273bd4141" />
<img width="329" height="55" alt="7 4 Limiting events to 200 due to memory limits" src="https://github.com/user-attachments/assets/bd15820d-3bd5-4e0b-a5eb-355b3db4a654" />

    • Verified connectivity: MISP connection OK, Azure connection OK

<img width="897" height="394" alt="7 5 Running script and checking config" src="https://github.com/user-attachments/assets/d0914728-fcc2-4202-9461-71c50f638b4d" />
            
5. Troubleshooting & Optimization
    • Issue: No logs appearing in Sentinel after 12+ hours

<img width="2550" height="915" alt="9 0 AI troubleshooting" src="https://github.com/user-attachments/assets/e8cf21e3-7edd-4390-a132-422617683fe5" />

<img width="1643" height="847" alt="9 1 troubshooting cont" src="https://github.com/user-attachments/assets/9111082f-4e0b-4951-b7c2-10b136103523" />
    
    • Debugging: Inspected script logs, found no feed processing

<img width="1078" height="227" alt="9 4 Issue identified" src="https://github.com/user-attachments/assets/e82e50d9-15e8-41a3-87e6-ba11379c626b" />
    
    • Root cause: Default MISP filters too narrow

<img width="1586" height="832" alt="9 3 troublshooting 2 0" src="https://github.com/user-attachments/assets/b43c613b-8097-4548-8ce9-fe07f0a3b5cd" />

<img width="1554" height="745" alt="9 5 loosening filter" src="https://github.com/user-attachments/assets/8211cfca-d9a0-4a3e-b1ed-32d7a6238005" />
  
    • Resolution: Loosened filter criteria in script → new table ThreatIntel_Indicators appeared in Log Analytics workspace

<img width="428" height="153" alt="9 6 filters too loose" src="https://github.com/user-attachments/assets/d4e0e99d-fcc2-4af5-b4ff-f02b052fd5ee" />
<img width="1052" height="457" alt="9 8 futher understanding, confirmed IDs are being sent" src="https://github.com/user-attachments/assets/d5b678fe-3d0c-4dd9-85c4-f0b19433eb56" />
<img width="1397" height="835" alt="10 1 threat intelligence detected" src="https://github.com/user-attachments/assets/4c39c870-4a4a-4608-a362-edcfe7b0c4cc" />

    
6. Detection Rule (KQL)

    • Created analytics rule using Microsoft’s observability agent

<img width="1049" height="679" alt="11 0 Rule Building" src="https://github.com/user-attachments/assets/0e2069b4-76bd-41c3-a59d-0694389f4f77" />

<img width="980" height="559" alt="11 3 SSH bruteforce TI map" src="https://github.com/user-attachments/assets/c060251c-7fe2-47b7-a227-66e9ab1d8a41" />
    
    • KQL query maps SSH brute-force attempts (IP addresses) against ingested threat intelligence indicators

<img width="1780" height="779" alt="11 4 Rule creation" src="https://github.com/user-attachments/assets/07571996-6d60-44cd-a51c-a7448c59109d" />

    
    • Currently observing for matches

Key Technical Decisions & Rationale

    Docker on VM: Isolation + resource efficiency. Avoids dedicating a full VM to MISP, reduces Azure subscription costs.

    MISP (open-source): Free, well-documented, ideal for learning threat intelligence APIs and Python integration.

    Python script over Azure Functions: Free trial limitations prevented Function App deployment; script co-located on MISP server ensures reliability.

    Reduced event limit (500 → 200): Memory constraint mitigation on low-tier VM.

    Budget alerts: Proactive cost control after Azure credit anomaly.

Current Status & Next Steps

    MISP instance running, feeds updating

    Sentinel receiving threat intelligence indicators

    KQL rule active for SSH brute-force detection

    Tuning indicator filters to improve detection rate

    Note: The analytics rule relies on specific threat intelligence feeds. Given the narrow targeting of those indicators, incident generation is not guaranteed under normal test conditions.

Azure Services & Tools Used

    Virtual Machines (Ubuntu)

    Azure CLI

    Microsoft Sentinel (Log Analytics)

    Budget Alerts & Cost Management

    (Attempted) Azure Functions – trial limitations documented
